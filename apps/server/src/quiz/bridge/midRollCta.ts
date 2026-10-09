import type { VoicePlan } from "@studio/shared";

/** The subscribe CTA plays right after this question number in every quiz long enough to reach it. */
export const MID_ROLL_CTA_AFTER_QUESTION_NUMBER = 10;

/** Voice segment id kept as "intro_cta" for compatibility with stored voice plans and rendered narration. */
export const MID_ROLL_CTA_SEGMENT_ROLE = "intro_cta" as const;

/**
 * Zero-based index of the question the subscribe CTA follows: question 10 when the quiz has more than
 * ten questions, otherwise the midpoint question so shorter quizzes still get a mid-roll CTA.
 */
export function resolveMidRollCtaAnchorIndex(questionCount: number): number | null {
  if (questionCount <= 0) return null;
  if (questionCount > MID_ROLL_CTA_AFTER_QUESTION_NUMBER) return MID_ROLL_CTA_AFTER_QUESTION_NUMBER - 1;
  return Math.ceil(questionCount / 2) - 1;
}

type VoiceSegment = VoicePlan["segments"][number];

/** Inserts the CTA segment directly after the last voice segment of the anchor question. */
export function insertMidRollCtaSegment(
  segments: VoiceSegment[],
  ctaSegment: VoiceSegment,
  anchorQuestionId: string | undefined,
): void {
  let lastAnchorIndex = -1;
  segments.forEach((segment, index) => {
    if (anchorQuestionId && segment.question_id === anchorQuestionId) lastAnchorIndex = index;
  });
  if (lastAnchorIndex < 0) {
    segments.push(ctaSegment);
    return;
  }
  segments.splice(lastAnchorIndex + 1, 0, ctaSegment);
}
