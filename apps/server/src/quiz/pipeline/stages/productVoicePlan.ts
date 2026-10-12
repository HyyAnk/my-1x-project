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
  /** Quiz Short only: present when a Short intro is pinned; the kickoff then reads this title. */
  shortIntroTitle?: string;
};

export function resolveProductChannelName(input: Pick<ProductVoicePlanInput, "channel" | "bridgeConfig" | "view">): string {
  return resolveBridgeChannelDisplayName(input.channel, input.bridgeConfig, input.view?.quiz_config.channel_brand_name);
}

/**
 * Quiz Shorts always speak the kickoff line: the quiz title over a Short intro, otherwise the
 * question-count line. They never read choices and carry no bridge or outro segments. Episodes
 * keep the bridge-aware plan.
 */
export function buildProductVoicePlan(input: ProductVoicePlanInput): VoicePlan {
  if (input.view?.kind === "quiz_short") {
    return buildQuizShortVoicePlan(input.quiz, {
      director: input.director ?? undefined,
      skipIntro: false,
      kickoffText: input.shortIntroTitle,
    });
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
