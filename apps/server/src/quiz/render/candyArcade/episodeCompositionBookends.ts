import type { BridgeShowcaseItem, QuizTimelineEvent, ResolvedTransitionInstance } from "@studio/shared";
import { extractBridgeShowcaseItems } from "../../assets/bridgeTopicEntityExtractor.js";
import { bridgeSubscribeCtaClip, bridgeTopicClip, calculateIntroTransitionTiming, preOutroClip } from "./candyArcadeClips.js";
import { resolveCandyArcadeIntroClip, resolveCandyArcadeOutroClip } from "./candyArcadeTransitionResolver.js";
import { resolveBrandFallbackInitial, resolveBridgeChannelName, type EpisodeCompositionContext } from "./episodeCompositionContext.js";

export type EpisodeIntroResult = {
  clips: string[];
  transitionInstances: Record<string, ResolvedTransitionInstance>;
};

function pushIntroTransitionEvent(context: EpisodeCompositionContext): void {
  const { input, introEnd } = context;
  if (introEnd <= 0.04 || (input.transitionType ?? "stinger_swipe") === "cut") return;
  const introTiming = calculateIntroTransitionTiming(introEnd, input.transitionType ?? "stinger_swipe", input.transitionDurationSeconds);
  if (introTiming.transitionDuration <= 0) return;
  context.events.push({
    event_id: "transition-intro",
    question_id: "intro",
    choice_id: null,
    segment_id: null,
    type: "transition.start",
    at_seconds: introTiming.transitionStart,
    duration_seconds: introTiming.transitionDuration,
    payload: { intent: "lightning" },
  });
}

/** Resolves the intro bookend clip and schedules its outgoing transition event. */
export function buildEpisodeIntro(context: EpisodeCompositionContext): EpisodeIntroResult {
  const { input } = context;
  const intro = resolveCandyArcadeIntroClip({
    hasAudio: input.introHasAudio,
    introVideoPath: input.introVideoPath,
    firstStart: context.introEnd,
    transitionType: input.transitionType,
    transitionDurationSeconds: input.transitionDurationSeconds,
    transitionInstances: input.transitionInstances,
    fps: context.fps,
    canvas: context.canvas,
    audioMode: input.audioMode,
    aspectRatio: context.aspectRatio,
    questionCount: input.quiz.questions.length,
    copy: context.copy,
    mascot: input.mascot,
    mascotConfig: input.mascotConfig,
    chosenStyleId: context.chosenStyleId,
    palette: context.firstQuestionPalette,
    mediaMode: context.effectiveMediaMode,
    motionTemplateId: input.introMotionTemplateId,
    motionTemplateOptions: input.introMotionTemplateOptions,
    topic: context.resolvedTopic,
    channelName: context.channelName,
    brandLogoHtml: context.brandLogoHtml,
  });
  pushIntroTransitionEvent(context);
  return {
    clips: intro.clip ? [intro.clip] : [],
    transitionInstances: intro.transitionInstance ? { [intro.transitionInstance.id]: intro.transitionInstance.instance } : {},
  };
}

function resolveShowcaseItems(context: EpisodeCompositionContext, event: QuizTimelineEvent): BridgeShowcaseItem[] | undefined {
  const rawShowcaseItems = event.payload?.showcaseItems as BridgeShowcaseItem[] | undefined;
  if (rawShowcaseItems && rawShowcaseItems.length > 0) return rawShowcaseItems;
  const isShowcaseDisabled =
    (event.payload as { enableShowcase?: boolean })?.enableShowcase === false ||
    (context.input.quiz as { bridge_config?: { enableShowcase?: boolean } })?.bridge_config?.enableShowcase === false;
  return isShowcaseDisabled ? undefined : extractBridgeShowcaseItems(context.input.quiz);
}

export function buildEpisodeBridgeTopicClip(context: EpisodeCompositionContext): string | undefined {
  const { input, bridgeTopicEvent: event, channelName } = context;
  if (!event) return undefined;
  const payload = event.payload;
  return bridgeTopicClip({
    start: event.at_seconds,
    duration: event.duration_seconds,
    topic: context.resolvedTopic,
    questionCount: (payload?.questionCount as number) || input.quiz.questions.length,
    badgeText: payload?.badgeText as string | undefined,
    promptText: (payload?.subtitle as string) || (payload?.promptText as string) || undefined,
    visualStyle: payload?.visualStyle as string | undefined,
    mascotAction: payload?.mascotAction as string | undefined,
    aspectRatio: context.aspectRatio,
    mascot: input.mascot,
    mascotConfig: input.mascotConfig,
    mediaMode: context.effectiveMediaMode,
    channelName,
    hasCustomLogo: input.brandIdentity?.hasCustomLogo ?? false,
    logoUrl: input.brandIdentity?.logoRelativeUrl,
    fallbackInitial: resolveBrandFallbackInitial(input, channelName),
    showcaseItems: resolveShowcaseItems(context, event),
    assets: input.assets,
  });
}

export function buildEpisodeSubscribeCtaClip(context: EpisodeCompositionContext): string | undefined {
  const { input, bridgeCtaEvent: event } = context;
  if (!event) return undefined;
  const payload = event.payload;
  return bridgeSubscribeCtaClip({
    start: event.at_seconds,
    duration: event.duration_seconds,
    channelName: resolveBridgeChannelName(input, event),
    badgeText: payload?.badgeText as string | undefined,
    headlineText: (payload?.customText as string) || (payload?.headlineText as string) || undefined,
    promptText: payload?.promptText as string | undefined,
    ctaMode: (payload?.ctaMode as "hero_action" | "classic") || "hero_action",
    minimalBranding: (payload?.minimalBranding as boolean | undefined) ?? true,
    aspectRatio: context.aspectRatio,
    mascot: input.mascot,
    mascotConfig: input.mascotConfig,
    mediaMode: context.effectiveMediaMode,
  });
}

export function findEpisodePreOutroEvent(context: EpisodeCompositionContext): QuizTimelineEvent | undefined {
  return context.events.find((event) => event.type === "pre_outro.enter" || event.segment_id === "pre_outro");
}

export function buildEpisodePreOutroClip(context: EpisodeCompositionContext, event: QuizTimelineEvent): string {
  return preOutroClip({
    start: event.at_seconds,
    duration: event.duration_seconds,
    headline: event.payload?.headline as string | undefined,
    aspectRatio: context.aspectRatio,
  });
}

export function buildEpisodeOutroClip(context: EpisodeCompositionContext): string | undefined {
  const { input } = context;
  return resolveCandyArcadeOutroClip({
    hasAudio: input.outroHasAudio,
    outroStart: context.outroStart,
    duration: context.duration,
    outroVideoPath: input.outroVideoPath,
    audioMode: input.audioMode,
    mascot: input.mascot,
    mascotConfig: input.mascotConfig,
    chosenStyleId: context.chosenStyleId,
    questionCount: input.quiz.questions.length,
    copy: context.copy,
    aspectRatio: context.aspectRatio,
    mediaMode: context.effectiveMediaMode,
    motionTemplateId: input.outroMotionTemplateId,
    motionTemplateOptions: input.outroMotionTemplateOptions,
    topic: context.resolvedTopic,
    channelName: context.channelName,
    brandLogoHtml: context.brandLogoHtml,
  });
}
