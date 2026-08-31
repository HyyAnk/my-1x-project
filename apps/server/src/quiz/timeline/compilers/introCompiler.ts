import type { DirectorPlan, VoicePlan } from "@studio/shared";
import { TimelineContext, round } from "./timelineContext.js";

export function compileIntroStage(ctx: TimelineContext, director: DirectorPlan, voicePlan: VoicePlan): void {
  const intro = voicePlan.segments.find((segment) => segment.role === "intro");
  ctx.add({
    type: "background.enter",
    at_seconds: 0,
    duration_seconds: 0,
    question_id: null,
    choice_id: null,
    segment_id: null,
    payload: { theme: director.archetype_family },
  });

  const introEnd = intro ? ctx.scheduleNarration(intro.segment_id, ctx.cursor, intro.text, null) : 0;
  ctx.cursor = round(Math.max(ctx.policy.intro_minimum_seconds, introEnd));
  if (ctx.cursor > 0) {
    ctx.add({
      type: "background.motion",
      at_seconds: 0,
      duration_seconds: ctx.cursor,
      question_id: null,
      choice_id: null,
      segment_id: null,
      payload: { layers: ["sunburst", "pattern", "ambient_shapes"] },
    });
  }
}
