import {
  type QuestionHistoryEntry,
  type QuestionHistoryCheckItem,
  type QuestionHistoryCheckResult,
  type QuizQuestion,
  type QuestionContentType,
  inferQuestionHistoryContentType,
  nowIso,
} from "@studio/shared";

/**
 * Normalizes question text: NFKC normalization, lowercase, punctuation removal, whitespace trimming.
 * Uses an ASCII fast-path for maximum throughput while maintaining full unicode correctness.
 */
export function normalizeQuestionText(text: string): string {
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(text)) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculates similarity between two question text strings based on Token Jaccard and Bigram Dice Coefficient.
 * Includes an early-exit length heuristic to avoid expensive n-gram computations when strings differ too much in length.
 */
export function calculateQuestionSimilarity(textA: string, textB: string): number {
  const normA = normalizeQuestionText(textA);
  const normB = normalizeQuestionText(textB);

  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  // Early-exit length heuristic: if the length discrepancy between normalized strings is too large,
  // they can never mathematically meet the similarity threshold (>= 0.75 for Dice/Jaccard overlap).
  const lenA = normA.length;
  const lenB = normB.length;
  const maxLen = Math.max(lenA, lenB);
  if (maxLen > 0 && Math.abs(lenA - lenB) / maxLen > 0.4) {
    return 0;
  }

  // 1. Token Jaccard Similarity
  const tokensA = new Set(normA.split(" ").filter((w) => w.length > 1));
  const tokensB = new Set(normB.split(" ").filter((w) => w.length > 1));

  let intersectionCount = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersectionCount++;
  }
  const unionCount = tokensA.size + tokensB.size - intersectionCount;
  const jaccard = unionCount > 0 ? intersectionCount / unionCount : 0;

  // 2. Character Bigram Dice Coefficient
  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.slice(i, i + 2));
    }
    return bigrams;
  };
  const bigramsA = getBigrams(normA.replace(/\s/g, ""));
  const bigramsB = getBigrams(normB.replace(/\s/g, ""));

  let bigramIntersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) bigramIntersection++;
  }
  const totalBigrams = bigramsA.size + bigramsB.size;
  const dice = totalBigrams > 0 ? (2 * bigramIntersection) / totalBigrams : 0;

  return Math.max(jaccard, dice);
}

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
