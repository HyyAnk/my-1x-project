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

  // Quality check: Versus Faceoff redundant choice text
  if (question.archetype_id === "versus_faceoff" && question.choices && question.choices.length === 2) {
    const qTrim = question.question?.trim() || "";
    if (/:\s*[^:?]+\s*(?:or|vs\.?)\s*[^:?]+\??$/i.test(qTrim)) {
      issues.push({
        type: "quality",
        message: "Versus Faceoff question should not redundantly append ': Choice A or Choice B?' at the end. Choices are rendered directly on the split-screen buttons.",
        details: { question: qTrim },
      });
    }
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
 * Detects formulaic boilerplate repetition across a batch (e.g. repetitive suffixes or identical consecutive prefixes).
 */
export function detectSyntacticRepetition(
  question: BankQuestion,
  priorApprovedQuestions: BankQuestion[],
): AutoQaIssue | null {
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

    // Intra-batch syntactic repetition check
    const syntacticIssue = detectSyntacticRepetition(candidate, approvedQuestions);
    const combinedIssues = [...qaResult.issues];
    if (syntacticIssue) {
      combinedIssues.push(syntacticIssue);
    }

    if (combinedIssues.length === 0) {
      approvedQuestions.push({
        ...candidate,
        status: "approved",
      });
    } else {
      rejectedQuestions.push({
        question: candidate,
        issues: combinedIssues,
      });

      for (const issue of combinedIssues) {
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
