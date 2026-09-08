import type { BankQuestionWithCooldown } from "@studio/shared";
import type { TopicSourceExclusionReasonCode } from "@studio/shared";
import { evaluateShortReelQuestionEligibility, type EvaluatedBankQuestionCandidate } from "../quiz/bank/bankEligibility.js";

export type QuestionExclusionReason = TopicSourceExclusionReasonCode | "MISSING_ENGLISH_METADATA" | "MISSING_ENGLISH_TRANSLATION";

export type EvaluatedQuestionCandidate = Omit<EvaluatedBankQuestionCandidate, "translationProvenance"> & {
  translationProvenance: "source" | "verified_translation";
};
export type QuestionEligibilityResult =
  { eligible: true; candidate: EvaluatedQuestionCandidate } | { eligible: false; reason: QuestionExclusionReason; detail: string };

/** Backward-compatible Short-Reel policy entry point backed by shared eligibility. */
export function evaluateQuestionEligibility(
  question: BankQuestionWithCooldown,
  targetArchetype: "versus_faceoff" | "deep_trivia",
): QuestionEligibilityResult {
  const result = evaluateShortReelQuestionEligibility(question, { targetArchetype });
  if (!result.eligible && !question.language?.trim() && (!question.translations || Object.keys(question.translations).length === 0)) {
    return {
      eligible: false,
      reason: "MISSING_ENGLISH_METADATA",
      detail: "Question has missing/empty language metadata and lacks verified English translation",
    };
  }
  if (result.eligible) {
    return {
      eligible: true,
      candidate: {
        ...result.candidate,
        translationProvenance: result.candidate.translationProvenance === "native" ? "source" : "verified_translation",
      },
    };
  }
  if (result.reason === "MISSING_TARGET_TRANSLATION") {
    return { ...result, reason: "MISSING_ENGLISH_TRANSLATION" };
  }
  return result;
}
