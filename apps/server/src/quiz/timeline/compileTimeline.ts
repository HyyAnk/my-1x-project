import { QuizTimelineSchema, type DirectorPlan, type QuizTimeline, type QuizV2, type VoicePlan } from "@studio/shared";
import { timingPolicyForAgeBand, type QuizTimingPolicy } from "./timingPolicy.js";
import { TimelineContext, round } from "./compilers/timelineContext.js";
import { compileIntroStage } from "./compilers/introCompiler.js";
import { compileQuestionBlock } from "./compilers/questionCompiler.js";
import { compileOutroStage } from "./compilers/outroCompiler.js";

export type TimelineCompileInput = {
  quiz: QuizV2;
  director: DirectorPlan;
  voicePlan: VoicePlan;
  audioDurations?: Record<string, number>;
  timing?: Partial<QuizTimingPolicy>;
};

export function compileQuizTimeline(input: TimelineCompileInput): QuizTimeline {
  const policy = { ...timingPolicyForAgeBand(input.quiz.age_band), ...input.timing };
  const ctx = new TimelineContext(policy, input.audioDurations);

  // 1. Intro Stage
  compileIntroStage(ctx, input.director, input.voicePlan);

  // 2. Question Blocks
  for (const [questionIndex, question] of input.quiz.questions.entries()) {
    compileQuestionBlock(ctx, question, questionIndex, input.director, input.voicePlan);
  }

  // 3. Outro Stage
  compileOutroStage(ctx, input.voicePlan);

  // 4. Validate All Voice Segments Were Scheduled
  const missingNarration = input.voicePlan.segments.filter((segment) => !ctx.scheduled.has(segment.segment_id));
  if (missingNarration.length) {
    throw new Error("Timeline omitted voice segments: " + missingNarration.map((segment) => segment.segment_id).join(", "));
  }

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
