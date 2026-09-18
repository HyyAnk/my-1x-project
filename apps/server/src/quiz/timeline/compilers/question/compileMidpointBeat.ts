import type { QuizQuestion, VoicePlan } from "@studio/shared";
import { type TimelineContext, round } from "../timelineContext.js";

export function compileMidpointBeat(ctx: TimelineContext, question: QuizQuestion, voicePlan: VoicePlan): void {
  const midpoint = voicePlan.segments.find((segment) => segment.role === "midpoint" && segment.question_id === question.id);
  if (!midpoint) return;

  ctx.add({
    type: "mascot.state",
    at_seconds: ctx.cursor,
    duration_seconds: 0,
    question_id: question.id,
    choice_id: null,
    segment_id: null,
    payload: { state: "encourage", interlude: "midpoint" },
  });
  ctx.cursor += ctx.scheduleNarration(midpoint.segment_id, ctx.cursor, midpoint.text, question.id);
  ctx.cursor = round(ctx.cursor + ctx.policy.transition_seconds);
}
