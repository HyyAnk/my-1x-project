import type { BankQuestion } from "@studio/shared";
import type { AutoQaIssue } from "../autoQa/autoQa.types.js";

export type StemLeakRemediationStrategy = "plot_or_supporting_character" | "context_reanchoring";

export interface StemLeakRemediationInput {
  question: BankQuestion;
  issue: AutoQaIssue;
  preferredStrategy?: StemLeakRemediationStrategy;
}

export interface RemediatedQuestionOutput {
  question: string;
  choices: Array<{ id: string; text: string; is_correct?: boolean }>;
  correct_choice_id: string;
  explanation: string;
  fun_fact?: string;
  visual_spec: {
    intent: string;
    prompt: string;
    aspect_ratio?: string;
  };
  remediation_strategy_applied: StemLeakRemediationStrategy;
}

export interface StemLeakRemediationResult {
  success: boolean;
  originalQuestion: BankQuestion;
  remediatedQuestion?: BankQuestion;
  strategyApplied?: StemLeakRemediationStrategy;
  error?: string;
}
