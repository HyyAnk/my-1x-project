import type { TaskManagerRuntime, ActiveRun } from "../runtime.js";
import { parseJson } from "../parsers.js";
import { balanceQuizChoicePositions, validateQuizV2 } from "../../quiz/domain/quiz.js";
import { checkQuestionsAgainstHistory } from "../../quiz/qa/questionHistory.js";
import { invalidateQuizArtifacts } from "../../quiz/pipeline/invalidation.js";
import { synthesizeAllLegacyArtifacts } from "../../quiz/domain/quizArtifactSynthesizer.js";

export async function handleDirectQuizOutput(
  runtime: TaskManagerRuntime,
  active: ActiveRun,
  output: string,
): Promise<string[]> {
  const task = active.task;
  const raw = parseJson(output, "QuizV2");
  const episode = await runtime.repository.getEpisode(task.channel_id, task.episode_id!);

  const candidate = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (!candidate.schema_version) candidate.schema_version = 2;
  if (!candidate.episode_id) candidate.episode_id = episode.episode_id;
  if (!candidate.age_band) candidate.age_band = episode.quiz_config.age_band;
  if (!candidate.language) {
    const channel = await runtime.repository.getChannel(task.channel_id);
    candidate.language = channel.language;
  }

  // Validate strictly against QuizV2Schema
  const quiz = validateQuizV2(candidate);

  // Rebalance choice positions to prevent consecutive identical positions
  const balancedQuestions = balanceQuizChoicePositions(quiz.questions);
  const balancedQuiz = { ...quiz, questions: balancedQuestions };

  // Write quiz.json
  const artifactPath = await runtime.repository.writeQuiz(task.channel_id, task.episode_id!, balancedQuiz);

  // Synthesize legacy artifacts for zero-breakage backward compatibility
  try {
    const legacy = synthesizeAllLegacyArtifacts(balancedQuiz, episode.topic?.title);
    await Promise.all([
      runtime.repository.saveEpisodeFile(task.channel_id, task.episode_id!, "script.md", legacy.script),
      runtime.repository.saveEpisodeFile(task.channel_id, task.episode_id!, "visual_bible.md", legacy.visualBible),
      runtime.repository.saveScenes(task.channel_id, task.episode_id!, legacy.scenes),
    ]);
  } catch {
    // Non-blocking legacy synthesis
  }

  // Check against 30-day question history
  try {
    const history = await runtime.repository.readQuestionHistory(task.channel_id);
    const historyCheck = checkQuestionsAgainstHistory(task.episode_id!, balancedQuiz.questions, history, 2);
    await runtime.repository.writeHistoryCheck(task.channel_id, task.episode_id!, historyCheck);
  } catch {
    // Non-blocking duplicate history check
  }

  // Invalidate downstream quiz artifacts
  const invalidatedStages = invalidateQuizArtifacts("quiz");
  await runtime.repository.invalidateQuizArtifacts(task.channel_id, task.episode_id!, invalidatedStages);

  // Update episode stage
  await runtime.repository.updateEpisodeStage(task.channel_id, task.episode_id!, "QUIZ_READY");

  return [artifactPath];
}
