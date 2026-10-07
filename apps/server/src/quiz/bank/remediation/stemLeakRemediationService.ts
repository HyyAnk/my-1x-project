import type { BankQuestion } from "@studio/shared";
import type { AutoQaIssue } from "../autoQa/autoQa.types.js";
import { executeSinglePromptText, type LLMClient } from "../../../utils/promptSanitizer.js";
import { detectStemAnswerLeak } from "../autoQa/stemLeakDetector.js";
import {
  buildStemLeakRemediationPrompt,
  parseStemLeakRemediationOutput,
  resolveRemediationStrategy,
} from "./stemLeakRemediationPrompt.js";
import type {
  StemLeakRemediationInput,
  StemLeakRemediationResult,
  StemLeakRemediationStrategy,
} from "./stemLeakRemediation.types.js";

export interface RemediateStemAnswerLeakDeps {
  llmClient: LLMClient;
  maxRetries?: number;
  modelOverride?: string;
  timeoutMs?: number;
}

export interface BatchRemediationDeps extends RemediateStemAnswerLeakDeps {
  concurrency?: number;
}

export interface BatchRemediationResult {
  total: number;
  remediatedCount: number;
  failedCount: number;
  remediatedQuestions: BankQuestion[];
  unresolvedQuestions: Array<{ question: BankQuestion; error: string }>;
}

/**
 * Surgically remediates a single question identified with a stem-answer leak.
 * Employs a self-healing QA loop to verify zero leakage after LLM generation.
 */
export async function remediateStemAnswerLeak(
  input: StemLeakRemediationInput,
  deps: RemediateStemAnswerLeakDeps,
): Promise<StemLeakRemediationResult> {
  const maxRetries = deps.maxRetries ?? 2;
  let currentStrategy: StemLeakRemediationStrategy = resolveRemediationStrategy(
    input.question,
    input.preferredStrategy,
  );

  let lastError: string | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { prompt } = buildStemLeakRemediationPrompt({
        ...input,
        preferredStrategy: currentStrategy,
      });

      const rawOutput = await executeSinglePromptText(deps.llmClient, prompt, {
        modelOverride: deps.modelOverride,
        timeoutMs: deps.timeoutMs ?? 15000,
      });

      const remediatedData = parseStemLeakRemediationOutput(
        rawOutput,
        input.question,
        currentStrategy,
      );

      const candidateQuestion: BankQuestion = {
        ...input.question,
        question: remediatedData.question,
        choices: remediatedData.choices,
        correct_choice_id: remediatedData.correct_choice_id,
        explanation: remediatedData.explanation,
        fun_fact: remediatedData.fun_fact ?? input.question.fun_fact,
        visual_spec: remediatedData.visual_spec,
        status: "approved",
      };

      // Self-Healing Verification Loop: Re-verify against leak detector
      const postVerificationIssue = detectStemAnswerLeak(candidateQuestion);
      if (!postVerificationIssue) {
        return {
          success: true,
          originalQuestion: input.question,
          remediatedQuestion: candidateQuestion,
          strategyApplied: currentStrategy,
        };
      }

      // If still leaking, toggle to the alternative strategy and retry
      lastError = `Remediated candidate still contains stem leak: ${postVerificationIssue.message}`;
      currentStrategy =
        currentStrategy === "plot_or_supporting_character"
          ? "context_reanchoring"
          : "plot_or_supporting_character";
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    success: false,
    originalQuestion: input.question,
    strategyApplied: currentStrategy,
    error: lastError ?? "Failed to remediate question after maximum attempts.",
  };
}

/**
 * Batch-remediates multiple leaked questions concurrently with controlled parallelism.
 */
export async function remediateLeakedQuestionsBatch(
  candidates: Array<{ question: BankQuestion; issue: AutoQaIssue }>,
  deps: BatchRemediationDeps,
): Promise<BatchRemediationResult> {
  const concurrency = deps.concurrency ?? 3;
  const remediatedQuestions: BankQuestion[] = [];
  const unresolvedQuestions: Array<{ question: BankQuestion; error: string }> = [];

  for (let i = 0; i < candidates.length; i += concurrency) {
    const chunk = candidates.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map((item) =>
        remediateStemAnswerLeak(
          { question: item.question, issue: item.issue },
          deps,
        ),
      ),
    );

    for (const res of results) {
      if (res.success && res.remediatedQuestion) {
        remediatedQuestions.push(res.remediatedQuestion);
      } else {
        unresolvedQuestions.push({
          question: res.originalQuestion,
          error: res.error || "Unknown remediation error",
        });
      }
    }
  }

  return {
    total: candidates.length,
    remediatedCount: remediatedQuestions.length,
    failedCount: unresolvedQuestions.length,
    remediatedQuestions,
    unresolvedQuestions,
  };
}
