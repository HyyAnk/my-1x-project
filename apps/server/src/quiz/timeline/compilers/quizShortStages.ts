import type { QuizTimingPolicy } from "@studio/shared";
import type { TimelineContext } from "./timelineContext.js";
import type { TimelineCompileInput } from "../compileTimeline.types.js";
import { compileKickoffStage } from "./kickoffCompiler.js";
import { compileQuestionBlock } from "./questionCompiler.js";
import { compileScoreCtaStage } from "./scoreCtaCompiler.js";
import { questionTimingPolicy } from "./questionTimingPolicy.js";

/**
 * The Quiz Short rhythm: kickoff line, five tight question blocks, three-second score CTA.
 * No intro video, bridge topic, mid-roll CTA, pre-outro or spoken outro.
 */
export function compileQuizShortStages(ctx: TimelineContext, input: TimelineCompileInput, basePolicy: QuizTimingPolicy): void {
  compileKickoffStage(ctx, input.voicePlan);
  for (const [questionIndex, question] of input.quiz.questions.entries()) {
    ctx.policy = questionTimingPolicy(input, question, "short", basePolicy);
    compileQuestionBlock(ctx, question, questionIndex, input.director, input.voicePlan, "short");
  }
  ctx.policy = basePolicy;
  if (input.outroCtaEnabled !== false) compileScoreCtaStage(ctx);
}
