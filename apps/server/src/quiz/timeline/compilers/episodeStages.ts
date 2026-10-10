import type { QuizTimingPolicy } from "@studio/shared";
import type { TimelineContext } from "./timelineContext.js";
import type { TimelineCompileInput } from "../compileTimeline.types.js";
import { compileIntroStage } from "./introCompiler.js";
import { compileQuestionBlock } from "./questionCompiler.js";
import { compileMidRollCtaStage } from "./midRollCtaCompiler.js";
import { resolveMidRollCtaAnchorIndex } from "../../bridge/midRollCta.js";
import { compilePreOutroStage } from "./preOutroCompiler.js";
import { compileOutroStage } from "./outroCompiler.js";
import { questionTimingPolicy } from "./questionTimingPolicy.js";

/** The Episode rhythm: intro, questions with a mid-roll CTA, pre-outro celebration and outro. */
export function compileEpisodeStages(ctx: TimelineContext, input: TimelineCompileInput, basePolicy: QuizTimingPolicy): void {
  compileIntroStage(ctx, input.director, input.voicePlan, input.introDuration, {
    bridgeConfig: input.bridgeConfig,
    topic: input.topic,
    questionCount: input.quiz.questions.length,
  });

  const questionCount = input.quiz.questions.length;
  const ctaAnchorIndex = resolveMidRollCtaAnchorIndex(questionCount);
  for (const [questionIndex, question] of input.quiz.questions.entries()) {
    ctx.policy = questionTimingPolicy(input, question, "standard", basePolicy);
    compileQuestionBlock(ctx, question, questionIndex, input.director, input.voicePlan, "standard");
    if (questionIndex === ctaAnchorIndex) {
      ctx.policy = basePolicy;
      compileMidRollCtaStage(ctx, input.voicePlan, {
        bridgeConfig: input.bridgeConfig,
        channelName: input.channelName,
        hasNextQuestion: questionIndex < questionCount - 1,
      });
    }
  }
  ctx.policy = basePolicy;

  const hasOutro =
    (input.outroDuration !== undefined && input.outroDuration > 0) || input.voicePlan.segments.some((segment) => segment.role === "outro");
  compilePreOutroStage(ctx, input.voicePlan, { bridgeConfig: input.bridgeConfig, hasNextOutro: hasOutro });
  compileOutroStage(ctx, input.voicePlan, input.outroDuration);
}
