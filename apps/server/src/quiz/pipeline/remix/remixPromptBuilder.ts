import type { Channel, Episode, QuizQuestion, QuestionHistoryEntry } from "@studio/shared";
import { MAX_DEDUP_HISTORY_QUESTIONS } from "@studio/shared";

export function buildRemixPrompt(
  channel: Channel,
  episode: Episode,
  questionsToRemix: QuizQuestion[],
  history: QuestionHistoryEntry[],
  currentQuizQuestions: QuizQuestion[],
  mode: "rephrase" | "replace",
): string {
  const targetIds = new Set(questionsToRemix.map((q) => q.id));
  const otherQuestions = currentQuizQuestions.filter((q) => !targetIds.has(q.id));
  const otherQuestionsSummary =
    otherQuestions.length > 0
      ? "Other questions already in this episode (DO NOT duplicate any of these facts):\n" +
        otherQuestions
          .map((q) => `- [Q${q.number}] ${q.question} -> Answer: ${q.choices.find((c) => c.id === q.correct_choice_id)?.text || "N/A"}`)
          .join("\n")
      : "";

  const recentHistorySummary =
    history.length > 0
      ? `Recent past questions from this channel ledger (DO NOT duplicate):\n` +
        history
          .slice(0, MAX_DEDUP_HISTORY_QUESTIONS)
          .map((h) => `- ${h.question_text} (Answer: ${h.correct_answer})`)
          .join("\n")
      : "";

  return mode === "replace"
    ? [
        "You are an expert Quiz Author for an educational children and family entertainment channel.",
        `Channel: ${channel.display_name}. Language: ${channel.language}. Age Band: ${episode.quiz_config.age_band}. Format: ${episode.quiz_config.quiz_format}.`,
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
}
