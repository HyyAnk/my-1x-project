import type { BankQuestion } from "@studio/shared";
import { calculateQuestionSimilarity, normalizeQuestionText } from "../qa/questionHistory.js";

export interface AutoQaIssue {
  type: "duplicate" | "schema" | "quality";
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
  existingIndex?: QuestionBankAutoQaIndex;
}

export const DEFAULT_SIMILARITY_THRESHOLD = 0.75;

function checkQualityAndSchemaIssues(question: BankQuestion): AutoQaIssue[] {
  const issues: AutoQaIssue[] = [];

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

  if (question.archetype_id === "versus_faceoff" && question.choices && question.choices.length === 2) {
    const qTrim = question.question?.trim() || "";
    if (/:\s*[^:?]+\s*(?:or|vs\.?)\s*[^:?]+\??$/i.test(qTrim)) {
      issues.push({
        type: "quality",
        message:
          "Versus Faceoff question should not redundantly append ': Choice A or Choice B?' at the end. Choices are rendered directly on the split-screen buttons.",
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
 * High-performance deduplication index for Question Bank Auto-QA.
 * Level 1: O(1) exact-match lookup via normalized text map.
 * Level 2: Scoped semantic candidate retrieval by domain_id / entity_id.
 */
export class QuestionBankAutoQaIndex {
  private exactMap = new Map<string, BankQuestion[]>();
  private domainIndex = new Map<string, BankQuestion[]>();
  private entityIndex = new Map<string, BankQuestion[]>();
  private fallbackList: BankQuestion[] = [];
  private allQuestions: BankQuestion[] = [];

  constructor(initialQuestions: BankQuestion[] = []) {
    for (const q of initialQuestions) {
      this.add(q);
    }
  }

  /**
   * Adds a question to the index, updating exact-match and scoped lookup tables.
   */
  public add(question: BankQuestion): void {
    this.allQuestions.push(question);

    const norm = normalizeQuestionText(question.question || "");
    if (norm) {
      let list = this.exactMap.get(norm);
      if (!list) {
        list = [];
        this.exactMap.set(norm, list);
      }
      list.push(question);
    }

    if (question.domain_id) {
      let dList = this.domainIndex.get(question.domain_id);
      if (!dList) {
        dList = [];
        this.domainIndex.set(question.domain_id, dList);
      }
      dList.push(question);
    } else {
      this.fallbackList.push(question);
    }

    if (question.entity_id) {
      let eList = this.entityIndex.get(question.entity_id);
      if (!eList) {
        eList = [];
        this.entityIndex.set(question.entity_id, eList);
      }
      eList.push(question);
    }
  }

  /**
   * Level 1 Fast Path: O(1) lookup to find any exact normalized text duplicate.
   * Returns the matching BankQuestion if an exact duplicate exists (with a different id), or null.
   */
  public findExactMatch(question: BankQuestion): BankQuestion | null {
    const norm = normalizeQuestionText(question.question || "");
    if (!norm) return null;
    const matches = this.exactMap.get(norm);
    if (!matches || matches.length === 0) return null;
    for (const match of matches) {
      if (match.id !== question.id) {
        return match;
      }
    }
    return null;
  }

  /**
   * Level 2 Scoped Semantic Retrieval:
   * Returns candidate questions matching domain_id (and/or entity_id), plus unscoped fallback questions.
   * If candidate lacks domain_id and entity_id, safely falls back to all questions.
   */
  public getSemanticComparisonCandidates(question: BankQuestion): BankQuestion[] {
    if (!question.domain_id && !question.entity_id) {
      return this.allQuestions;
    }

    const result: BankQuestion[] = [];
    const seenIds = new Set<string>();

    const addIfNew = (q: BankQuestion) => {
      if (!seenIds.has(q.id)) {
        seenIds.add(q.id);
        result.push(q);
      }
    };

    if (question.domain_id) {
      const domainQuestions = this.domainIndex.get(question.domain_id);
      if (domainQuestions) {
        for (const q of domainQuestions) addIfNew(q);
      }
    }

    if (question.entity_id) {
      const entityQuestions = this.entityIndex.get(question.entity_id);
      if (entityQuestions) {
        for (const q of entityQuestions) addIfNew(q);
      }
    }

    for (const q of this.fallbackList) {
      addIfNew(q);
    }

    return result;
  }

  /**
   * Returns the total number of indexed questions.
   */
  public get size(): number {
    return this.allQuestions.length;
  }
}

function checkDuplicateIssues(
  question: BankQuestion,
  indexOrQuestions: BankQuestion[] | QuestionBankAutoQaIndex,
  similarityThreshold: number,
): AutoQaIssue[] {
  const issues: AutoQaIssue[] = [];
  const index =
    indexOrQuestions instanceof QuestionBankAutoQaIndex
      ? indexOrQuestions
      : new QuestionBankAutoQaIndex(indexOrQuestions);

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
    duplicateRejections: number;
    schemaRejections: number;
    qualityRejections: number;
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

/**
 * Runs Auto-QA across all newly generated questions, checking against existing bank and intra-batch duplicates.
 */
export function runBatchAutoQa(candidates: BankQuestion[], options: RunBatchAutoQaOptions = {}): BatchAutoQaReport {
  const threshold = options.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
  const index = options.existingIndex ?? new QuestionBankAutoQaIndex(options.existingQuestions || []);

  const approvedQuestions: BankQuestion[] = [];
  const rejectedQuestions: Array<{ question: BankQuestion; issues: AutoQaIssue[] }> = [];

  const summary = {
    duplicateRejections: 0,
    schemaRejections: 0,
    qualityRejections: 0,
  };

  for (const candidate of candidates) {
    // Cross-check against index (containing existing questions + approved intra-batch questions)
    const qaResult = runAutoQaOnQuestion(candidate, index, threshold);

    // Intra-batch syntactic repetition check
    const syntacticIssue = detectSyntacticRepetition(candidate, approvedQuestions);
    const combinedIssues = [...qaResult.issues];
    if (syntacticIssue) {
      combinedIssues.push(syntacticIssue);
    }

    if (combinedIssues.length === 0) {
      const approvedCandidate: BankQuestion = {
        ...candidate,
        status: "approved",
      };
      approvedQuestions.push(approvedCandidate);
      // Immediately index approved candidate for subsequent intra-batch O(1) and scoped checks
      index.add(approvedCandidate);
    } else {
      rejectedQuestions.push({
        question: candidate,
        issues: combinedIssues,
      });

      for (const issue of combinedIssues) {
        if (issue.type === "duplicate") summary.duplicateRejections++;
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
