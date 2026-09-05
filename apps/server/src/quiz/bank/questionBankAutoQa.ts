import type { BankQuestion } from "@studio/shared";
import { validateTextCopyright } from "../qa/copyrightValidator.js";
import { calculateQuestionSimilarity, normalizeQuestionText } from "../qa/questionHistory.js";

export interface AutoQaIssue {
  type: "copyright" | "duplicate" | "schema" | "quality";
  message: string;
  details?: Record<string, unknown>;
}

export interface AutoQaResult {
  passed: boolean;
  questionId: string;
  issues: AutoQaIssue[];
}

export interface RunBatchAutoQaOptions {
  similarityThreshold?: number;
  existingQuestions?: BankQuestion[];
}

export const DEFAULT_SIMILARITY_THRESHOLD = 0.75;

/**
 * Runs comprehensive Auto-QA validation on a single question.
 */
export function runAutoQaOnQuestion(
  question: BankQuestion,
  existingQuestions: BankQuestion[] = [],
  similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD,
): AutoQaResult {
  const issues: AutoQaIssue[] = [];

  // 1. Copyright Check
  const textsToScan: string[] = [
    question.question,
    question.explanation,
    question.fun_fact || "",
    ...(question.choices || []).map((c) => c.text),
    question.visual_spec?.prompt || "",
  ];

  for (const text of textsToScan) {
    if (!text) continue;
    const copyrightResult = validateTextCopyright(text);
    if (copyrightResult.violated) {
      issues.push({
        type: "copyright",
        message: `Copyright violation detected (${copyrightResult.category}): term "${copyrightResult.term}" - ${copyrightResult.reason}`,
        details: { category: copyrightResult.category, term: copyrightResult.term },
      });
      break;
    }
  }

  // 2. Quality & Schema validation
  if (!question.question || question.question.trim().length < 8) {
    issues.push({
      type: "quality",
      message: "Question text is too short (less than 8 characters).",
    });
  } else if (question.question.trim().length > 100) {
    issues.push({
      type: "quality",
      message: `Question text is too long (${question.question.trim().length} chars). Mobile video shorts require concise questions under 100 characters to prevent font shrinkage and text clipping.`,
      details: { length: question.question.trim().length, maxLength: 100 },
    });
  }

  if (!question.explanation || question.explanation.trim().length < 8) {
    issues.push({
      type: "quality",
      message: "Explanation is too short or missing (less than 8 characters).",
    });
  }

  if (!question.choices || question.choices.length < 2) {
    issues.push({
      type: "schema",
      message: "Question must have at least 2 choices.",
    });
  } else {
    // Check duplicate choices
    const normChoices = question.choices.map((c) => normalizeQuestionText(c.text));
    const uniqueChoices = new Set(normChoices);
    if (uniqueChoices.size !== question.choices.length) {
      issues.push({
        type: "quality",
        message: "Question choices contain duplicate content.",
      });
    }

    // Check correct_choice_id
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

  // 3. Deduplication Check against existing bank
  const normQuestion = normalizeQuestionText(question.question || "");
  for (const existing of existingQuestions) {
    if (existing.id === question.id) continue;

    // Exact duplicate check
    const normExisting = normalizeQuestionText(existing.question || "");
    if (normQuestion && normExisting && normQuestion === normExisting) {
      issues.push({
        type: "duplicate",
        message: `Question is an exact duplicate of [${existing.id}]: "${existing.question}"`,
        details: { matchingId: existing.id, similarity: 1 },
      });
      break;
    }

    // Semantic similarity check
    if (question.question && existing.question) {
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

  return {
    passed: issues.length === 0,
    questionId: question.id,
    issues,
  };
}

export interface BatchAutoQaReport {
  total: number;
  passedCount: number;
  rejectedCount: number;
  approvedQuestions: BankQuestion[];
  rejectedQuestions: Array<{
    question: BankQuestion;
    issues: AutoQaIssue[];
  }>;
  summary: {
    copyrightRejections: number;
    duplicateRejections: number;
    schemaRejections: number;
    qualityRejections: number;
  };
}

/**
 * Runs Auto-QA across all newly generated questions, checking against existing bank and intra-batch duplicates.
 */
export function runBatchAutoQa(candidates: BankQuestion[], options: RunBatchAutoQaOptions = {}): BatchAutoQaReport {
  const threshold = options.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
  const existingQuestions = [...(options.existingQuestions || [])];

  const approvedQuestions: BankQuestion[] = [];
  const rejectedQuestions: Array<{ question: BankQuestion; issues: AutoQaIssue[] }> = [];

  const summary = {
    copyrightRejections: 0,
    duplicateRejections: 0,
    schemaRejections: 0,
    qualityRejections: 0,
  };

  for (const candidate of candidates) {
    // Cross-check against both existing questions and already-approved intra-batch questions
    const qaResult = runAutoQaOnQuestion(candidate, [...existingQuestions, ...approvedQuestions], threshold);

    if (qaResult.passed) {
      approvedQuestions.push({
        ...candidate,
        status: "approved",
      });
    } else {
      rejectedQuestions.push({
        question: candidate,
        issues: qaResult.issues,
      });

      for (const issue of qaResult.issues) {
        if (issue.type === "copyright") summary.copyrightRejections++;
        else if (issue.type === "duplicate") summary.duplicateRejections++;
        else if (issue.type === "schema") summary.schemaRejections++;
        else if (issue.type === "quality") summary.qualityRejections++;
      }
    }
  }

  return {
    total: candidates.length,
    passedCount: approvedQuestions.length,
    rejectedCount: rejectedQuestions.length,
    approvedQuestions,
    rejectedQuestions,
    summary,
  };
}
