import type { BankQuestion } from "@studio/shared";
import type { LLMClient } from "../../../utils/promptSanitizer.js";

/** The fields of a bank question the highlight annotator reads. */
export type HighlightAnnotationSubject = Pick<BankQuestion, "id" | "question" | "choices" | "correct_choice_id">;

export interface HighlightAnnotationDeps {
  llmClient: LLMClient;
  modelOverride?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Questions sent to the model per prompt. */
  chunkSize?: number;
  /** Rounds over the questions that are still missing a valid phrase. */
  maxAttempts?: number;
}

export interface HighlightAnnotationResult {
  questions: BankQuestion[];
  annotatedIds: string[];
  unresolvedIds: string[];
}
