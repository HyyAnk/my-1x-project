import { TimelineContext, round } from "./timelineContext.js";
import { QUIZ_SHORT_STAGE_SEGMENT_IDS, SCORE_CTA_DURATION_SECONDS, SCORE_CTA_ON_SCREEN_COPY } from "../quizShortTimelinePolicy.js";

/**
 * Quiz Short closing: a fixed three-second on-screen call to action asking viewers to
 * comment their score. It carries no narration; the mascot celebrates over it.
 */
export function compileScoreCtaStage(ctx: TimelineContext, durationSeconds: number = SCORE_CTA_DURATION_SECONDS): void {
  const start = ctx.cursor;
  ctx.cursor = round(start + durationSeconds);
  ctx.add({
    type: "mascot.state",
    at_seconds: start,
    duration_seconds: 0,
    question_id: null,
    choice_id: null,
    segment_id: QUIZ_SHORT_STAGE_SEGMENT_IDS.scoreCta,
    payload: { state: "celebrate", phase: "score_cta" },
  });
  ctx.add({
    type: "background.motion",
    at_seconds: start,
    duration_seconds: durationSeconds,
    question_id: null,
    choice_id: null,
    segment_id: QUIZ_SHORT_STAGE_SEGMENT_IDS.scoreCta,
    payload: {
      layers: ["sunburst", "ambient_shapes"],
      stage: QUIZ_SHORT_STAGE_SEGMENT_IDS.scoreCta,
      on_screen_copy: SCORE_CTA_ON_SCREEN_COPY,
    },
  });
}
