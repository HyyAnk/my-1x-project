import type { VoicePlan } from "@studio/shared";
import { TimelineContext, round } from "./timelineContext.js";
import { KICKOFF_TAIL_SECONDS, QUIZ_SHORT_STAGE_SEGMENT_IDS } from "../quizShortTimelinePolicy.js";

/**
 * Quiz Short opening: a single spoken kickoff line ("Five questions. Ready?") over the
 * ambient background. There is no intro video and no topic teaser.
 */
export function compileKickoffStage(ctx: TimelineContext, voicePlan: VoicePlan): void {
  const kickoff = voicePlan.segments.find((segment) => segment.segment_id === QUIZ_SHORT_STAGE_SEGMENT_IDS.kickoff);
  if (!kickoff) return;
  const start = ctx.cursor;
  const narrationDuration = ctx.scheduleNarration(kickoff.segment_id, start, kickoff.text, null);
  ctx.cursor = round(start + narrationDuration + KICKOFF_TAIL_SECONDS);
  ctx.add({
    type: "background.motion",
    at_seconds: start,
    duration_seconds: round(ctx.cursor - start),
    question_id: null,
    choice_id: null,
    segment_id: QUIZ_SHORT_STAGE_SEGMENT_IDS.kickoff,
    payload: { layers: ["sunburst", "ambient_shapes"], stage: QUIZ_SHORT_STAGE_SEGMENT_IDS.kickoff },
  });
}
