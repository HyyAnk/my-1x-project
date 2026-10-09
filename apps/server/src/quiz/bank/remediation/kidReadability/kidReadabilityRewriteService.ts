import type { BankQuestion } from "@studio/shared";
import { countWords, fleschKincaidGrade } from "../../audience/readability.js";
import { executeSinglePromptText, type LLMClient } from "../../../../utils/promptSanitizer.js";
import { buildKidReadabilityRewritePrompt, parseKidReadabilityRewriteOutput } from "./kidReadabilityRewritePrompt.js";
import { validateKidReadabilityRewrite } from "./kidReadabilityRewriteValidator.js";
import type { KidReadabilityBatchResult, KidReadabilityRewriteInput } from "./kidReadabilityRewrite.types.js";

export interface KidReadabilityRewriteDeps {
  llmClient: LLMClient;
  timeoutMs?: number;
}

/** Narration that already reads at about grade 6 and stays short is left untouched. */
export function needsKidReadabilityRewrite(question: BankQuestion): boolean {
  const funFact = question.fun_fact ?? "";
  return (
    fleschKincaidGrade(question.explanation) > 6 ||
    countWords(question.explanation) > 25 ||
    fleschKincaidGrade(funFact) > 8 ||
    countWords(funFact) > 24
  );
}

export function toKidReadabilityRewriteInput(question: BankQuestion): KidReadabilityRewriteInput {
  const correct = question.choices.find((choice) => choice.id === question.correct_choice_id);
  return {
    id: question.id,
    question: question.question,
    correctAnswer: correct?.text ?? "",
    explanation: question.explanation,
    funFact: question.fun_fact ?? "",
  };
}

/**
 * Rewrites one batch of narrated copy with the LLM and keeps only rewrites that pass validation.
 * A failed or unparseable model call rejects the whole batch so the caller can retry it later.
 */
export async function rewriteKidReadabilityBatch(
  items: readonly KidReadabilityRewriteInput[],
  deps: KidReadabilityRewriteDeps,
): Promise<KidReadabilityBatchResult> {
  const rawOutput = await executeSinglePromptText(deps.llmClient, buildKidReadabilityRewritePrompt(items), {
    timeoutMs: deps.timeoutMs ?? 240_000,
  });
  const rewrites = parseKidReadabilityRewriteOutput(rawOutput);
  const result: KidReadabilityBatchResult = { accepted: [], rejected: [] };
  for (const item of items) {
    const rewrite = rewrites.get(item.id);
    const reason = rewrite ? validateKidReadabilityRewrite(item, rewrite) : "missing from model output";
    if (reason || !rewrite) result.rejected.push({ id: item.id, reason: reason ?? "missing from model output" });
    else result.accepted.push({ id: item.id, explanation: rewrite.explanation, funFact: rewrite.funFact });
  }
  return result;
}
