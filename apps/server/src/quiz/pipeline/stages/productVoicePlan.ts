import type { BridgeSceneConfig, Channel, DirectorPlan, QuizV2, VoicePlan } from "@studio/shared";
import { buildQuizShortVoicePlan } from "../../audio/quizShortVoicePlan.js";
import { buildQuizVoicePlan } from "../../audio/voicePlan.js";
import { quizVoiceTargetWordsPerSecond } from "../../audio/voicePolicy.js";
import { resolveBridgeChannelDisplayName } from "../../bridge/resolveBridgeConfig.js";
import { productPacingProfile } from "../productPipelineOptions.js";
import type { QuizProductView } from "../quizProductView.js";

export type ProductVoicePlanInput = {
  quiz: QuizV2;
  view: QuizProductView | null;
  channel: Channel;
  director?: DirectorPlan | null;
  bridgeConfig: BridgeSceneConfig;
  skipIntro: boolean;
  skipOutro: boolean;
};

export function resolveProductChannelName(input: Pick<ProductVoicePlanInput, "channel" | "bridgeConfig" | "view">): string {
  return resolveBridgeChannelDisplayName(input.channel, input.bridgeConfig, input.view?.quiz_config.channel_brand_name);
}

/**
 * Quiz Shorts always speak the kickoff line (it replaces the intro bookend rather than being one),
 * never read choices and carry no bridge or outro segments. Episodes keep the bridge-aware plan.
 */
export function buildProductVoicePlan(input: ProductVoicePlanInput): VoicePlan {
  if (input.view?.kind === "quiz_short") {
    return buildQuizShortVoicePlan(input.quiz, { director: input.director ?? undefined, skipIntro: false });
  }
  return buildQuizVoicePlan(input.quiz, {
    skipIntro: input.skipIntro,
    skipOutro: input.skipOutro,
    director: input.director ?? undefined,
    channelName: resolveProductChannelName(input),
    topic: input.view?.topic?.title,
    bridgeConfig: input.bridgeConfig,
    customCtaText: input.bridgeConfig.customCtaText,
    includeBridgeSegments: input.bridgeConfig.enabled !== false,
  });
}

/** The short profile speaks one pacing step faster than the age band default. */
export function productVoiceTargetWordsPerSecond(quiz: QuizV2, view: QuizProductView | null): number {
  return quizVoiceTargetWordsPerSecond(quiz.age_band, productPacingProfile(view));
}
