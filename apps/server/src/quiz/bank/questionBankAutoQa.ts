import type { BankQuestion } from "@studio/shared";
import {
  DEFAULT_SIMILARITY_THRESHOLD,
  type AutoQaIssue,
  type BatchAutoQaReport,
  type RunBatchAutoQaOptions,
} from "./autoQa/autoQa.types.js";
import { QuestionBankAutoQaIndex } from "./autoQa/autoQaIndex.js";
import { detectSyntacticRepetition, runAutoQaOnQuestion } from "./autoQa/autoQaRules.js";

export * from "./autoQa/autoQa.types.js";
export * from "./autoQa/autoQaIndex.js";
export * from "./autoQa/autoQaRules.js";

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

/**
 * Alias for runBatchAutoQa to preserve exact naming conventions.
 */
export const runBatchQuestionBankAutoQa = runBatchAutoQa;
