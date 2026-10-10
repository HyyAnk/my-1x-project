import {
  type QuestionHistoryEntry,
  type QuestionHistoryCheckItem,
  type QuestionHistoryCheckResult,
  type QuizQuestion,
  type QuestionContentType,
  inferQuestionHistoryContentType,
  nowIso,
} from "@studio/shared";

import { calculateQuestionSimilarity, normalizeQuestionText } from "./questionSimilarity.js";

export {
  calculatePreparedQuestionSimilarity,
  calculateQuestionSimilarity,
  normalizeQuestionText,
  prepareQuestionText,
  PreparedQuestionText,
} from "./questionSimilarity.js";

/**
 * Evaluates whether a current question matches a question in history.
 */
export function evaluateQuestionMatch(
  currentText: string,
  historyText: string,
  currentAnswer?: string,
  historyAnswer?: string,
): { isDuplicate: boolean; similarity: number; reason: string } {
  const normCurrent = normalizeQuestionText(currentText);
  const normHistory = normalizeQuestionText(historyText);

  if (normCurrent === normHistory) {
    return {
      isDuplicate: true,
      similarity: 1.0,
      reason: "Exact 100% match with historical question",
    };
  }

  let similarity = calculateQuestionSimilarity(currentText, historyText);

  const normCurrentAns = currentAnswer ? normalizeQuestionText(currentAnswer) : "";
  const normHistoryAns = historyAnswer ? normalizeQuestionText(historyAnswer) : "";
  const answersMatch =
    normCurrentAns &&
    normHistoryAns &&
    (normCurrentAns === normHistoryAns || normCurrentAns.includes(normHistoryAns) || normHistoryAns.includes(normCurrentAns));

  if (answersMatch && similarity >= 0.5) {
    similarity = Math.max(similarity, 0.85);
    return {
      isDuplicate: true,
      similarity: Number(similarity.toFixed(2)),
      reason: `Same correct answer with similar question concept (${Math.round(similarity * 100)}%)`,
    };
  }

  if (similarity >= 0.75) {
    return {
      isDuplicate: true,
      similarity: Number(similarity.toFixed(2)),
      reason: `High semantic similarity (${Math.round(similarity * 100)}%)`,
    };
  }

  return {
    isDuplicate: false,
    similarity: Number(similarity.toFixed(2)),
    reason: "",
  };
}

/**
 * Prunes expired question history entries based on TTL.
 */
export function pruneQuestionHistory(entries: QuestionHistoryEntry[], ttlDays = 30, nowMs = Date.now()): QuestionHistoryEntry[] {
  const cutOff = nowMs - ttlDays * 24 * 60 * 60 * 1000;
  return entries.filter((entry) => {
    const entryTime = new Date(entry.rendered_at).getTime();
    return !Number.isNaN(entryTime) && entryTime >= cutOff;
  });
}

/**
 * Cross-checks all questions for an episode against history.
 */
export function checkQuestionsAgainstHistory(
  episodeId: string,
  questions: QuizQuestion[],
  historyEntries: QuestionHistoryEntry[],
  passThreshold = 2,
  targetContentType: QuestionContentType = "episode",
): QuestionHistoryCheckResult {
  const validHistory = historyEntries.filter(
    (entry) => entry.episode_id !== episodeId && inferQuestionHistoryContentType(entry) === targetContentType,
  );

  const items: QuestionHistoryCheckItem[] = questions.map((question) => {
    const currentCorrectChoice = question.choices.find((c) => c.id === question.correct_choice_id)?.text || "";

    let bestMatchEntry: QuestionHistoryEntry | null = null;
    let highestSimilarity = 0;
    let matchReason = "";
    let isDupe = false;

    for (const entry of validHistory) {
      const result = evaluateQuestionMatch(question.question, entry.question_text, currentCorrectChoice, entry.correct_answer);

      if (result.similarity > highestSimilarity) {
        highestSimilarity = result.similarity;
        if (result.isDuplicate) {
          bestMatchEntry = entry;
          matchReason = result.reason;
          isDupe = true;
        }
      }
    }

    return {
      current_question_id: question.id,
      current_question_text: question.question,
      current_choices: question.choices.map((c) => c.text),
      current_correct_answer: currentCorrectChoice,
      matched_entry: isDupe ? bestMatchEntry : null,
      similarity_score: highestSimilarity,
      match_reason: matchReason,
      status: isDupe ? ("duplicate" as const) : ("passed" as const),
    };
  });

  const duplicateCount = items.filter((item) => item.status === "duplicate").length;
  const passed = duplicateCount <= passThreshold;

  return {
    episode_id: episodeId,
    checked_at: nowIso(),
    total_questions: questions.length,
    duplicate_count: duplicateCount,
    pass_threshold: passThreshold,
    passed,
    items,
  };
}
