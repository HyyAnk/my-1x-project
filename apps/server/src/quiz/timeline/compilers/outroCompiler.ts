import type { VoicePlan } from "@studio/shared";
import { TimelineContext, round } from "./timelineContext.js";

export function compileOutroStage(ctx: TimelineContext, voicePlan: VoicePlan): void {
  const outro = voicePlan.segments.find((segment) => segment.role === "outro");
  if (outro) {
    const outroStart = ctx.cursor;
    const outroNarrationDuration = ctx.scheduleNarration(outro.segment_id, ctx.cursor, outro.text, null);
    const outroEnd = round(outroStart + outroNarrationDuration + ctx.policy.outro_hold_seconds);
    ctx.cursor = outroEnd;
    ctx.add({
      type: "background.motion",
      at_seconds: outroStart,
      duration_seconds: round(ctx.cursor - outroStart),
      question_id: null,
      choice_id: null,
      segment_id: null,
      payload: { layers: ["sunburst", "ambient_shapes"] },
    });
  }
}
