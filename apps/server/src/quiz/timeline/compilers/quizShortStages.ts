import type { QuizTimingPolicy } from "@studio/shared";
import type { TimelineContext } from "./timelineContext.js";
import type { TimelineCompileInput } from "../compileTimeline.types.js";
import { compileKickoffStage } from "./kickoffCompiler.js";
import { compileQuestionBlock } from "./questionCompiler.js";
import { compileScoreCtaStage } from "./scoreCtaCompiler.js";
import { compileShortIntroStage, compileShortOutroStage } from "./shortBookendCompiler.js";
import { questionTimingPolicy } from "./questionTimingPolicy.js";

/**
 * The Quiz Short rhythm: an opening (the Short intro with the title read over it, or the kickoff
 * card), five tight question blocks, then a closing (the full Short outro, or the three-second
 * score CTA). No bridge topic, mid-roll CTA, pre-outro or spoken outro.
 */
export function compileQuizShortStages(ctx: TimelineContext, input: TimelineCompileInput, basePolicy: QuizTimingPolicy): void {
  if ((input.introDuration ?? 0) > 0) compileShortIntroStage(ctx, input.voicePlan, input.topic);
  else compileKickoffStage(ctx, input.voicePlan);
  for (const [questionIndex, question] of input.quiz.questions.entries()) {
    ctx.policy = questionTimingPolicy(input, question, "short", basePolicy);
    compileQuestionBlock(ctx, question, questionIndex, input.director, input.voicePlan, "short");
  }
  ctx.policy = basePolicy;
  const outroDuration = input.outroDuration ?? 0;
  if (outroDuration > 0) compileShortOutroStage(ctx, outroDuration);
  else if (input.outroCtaEnabled !== false) compileScoreCtaStage(ctx);
}
