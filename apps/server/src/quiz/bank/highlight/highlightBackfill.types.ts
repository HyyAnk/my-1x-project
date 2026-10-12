import type { BankQuestion, BankQuestionWithCooldown } from "@studio/shared";
import type { BankQuestionSnapshot } from "../../../repository/quiz/bank/bankSerializationBoundary.js";
import type { HighlightAnnotationDeps } from "./highlightAnnotation.types.js";

/** The repository operations the backfill needs; keeps the service testable without a full repository. */
export interface HighlightBackfillRepository {
  readQuestionBankSnapshot(): Promise<Pick<BankQuestionSnapshot, "batches">>;
  getQuestionBankQuestion(questionId: string): Promise<BankQuestionWithCooldown | null>;
  saveQuestionBankQuestion(question: BankQuestion): Promise<BankQuestion>;
}

export interface HighlightCoverage {
  /** Active (non-archived) questions. */
  total: number;
  withPhrase: number;
  missing: number;
}

export interface HighlightBackfillProgress {
  /** Questions that lacked a valid phrase when the run started. */
  total: number;
  processed: number;
  annotated: number;
  unresolved: number;
  /** Questions edited or deleted while the run was in flight, left for the next run. */
  skippedStale: number;
  saveFailures: number;
}

export interface HighlightBackfillOptions extends Omit<HighlightAnnotationDeps, "chunkSize"> {
  questionsPerPrompt?: number;
  /** Prompts in flight at the same time. */
  concurrency?: number;
  onProgress?: (progress: HighlightBackfillProgress) => void;
}

export interface HighlightBackfillReport extends HighlightBackfillProgress {
  /** Up to a handful of save error messages, for the job status panel. */
  sampleErrors: string[];
}
