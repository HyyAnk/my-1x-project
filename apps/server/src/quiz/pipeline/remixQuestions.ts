import { type QuestionHistoryCheckResult, type QuizQuestion, type QuizV2 } from "@studio/shared";
import { RepositoryError } from "../../repository.js";
import { checkQuestionsAgainstHistory } from "../qa/questionHistory.js";
import { executeSinglePromptText, type LLMClient } from "../../utils/promptSanitizer.js";
import type { QuizOrchestratorInput } from "./orchestrator.js";
import { normalizeRawQuizQuestion, parseQuizQuestionsFromOutput } from "./remix/questionParser.js";
import { buildRemixPrompt } from "./remix/remixPromptBuilder.js";
import { persistRemixedQuiz } from "./remix/remixPersistence.js";

export { normalizeRawQuizQuestion, parseQuizQuestionsFromOutput };

export async function remixQuizQuestions(
  input: QuizOrchestratorInput,
  requestedQuestionIds?: string[],
  mode: "rephrase" | "replace" = "rephrase",
): Promise<{ quiz: QuizV2; history_check: QuestionHistoryCheckResult; remixed_count: number; invalidated: string[] }> {
  const [episode, channel, scenes, currentQuiz] = await Promise.all([
    input.repository.getEpisode(input.channelId, input.episodeId),
    input.repository.getChannel(input.channelId),
    input.repository.readScenes(input.channelId, input.episodeId),
    input.repository.readQuiz(input.channelId, input.episodeId),
  ]);
  if (!currentQuiz) throw new RepositoryError("Generate Quiz facts before remixing questions", "QUIZ_REQUIRED");

  const history = await input.repository.readQuestionHistory(input.channelId);
  const passThreshold = input.config.question_history?.pass_threshold ?? 2;
  const initialCheck = checkQuestionsAgainstHistory(input.episodeId, currentQuiz.questions, history, passThreshold);

  const targetIds = new Set(
    requestedQuestionIds && requestedQuestionIds.length > 0
      ? requestedQuestionIds
      : initialCheck.items.filter((i) => i.status === "duplicate").map((i) => i.current_question_id),
  );

  if (targetIds.size === 0) {
    return { quiz: currentQuiz, history_check: initialCheck, remixed_count: 0, invalidated: [] };
  }

  const questionsToRemix = currentQuiz.questions.filter((q) => targetIds.has(q.id));
  const prompt = buildRemixPrompt(channel, episode, questionsToRemix, history, currentQuiz.questions, mode);

  let rephrasedQuestions: QuizQuestion[] = [];
  let executionError: Error | null = null;
  const client: LLMClient | null =
    input.activeEngine === "antigravity" && input.antigravityClient
      ? input.antigravityClient
      : (input.codexClient ?? input.antigravityClient ?? null);

  if (client) {
    const fallbackMap = new Map(questionsToRemix.map((q) => [q.id, q]));
    let attemptPrompt = prompt;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const rawOutput = await executeSinglePromptText(client, attemptPrompt, { timeoutMs: 90_000 });
        const parsedQuestions = parseQuizQuestionsFromOutput(rawOutput, fallbackMap);
        const parsedIds = new Set(parsedQuestions.map((question) => question.id));
        const missingIds = questionsToRemix.map((question) => question.id).filter((id) => !parsedIds.has(id));
        if (missingIds.length > 0) throw new Error(`Quiz remix omitted questions: ${missingIds.join(", ")}`);
        rephrasedQuestions = parsedQuestions;
        executionError = null;
        break;
      } catch (err) {
        executionError = err instanceof Error ? err : new Error(String(err));
        if (attempt < 2) {
          attemptPrompt = `${prompt}\n\nRETRY CORRECTION: The previous output was rejected: ${executionError.message}. Return the complete JSON again and obey the exact answer-count contract. Never return a fourth choice.`;
        }
      }
    }
  }

  if (rephrasedQuestions.length === 0) {
    const errorDetail = executionError
      ? `: ${executionError.message}`
      : ". Please check that your AI engine (Antigravity/Codex) is connected and active.";
    throw new RepositoryError(`Question remix failed${errorDetail}`, "REMIX_FAILED");
  }

  return persistRemixedQuiz({
    repository: input.repository,
    channelId: input.channelId,
    episodeId: input.episodeId,
    currentQuiz,
    scenes,
    rephrasedQuestions,
    targetIds,
    passThreshold,
  });
}
