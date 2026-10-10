import type { QuizTimeline, VoicePlan } from "@studio/shared";
import { QUIZ_SHORT_KICKOFF_SEGMENT_ID } from "../audio/voicePlan.js";
import { matchesBookendTiming } from "../introOutro/renderTiming.js";
import type { QuizProductView } from "./quizProductView.js";

/**
 * Legacy voice plans spoke the intro and outro bookends. The Quiz Short kickoff line shares the
 * "intro" role but is part of the format, so it never marks a plan as stale.
 */
export function hasLegacyBookendVoiceSegments(voicePlan: Pick<VoicePlan, "segments"> | null): boolean {
  if (!voicePlan) return false;
  return voicePlan.segments.some(
    (segment) => (segment.role === "intro" || segment.role === "outro") && segment.segment_id !== QUIZ_SHORT_KICKOFF_SEGMENT_ID,
  );
}

/** Quiz Shorts have no bookends to align against; Episodes keep the intro/outro offset contract. */
export function matchesProductBookendTiming(
  view: QuizProductView | null,
  timeline: QuizTimeline | null,
  media: { introDuration: number; outroDuration: number },
): boolean {
  if (view?.kind === "quiz_short") return timeline !== null;
  return matchesBookendTiming(timeline, media.introDuration, media.outroDuration);
}
