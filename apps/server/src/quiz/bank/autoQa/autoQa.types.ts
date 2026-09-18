import type { BankQuestion } from "@studio/shared";
import type { QuestionBankAutoQaIndex } from "./autoQaIndex.js";

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
