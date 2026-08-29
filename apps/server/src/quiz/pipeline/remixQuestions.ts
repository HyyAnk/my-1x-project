import {
  type QuestionHistoryCheckResult,
  type QuizV2,
  type QuizQuestion,
  QuizQuestionSchema,
  QuizV2Schema,
  SceneSchema,
  quizChoiceCountForFormat,
  MAX_DEDUP_HISTORY_QUESTIONS,
} from "@studio/shared";
import { RepositoryError } from "../../repository.js";
import { invalidateQuizArtifacts } from "./invalidation.js";
import { checkQuestionsAgainstHistory } from "../qa/questionHistory.js";
import { executeSinglePromptText, type LLMClient } from "../../utils/promptSanitizer.js";
import type { QuizOrchestratorInput } from "./orchestrator.js";

export function normalizeRawQuizQuestion(raw: unknown, targetFallback?: QuizQuestion): QuizQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : (targetFallback?.id ?? "q-1");
  const number = typeof obj.number === "number" && obj.number > 0 ? obj.number : (targetFallback?.number ?? 1);
  const format = (
    typeof obj.format === "string" && obj.format ? obj.format : (targetFallback?.format ?? "multiple_choice")
  ) as QuizQuestion["format"];
  const difficulty =
    typeof obj.difficulty === "number" && obj.difficulty >= 1 && obj.difficulty <= 5 ? obj.difficulty : (targetFallback?.difficulty ?? 2);

  let question = typeof obj.question === "string" ? obj.question.trim() : (targetFallback?.question ?? "");
  question = question.replace(/^(?:Challenge|Quiz|Can you solve|Can you guess)\s*:\s*/i, "").trim();

  let choices: Array<{ id: string; text: string }> = [];
  if (Array.isArray(obj.choices)) {
    choices = obj.choices.map((c: unknown, idx: number) => {
      if (typeof c === "string") {
        return { id: `c${idx + 1}`, text: c.trim() };
      }
      if (typeof c === "object" && c !== null) {
        const itemObj = c as Record<string, unknown>;
        const rawCId =
          typeof itemObj.id === "string" && /^[a-z][a-z0-9_-]{0,31}$/i.test(itemObj.id) ? itemObj.id.toLowerCase() : `c${idx + 1}`;
        const rawCText = typeof itemObj.text === "string" ? itemObj.text.trim() : `Option ${idx + 1}`;
        return { id: rawCId, text: rawCText };
      }
      return { id: `c${idx + 1}`, text: `Option ${idx + 1}` };
    });
  } else if (targetFallback?.choices) {
    choices = [...targetFallback.choices];
  }

  // Ensure unique choice texts
  const seenTexts = new Set<string>();
  choices = choices.filter((c) => {
    const norm = c.text.toLowerCase();
    if (seenTexts.has(norm)) return false;
    seenTexts.add(norm);
    return true;
  });

  const requiredChoiceCount = quizChoiceCountForFormat(format);
  let correctChoiceId = typeof obj.correct_choice_id === "string" ? obj.correct_choice_id.toLowerCase() : (choices[0]?.id ?? "c1");

  if (choices.length !== requiredChoiceCount) {
    throw new Error(
      `QUIZ_CHOICE_COUNT_INVALID: Question ${number} (${format}) returned ${choices.length} choices; exactly ${requiredChoiceCount} required`,
    );
  }

  // If correct choice matches text rather than ID
  const matchedChoice = choices.find((c) => c.id === correctChoiceId || c.text.toLowerCase() === correctChoiceId.toLowerCase());
  if (matchedChoice) {
    correctChoiceId = matchedChoice.id;
  } else if (choices.length > 0) {
    correctChoiceId = choices[0].id;
  }

  if (!choices.some((c) => c.id === correctChoiceId)) {
    correctChoiceId = choices[0]?.id ?? "c1";
  }

  const explanation =
    typeof obj.explanation === "string" && obj.explanation.trim()
      ? obj.explanation.trim()
      : (targetFallback?.explanation ?? "Correct answer explanation.");

  const fun_fact = typeof obj.fun_fact === "string" ? obj.fun_fact.trim() : (targetFallback?.fun_fact ?? "");
  const visual_opportunity =
    typeof obj.visual_opportunity === "string" ? obj.visual_opportunity.trim() : (targetFallback?.visual_opportunity ?? "");

  const candidate = {
    id,
    number,
    format,
    difficulty,
    question,
    choices,
    correct_choice_id: correctChoiceId,
    explanation,
    fun_fact,
    source_ids: Array.isArray(obj.source_ids) ? (obj.source_ids as string[]) : (targetFallback?.source_ids ?? []),
    visual_opportunity,
    validation: { semantic_status: "validated" as const, source_coverage: false, fact_locked: true },
  };

  return QuizQuestionSchema.parse(candidate);
}

export function parseQuizQuestionsFromOutput(rawOutput: string, fallbackMap: Map<string, QuizQuestion>): QuizQuestion[] {
  let cleaned = rawOutput.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  let parsedJson: unknown = null;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch {
    const arrayStart = cleaned.indexOf("[");
    const arrayEnd = cleaned.lastIndexOf("]");
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      try {
        parsedJson = JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
      } catch {}
    }

    if (!parsedJson) {
      const objStart = cleaned.indexOf("{");
      const objEnd = cleaned.lastIndexOf("}");
      if (objStart >= 0 && objEnd > objStart) {
        try {
          parsedJson = JSON.parse(cleaned.slice(objStart, objEnd + 1));
        } catch {}
      }
    }
  }

  if (!parsedJson) {
    const preview = cleaned.length > 120 ? `${cleaned.slice(0, 120)}...` : cleaned;
    throw new Error(`Failed to extract valid JSON questions from LLM response (preview: "${preview}")`);
  }

  const rawItems: unknown[] = Array.isArray(parsedJson)
    ? parsedJson
    : typeof parsedJson === "object" &&
        parsedJson !== null &&
        "questions" in parsedJson &&
        Array.isArray((parsedJson as Record<string, unknown>).questions)
      ? ((parsedJson as Record<string, unknown>).questions as unknown[])
      : [parsedJson];

  if (rawItems.length === 0) {
    throw new Error("LLM response contained an empty question list");
  }

  const results: QuizQuestion[] = [];
  for (const item of rawItems) {
    const rawId = typeof (item as Record<string, unknown>)?.id === "string" ? ((item as Record<string, unknown>).id as string) : undefined;
    const fallback = rawId ? fallbackMap.get(rawId) : fallbackMap.values().next().value;
    const normalized = normalizeRawQuizQuestion(item, fallback);
    if (normalized) results.push(normalized);
  }

  if (results.length === 0) {
    throw new Error(`Could not parse any valid QuizQuestion from items (${rawItems.length} items evaluated)`);
  }

  return results;
}

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
  const otherQuestionsInEpisode = currentQuiz.questions.filter((q) => !targetIds.has(q.id));
  const otherQuestionsSummary =
    otherQuestionsInEpisode.length > 0
      ? "\nOTHER EXISTING QUESTIONS IN THIS EPISODE (ABSOLUTELY MUST NOT DUPLICATE OR OVERLAP TOPICS/ANSWERS):\n" +
        otherQuestionsInEpisode
          .map(
            (q, idx) =>
              `${idx + 1}. "${q.question}" -> Correct Answer: "${q.choices.find((c) => c.id === q.correct_choice_id)?.text || ""}"`,
          )
          .join("\n")
      : "";

  const recentHistorySummary =
    history.length > 0
      ? "\nRECENT PAST HISTORY QUESTIONS TO AVOID (DO NOT DUPLICATE):\n" +
        history
          .slice(0, MAX_DEDUP_HISTORY_QUESTIONS)
          .map((h, idx) => `${idx + 1}. "${h.question_text}" -> Answer: "${h.correct_answer}"`)
          .join("\n")
      : "";

  const prompt =
    mode === "replace"
      ? [
          "You are an expert Quiz Creator for an educational children and family entertainment channel.",
          `Channel: ${channel.display_name}. Language: ${channel.language}. Age Band: ${episode.quiz_config.age_band}. Format: ${episode.quiz_config.quiz_format}.`,
          `Episode Topic/Theme: ${episode.topic || episode.slug || channel.display_name}.`,
          "TASK: Generate BRAND NEW, unique quiz questions to completely replace the specified target questions.",
          "",
          "CRITICAL RULES FOR REPLACING WITH NEW QUESTIONS:",
          "1. GENERATE FRESH FACTS & ANSWERS: Create completely NEW question topics and knowledge facts matching the episode theme. Generate strictly 3 distinct choices (id: 'c1', 'c2', 'c3' for multiple choice, or exactly 2 for true/false) with one designated correct_choice_id. Provide a clear, educational explanation and fun_fact.",
          "2. ANTI-DUPLICATION / ZERO COLLISION: The new questions MUST NOT duplicate or overlap with any other existing questions in this episode, nor any questions from past history.",
          "3. STRICT BREVITY & LENGTH: Question text MUST be 10 to 18 words maximum (ABSOLUTE MAXIMUM 120 CHARACTERS). Each choice text must be concise (under 30 characters).",
          "4. NO FILLER PREFIXES: Start directly with the natural question hook. NEVER use labels like 'Quiz:', 'Challenge:', 'Can you guess:', etc.",
          "5. MATCH AGE & TONE: Use child-friendly, engaging, native phrasing in " +
            channel.language +
            " suited for age band " +
            episode.quiz_config.age_band +
            ".",
          "6. PRESERVE METADATA: Keep the same id, number, format, and difficulty for each target question so it fits seamlessly into the episode.",
          "7. VALID JSON SCHEMA: Return ONLY a valid JSON array or object containing the questions matching the schema: [{ id, number, format, difficulty, question, choices: [{ id, text }], correct_choice_id, explanation, fun_fact, source_ids, visual_opportunity }]. Use exactly 3 choices for multiple choice, image guess, and odd-one-out; use exactly 2 for true/false. Do NOT wrap in markdown code blocks.",
          "",
          "Target questions to replace with fresh facts:\n" + JSON.stringify(questionsToRemix, null, 2),
          otherQuestionsSummary,
          recentHistorySummary,
        ]
          .filter(Boolean)
          .join("\n")
      : [
          "You are an expert Quiz Editor for an educational children and family entertainment channel.",
          `Channel: ${channel.display_name}. Language: ${channel.language}. Age Band: ${episode.quiz_config.age_band}. Format: ${episode.quiz_config.quiz_format}.`,
          "TASK: Rephrase and remix the provided quiz questions so that their phrasing, perspective, hook, and clues feel completely fresh, creative, and non-repetitive compared to previously produced videos.",
          "",
          "CRITICAL CONSTRAINTS & QUALITY RULES:",
          "1. PRESERVE EXACT CHOICES & ANSWER: Keep the EXACT same correct answer and preserve all choices (id, text) verbatim. Do NOT modify choice text or which choice is correct.",
          "2. STRICT BREVITY & LENGTH LIMIT: The rephrased question MUST be concise, punchy, and readable in 2.5 to 4.0 seconds (10 to 18 words maximum, ABSOLUTE MAXIMUM 120 CHARACTERS). It must easily fit into the mobile video layout without overflowing.",
          "3. NO FILLER PREFIXES: NEVER prepend filler words or labels such as 'Quiz:', 'Challenge:', 'Can you solve:', 'Can you guess:', 'Question #:', 'Hey kids,' or long conversational setups. Start directly with the natural question hook.",
          "4. PERSPECTIVE & CLUE SHIFT: Transform direct or generic questions into engaging curiosity hooks (e.g. clue-based description, scenic context, or fun deduction).",
          "5. MATCH TONE & LANGUAGE: Maintain natural, child-friendly, native phrasing in " +
            channel.language +
            " suited for age band " +
            episode.quiz_config.age_band +
            ".",
          "6. VALID JSON SCHEMA: Return ONLY a valid JSON array or object containing the rephrased questions matching the schema: [{ id, number, format, difficulty, question, choices: [{ id, text }], correct_choice_id, explanation, fun_fact, source_ids, visual_opportunity }]. Preserve exactly 3 choices for multiple choice, image guess, and odd-one-out; preserve exactly 2 for true/false. Do NOT wrap in markdown code blocks or add conversational prose.",
          "",
          "Questions to remix:\n" + JSON.stringify(questionsToRemix, null, 2),
        ].join("\n");

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

  const rephrasedMap = new Map(rephrasedQuestions.map((q) => [q.id, q]));
  const updatedQuestions = currentQuiz.questions.map((q) => rephrasedMap.get(q.id) ?? q);
  const updatedQuiz: QuizV2 = { ...currentQuiz, questions: updatedQuestions };

  const rephrasedByNumber = new Map(rephrasedQuestions.map((question) => [question.number, question]));
  const updatedScenes = scenes.map((scene) => {
    const rephrased = scene.quiz?.question_number ? rephrasedByNumber.get(scene.quiz.question_number) : undefined;
    if (scene.quiz && rephrased) {
      const correctChoiceText = rephrased.choices.find((c) => c.id === rephrased.correct_choice_id)?.text || "";
      return {
        ...scene,
        quiz: {
          ...scene.quiz,
          question: rephrased.question,
          choices: rephrased.choices.map((c) => c.text),
          answer: correctChoiceText,
          explanation: rephrased.explanation,
        },
      };
    }
    return scene;
  });
  const validatedQuiz = QuizV2Schema.parse(updatedQuiz);
  const validatedScenes = updatedScenes.map((scene) => SceneSchema.parse(scene));
  await input.repository.writeQuiz(input.channelId, input.episodeId, validatedQuiz);
  await input.repository.saveScenes(input.channelId, input.episodeId, validatedScenes);

  const updatedCheck = checkQuestionsAgainstHistory(input.episodeId, updatedQuiz.questions, history, passThreshold);
  const finalCheckItems = updatedCheck.items.map((item) => {
    if (targetIds.has(item.current_question_id)) {
      if (item.status === "passed") return { ...item, status: "remixed" as const };
    }
    return item;
  });
  const finalCheck: QuestionHistoryCheckResult = {
    ...updatedCheck,
    items: finalCheckItems,
  };
  await input.repository.writeHistoryCheck(input.channelId, input.episodeId, finalCheck);

  const invalidatedStages = invalidateQuizArtifacts("quiz");
  const invalidated = await input.repository.invalidateQuizArtifacts(input.channelId, input.episodeId, invalidatedStages);

  return { quiz: updatedQuiz, history_check: finalCheck, remixed_count: rephrasedQuestions.length, invalidated };
}
