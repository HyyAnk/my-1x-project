import type { QuizPacingProfile } from "@studio/shared";

export type QuizTimelineProductKind = "episode" | "quiz_short";

/** Segment ids of the Quiz Short bookend stages, so QA and render can find them in the timeline. */
export const QUIZ_SHORT_STAGE_SEGMENT_IDS = {
  kickoff: "kickoff",
  scoreCta: "score_cta",
  /** The uploaded Short intro loop with the quiz title read over it; replaces the kickoff card. */
  shortIntro: "short_intro",
  /** The uploaded Short outro, played in full with no narration; replaces the score CTA. */
  shortOutro: "short_outro",
} as const;

/** The title appears on the intro canvas before the voice starts reading it. */
export const SHORT_INTRO_VOICE_LEAD_IN_SECONDS = 0.6;
/** Hold after the title narration ends before the first question takes over. */
export const SHORT_INTRO_TAIL_SECONDS = 0.8;

export const SCORE_CTA_DURATION_SECONDS = 3;
export const SCORE_CTA_ON_SCREEN_COPY = "How many did you get right? Comment below";

/** Breathing room between the kickoff line and the first question entrance. */
export const KICKOFF_TAIL_SECONDS = 0.2;

/** Quiz Short duration budget: aim for 45 to 60 seconds, warn above 75, fail above 90. */
export const QUIZ_SHORT_TARGET_DURATION_RANGE_SECONDS: readonly [number, number] = [45, 60];
export const QUIZ_SHORT_WARN_DURATION_SECONDS = 75;
export const QUIZ_SHORT_MAX_DURATION_SECONDS = 90;

export function resolveTimelinePacingProfile(input: {
  pacingProfile?: QuizPacingProfile;
  productKind?: QuizTimelineProductKind;
}): QuizPacingProfile {
  return input.pacingProfile ?? (input.productKind === "quiz_short" ? "short" : "standard");
}

export function isChoiceNarrationSegmentId(segmentId: string | null | undefined): boolean {
  return typeof segmentId === "string" && segmentId.endsWith(":choice");
}
