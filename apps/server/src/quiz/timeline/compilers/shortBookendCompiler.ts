import type { VoicePlan } from "@studio/shared";
import { TimelineContext, round } from "./timelineContext.js";
import { QUIZ_SHORT_STAGE_SEGMENT_IDS, SHORT_INTRO_TAIL_SECONDS, SHORT_INTRO_VOICE_LEAD_IN_SECONDS } from "../quizShortTimelinePolicy.js";

/**
 * Quiz Short with an uploaded intro: the muted intro loop plays as the title backdrop, the
 * kickoff narration reads the quiz title, and the first question starts shortly after the voice
 * ends. The intro clip's own length never stretches the stage.
 */
export function compileShortIntroStage(ctx: TimelineContext, voicePlan: VoicePlan, title: string | undefined): void {
  const kickoff = voicePlan.segments.find((segment) => segment.segment_id === QUIZ_SHORT_STAGE_SEGMENT_IDS.kickoff);
  const start = ctx.cursor;
  const voiceStart = round(start + SHORT_INTRO_VOICE_LEAD_IN_SECONDS);
  const narrationDuration = kickoff ? ctx.scheduleNarration(kickoff.segment_id, voiceStart, kickoff.text, null) : 0;
  ctx.cursor = round(voiceStart + narrationDuration + SHORT_INTRO_TAIL_SECONDS);
  ctx.add({
    type: "background.motion",
    at_seconds: start,
    duration_seconds: round(ctx.cursor - start),
    question_id: null,
    choice_id: null,
    segment_id: QUIZ_SHORT_STAGE_SEGMENT_IDS.shortIntro,
    payload: {
      stage: QUIZ_SHORT_STAGE_SEGMENT_IDS.shortIntro,
      title: title?.trim() || kickoff?.text || "",
      voice_start_seconds: voiceStart,
      voice_duration_seconds: narrationDuration,
    },
  });
}

/** Quiz Short with an uploaded outro: the full clip plays after the last question with no narration. */
export function compileShortOutroStage(ctx: TimelineContext, outroDurationSeconds: number): void {
  const start = ctx.cursor;
  ctx.cursor = round(start + outroDurationSeconds);
  ctx.add({
    type: "background.motion",
    at_seconds: start,
    duration_seconds: round(outroDurationSeconds),
    question_id: null,
    choice_id: null,
    segment_id: QUIZ_SHORT_STAGE_SEGMENT_IDS.shortOutro,
    payload: { stage: QUIZ_SHORT_STAGE_SEGMENT_IDS.shortOutro },
  });
}
