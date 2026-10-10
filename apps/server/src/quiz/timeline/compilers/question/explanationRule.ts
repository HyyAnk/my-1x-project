import type { QuizPacingProfile, QuizQuestion, QuizTimingPolicy } from "@studio/shared";

/** Holds shorter than this cannot carry a spoken explanation without feeling clipped. */
export const MINIMUM_EXPLANATION_HOLD_SECONDS = 0.5;

/**
 * Explanation rule, shared by the voice plan and the timeline compiler:
 * the explanation beat is compiled only when the question has explanation text AND the
 * timing policy holds the explanation for at least 0.5 s. The short profile holds it for
 * 0.4 s, so a Quiz Short never narrates explanations; Episodes keep their explanation beat.
 */
export function shouldCompileExplanationBeat(
  question: Pick<QuizQuestion, "explanation" | "fun_fact">,
  pacingProfile: QuizPacingProfile,
  policy: Pick<QuizTimingPolicy, "explanation_hold_seconds">,
): boolean {
  const hasText = Boolean((question.explanation || question.fun_fact || "").trim());
  if (!hasText) return false;
  if (pacingProfile === "short" && policy.explanation_hold_seconds < MINIMUM_EXPLANATION_HOLD_SECONDS) return false;
  return true;
}
