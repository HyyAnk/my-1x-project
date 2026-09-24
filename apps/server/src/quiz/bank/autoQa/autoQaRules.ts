import type { BankQuestion } from "@studio/shared";
import { calculateQuestionSimilarity, normalizeQuestionText } from "../../qa/questionHistory.js";
import { DEFAULT_SIMILARITY_THRESHOLD, type AutoQaIssue, type AutoQaResult } from "./autoQa.types.js";
import { QuestionBankAutoQaIndex } from "./autoQaIndex.js";

export const MAX_QUESTION_LENGTH = 110;
export const MIN_QUESTION_LENGTH = 8;
export const MIN_EXPLANATION_LENGTH = 8;

/**
 * Validates quality standards and schema integrity on a bank question.
 */
export function checkQualityAndSchemaIssues(question: BankQuestion): AutoQaIssue[] {
  const issues: AutoQaIssue[] = [];

  if (!question.question || question.question.trim().length < MIN_QUESTION_LENGTH) {
    issues.push({
      type: "quality",
      message: `Question text is too short (less than ${MIN_QUESTION_LENGTH} characters).`,
    });
  } else if (question.question.trim().length > MAX_QUESTION_LENGTH) {
    issues.push({
      type: "quality",
      message: `Question text is too long (${question.question.trim().length} chars). Mobile video shorts require concise questions under ${MAX_QUESTION_LENGTH} characters to prevent font shrinkage and text clipping.`,
      details: { length: question.question.trim().length, maxLength: MAX_QUESTION_LENGTH },
    });
  }

  if (!question.explanation || question.explanation.trim().length < MIN_EXPLANATION_LENGTH) {
    issues.push({
      type: "quality",
      message: `Explanation is too short or missing (less than ${MIN_EXPLANATION_LENGTH} characters).`,
    });
  }

  if (question.archetype_id === "versus_faceoff" && question.choices && question.choices.length === 2) {
    const qTrim = question.question?.trim() || "";
    if (/:\s*[^:?]+\s+\b(?:or|vs\.?)\b\s+[^:?]+\??$/i.test(qTrim)) {
      issues.push({
        type: "quality",
        message:
          "Versus Faceoff question should not redundantly append ': Choice A or Choice B?' at the end. Choices are rendered directly on the split-screen buttons.",
        details: { question: qTrim },
      });
    }

    if (/^In\s+[^,]+,\s+which\s+[a-z\s]+(?:\b(?:escaped|shouts?|voices?|played|invented|created|is\s+the\s+only)\b)/i.test(qTrim)) {
      issues.push({
        type: "quality",
        message:
          "Versus Faceoff question appears to be an asymmetric single-character trivia question rather than a 1v1 head-to-head comparison. Use comparative phrasing (e.g., 'Entity A vs Entity B: Who has more...').",
        details: { question: qTrim },
      });
    }
  }

  const isMystery = question.archetype_id === "mystery_reveal";
  if (!question.choices || (isMystery ? question.choices.length !== 1 : question.choices.length < 2)) {
    issues.push({
      type: "schema",
      message: isMystery
        ? `Archetype "mystery_reveal" requires exactly 1 choices, received ${question.choices?.length ?? 0}`
        : "Question must have at least 2 choices.",
    });
  } else {
    const normChoices = question.choices.map((c) => normalizeQuestionText(c.text));
    const uniqueChoices = new Set(normChoices);
    if (uniqueChoices.size !== question.choices.length) {
      issues.push({
        type: "quality",
        message: "Question choices contain duplicate content.",
      });
    }

    const correctChoice = question.choices.find((c) => c.id === question.correct_choice_id);
    if (!correctChoice) {
      issues.push({
        type: "schema",
        message: `correct_choice_id "${question.correct_choice_id}" does not exist in choices.`,
      });
    } else if (!correctChoice.is_correct) {
      issues.push({
        type: "schema",
        message: `Choice "${question.correct_choice_id}" marked correct but is_correct = false.`,
      });
    }
  }

  return issues;
}

/**
 * Checks for exact and high semantic similarity duplicates against indexed questions.
 */
export function checkDuplicateIssues(
  question: BankQuestion,
  indexOrQuestions: BankQuestion[] | QuestionBankAutoQaIndex,
  similarityThreshold: number,
): AutoQaIssue[] {
  const issues: AutoQaIssue[] = [];
  const index = indexOrQuestions instanceof QuestionBankAutoQaIndex ? indexOrQuestions : new QuestionBankAutoQaIndex(indexOrQuestions);

  // Level 1 Fast Path (O(1) Exact-Match Lookup)
  const exactMatch = index.findExactMatch(question);
  if (exactMatch) {
    issues.push({
      type: "duplicate",
      message: `Question is an exact duplicate of [${exactMatch.id}]: "${exactMatch.question}"`,
      details: { matchingId: exactMatch.id, similarity: 1 },
    });
    return issues;
  }

  // Level 2 Scoped Semantic Similarity (O(K) where K << N)
  if (question.question) {
    const candidates = index.getSemanticComparisonCandidates(question);
    for (const existing of candidates) {
      if (existing.id === question.id) continue;
      if (!existing.question) continue;

      const similarity = calculateQuestionSimilarity(question.question, existing.question);
      if (similarity >= similarityThreshold) {
        issues.push({
          type: "duplicate",
          message: `Question has high semantic similarity (${Math.round(similarity * 100)}%) with [${existing.id}]: "${existing.question}"`,
          details: { matchingId: existing.id, similarity },
        });
        break;
      }
    }
  }

  return issues;
}

/**
 * Runs comprehensive Auto-QA validation on a single question.
 */
export function runAutoQaOnQuestion(
  question: BankQuestion,
  existingQuestions: BankQuestion[] | QuestionBankAutoQaIndex = [],
  similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD,
): AutoQaResult {
  const issues: AutoQaIssue[] = [
    ...checkQualityAndSchemaIssues(question),
    ...checkDuplicateIssues(question, existingQuestions, similarityThreshold),
  ];

  return {
    passed: issues.length === 0,
    questionId: question.id,
    issues,
  };
}

/**
 * Detects formulaic boilerplate repetition across a batch (e.g. repetitive suffixes or identical consecutive prefixes).
 */
export function detectSyntacticRepetition(question: BankQuestion, priorApprovedQuestions: BankQuestion[]): AutoQaIssue | null {
  const norm = normalizeQuestionText(question.question || "");
  if (!norm) return null;

  // 1. Check for formulaic "odd one out" suffix repetition
  if (norm.endsWith("is the odd one out") || norm.endsWith("the odd one out")) {
    const priorMatchingSuffixCount = priorApprovedQuestions.filter((q) => {
      const pNorm = normalizeQuestionText(q.question || "");
      return pNorm.endsWith("is the odd one out") || pNorm.endsWith("the odd one out");
    }).length;

    if (priorMatchingSuffixCount >= 2) {
      return {
        type: "quality",
        message: `Monotonous formulaic repetition: question repeats 'odd one out' suffix seen ${priorMatchingSuffixCount} times previously in batch. Vary question hooks (e.g., 'Spot the impostor...', 'Which is the outlier...').`,
        details: { question: question.question, priorCount: priorMatchingSuffixCount },
      };
    }
  }

  // 2. Check for 3+ consecutive questions with identical 2-word opening prefix
  const words = norm.split(" ").filter(Boolean);
  if (words.length >= 2 && priorApprovedQuestions.length >= 2) {
    const currentPrefix = words.slice(0, 2).join(" ");
    const last1 = normalizeQuestionText(priorApprovedQuestions[priorApprovedQuestions.length - 1].question || "")
      .split(" ")
      .slice(0, 2)
      .join(" ");
    const last2 = normalizeQuestionText(priorApprovedQuestions[priorApprovedQuestions.length - 2].question || "")
      .split(" ")
      .slice(0, 2)
      .join(" ");

    if (currentPrefix === last1 && currentPrefix === last2) {
      return {
        type: "quality",
        message: `Monotonous opening repetition: 3 consecutive questions start with '${currentPrefix}'. Vary sentence openings across questions.`,
        details: { prefix: currentPrefix, question: question.question },
      };
    }
  }

  return null;
}
