import { QuizTimelineSchema, type QuizTimeline } from "@studio/shared";
import { TimelineContext, round } from "./compilers/timelineContext.js";
import { compileEpisodeStages } from "./compilers/episodeStages.js";
import { compileQuizShortStages } from "./compilers/quizShortStages.js";
import { baseTimingPolicy } from "./compilers/questionTimingPolicy.js";
import { resolveTimelinePacingProfile } from "./quizShortTimelinePolicy.js";
import type { TimelineCompileInput } from "./compileTimeline.types.js";

export type { TimelineCompileInput } from "./compileTimeline.types.js";
export {
  QUIZ_SHORT_STAGE_SEGMENT_IDS,
  SCORE_CTA_DURATION_SECONDS,
  SCORE_CTA_ON_SCREEN_COPY,
  type QuizTimelineProductKind,
} from "./quizShortTimelinePolicy.js";

export function compileQuizTimeline(input: TimelineCompileInput): QuizTimeline {
  const pacingProfile = resolveTimelinePacingProfile(input);
  const basePolicy = baseTimingPolicy(input, pacingProfile);
  const ctx = new TimelineContext(basePolicy, input.audioDurations);

  if (input.productKind === "quiz_short") compileQuizShortStages(ctx, input, basePolicy);
  else compileEpisodeStages(ctx, input, basePolicy);

  assertEveryVoiceSegmentScheduled(ctx, input);

  const sorted = ctx.events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => a.event.at_seconds - b.event.at_seconds || a.index - b.index)
    .map(({ event }) => ({
      ...event,
      at_seconds: round(event.at_seconds),
      duration_seconds: round(event.duration_seconds),
    }));

  return QuizTimelineSchema.parse({
    schema_version: 2,
    episode_id: input.quiz.episode_id,
    duration_seconds: Math.max(0.1, round(ctx.cursor)),
    events: sorted,
  });
}

function assertEveryVoiceSegmentScheduled(ctx: TimelineContext, input: TimelineCompileInput): void {
  const missingNarration = input.voicePlan.segments.filter((segment) => !ctx.scheduled.has(segment.segment_id));
  if (missingNarration.length) {
    throw new Error("Timeline omitted voice segments: " + missingNarration.map((segment) => segment.segment_id).join(", "));
  }
}
