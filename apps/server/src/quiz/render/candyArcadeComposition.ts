import {
  QuizV2Schema,
  resolveEffectiveMascotMediaMode,
  type BridgeShowcaseItem,
  type ChannelMascotConfig,
  type DirectorPlan,
  type MascotProfile,
  type QuizTimeline,
  type QuizV2,
  type MascotRenderAspectRatio,
  type MascotStateMediaMode,
  type IntroOutroTransitionType,
  type ResolvedTransitionInstance,
  type MotionTemplateOptions,
  MASCOT_CANVAS_SIZES,
} from "@studio/shared";
import { type ResolveBgmOptions } from "../audio/bgmRegistry.js";
import { resolveCandyArcadeQuestions } from "./candyArcade/candyArcadeQuestionResolution.js";
import {
  autoInjectFontFaces,
  candyArcadeCss,
  candyArcadeHeroAreaRatio,
  candyArcadeSystemFontFaceCss,
} from "./candyArcade/candyArcadeStyles.js";
import { highlightQuestionMarkup, illustrationDataUri, QUESTION_KEYWORD_STOP_WORDS, esc, escAttr } from "./candyArcade/candyArcadeSvg.js";
import { extractBridgeShowcaseItems } from "../assets/bridgeTopicEntityExtractor.js";
import { assetFor, buildBgmClips, buildSfxClips, sfxSource, source } from "./candyArcade/candyArcadeAudio.js";
import {
  introClip,
  outroClip,
  customIntroVideoClip,
  customOutroVideoClip,
  questionClip,
  bridgeTopicClip,
  bridgeSubscribeCtaClip,
  preOutroClip,
  quizCopy,
  subCompositionMount,
  toSubComposition,
  transitionClip,
  mascotElement,
  calculateIntroTransitionTiming,
  brandLogoStingerClip,
  energyWhipStingerClip,
  celebrationStingerClip,
} from "./candyArcade/candyArcadeClips.js";
import { renderChannelBrandMark } from "./candyArcade/channelBrandMark.js";
import { createMascotAnimationRenderSnapshot, type MascotAnimationRenderSnapshot } from "./productionMascotRenderer.js";
import type { QuizRenderStyleContext } from "./quizRenderStyleContext.js";
import { resolveCandyArcadeIntroClip, resolveCandyArcadeOutroClip } from "./candyArcade/candyArcadeTransitionResolver.js";
import { buildCandyArcadeQuestionTimeline } from "./candyArcade/candyArcadeQuestionTimeline.js";
import { assembleCandyArcadeDocument } from "./candyArcade/candyArcadeAssetBundler.js";
import type { ResolvedChannelBrandIdentity } from "../brand/channelBrandAssetResolver.js";

export type CandyArcadeCompositionInput = {
  quiz: QuizV2;
  director: DirectorPlan;
  timeline: QuizTimeline;
  styleContext: QuizRenderStyleContext;
  audioPath: string;
  narrationDurationSeconds: number;
  aspectRatio?: MascotRenderAspectRatio;
  assets?: Record<string, string>;
  bgmOptions?: ResolveBgmOptions;
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
  premixedAudio?: boolean;
  mascotStyleId?: string | null;
  /** Must match the renderer CLI --fps so markup and encoder stay in sync. */
  fps?: number;
  introVideoPath?: string;
  outroVideoPath?: string;
  transitionType?: IntroOutroTransitionType;
  transitionDurationSeconds?: number;
  transitionInstances?: Record<string, ResolvedTransitionInstance>;
  audioMode?: "use_video_audio" | "overlay_bgm";
  introHasAudio?: boolean;
  outroHasAudio?: boolean;
  mascotAnimationSnapshot?: MascotAnimationRenderSnapshot;
  mascotMediaMode?: MascotStateMediaMode;
  brandIdentity?: ResolvedChannelBrandIdentity;
  topic?: string;
  introMotionTemplateId?: string;
  introMotionTemplateOptions?: MotionTemplateOptions;
  outroMotionTemplateId?: string;
  outroMotionTemplateOptions?: MotionTemplateOptions;
  channelName?: string;
};

export type CandyArcadeCompositionBundle = {
  html: string;
  files: Record<string, string>;
  transitionInstances: Record<string, ResolvedTransitionInstance>;
  mascotAnimationSnapshot?: MascotAnimationRenderSnapshot;
};

export {
  candyArcadeHeroAreaRatio,
  candyArcadeCss,
  highlightQuestionMarkup,
  illustrationDataUri,
  QUESTION_KEYWORD_STOP_WORDS,
  esc,
  escAttr,
  buildBgmClips,
  buildSfxClips,
  sfxSource,
  source,
  assetFor,
  introClip,
  outroClip,
  customIntroVideoClip,
  customOutroVideoClip,
  questionClip,
  bridgeTopicClip,
  bridgeSubscribeCtaClip,
  brandLogoStingerClip,
  energyWhipStingerClip,
  celebrationStingerClip,
  transitionClip,
  mascotElement,
  quizCopy,
  toSubComposition,
  subCompositionMount,
  renderChannelBrandMark,
  autoInjectFontFaces,
  candyArcadeSystemFontFaceCss,
};

function resolveChosenMascotStyleId(input: CandyArcadeCompositionInput): string | null | undefined {
  return (
    input.mascotStyleId ??
    (input.quiz as { quiz_config?: { mascot_style_id?: string } }).quiz_config?.mascot_style_id ??
    (input as { quiz_config?: { mascot_style_id?: string } }).quiz_config?.mascot_style_id ??
    (input.mascotConfig as { mascot_style_id?: string })?.mascot_style_id ??
    input.mascot?.active_style_id
  );
}

function resolveFirstAndOutroTiming(events: QuizTimeline["events"], firstQuestionId?: string) {
  const firstStart = firstQuestionId
    ? (events.find((event) => event.question_id === firstQuestionId && event.type === "question.enter")?.at_seconds ?? 0)
    : 0;
  const preOutroStart = events.find(
    (event) =>
      event.segment_id === "pre_outro" ||
      (event.type === "narration.segment" && event.segment_id === "pre_outro") ||
      event.type === "pre_outro.enter",
  )?.at_seconds;
  const outroStart = events.find(
    (event) => event.segment_id === "outro" || (event.type === "narration.segment" && event.segment_id === "outro"),
  )?.at_seconds;
  return { firstStart, outroStart, questionEndStart: preOutroStart ?? outroStart };
}

export function buildCandyArcadeComposition(input: CandyArcadeCompositionInput): string {
  return buildCandyArcadeCompositionBundle(input).html;
}

export function buildCandyArcadeCompositionBundle(input: CandyArcadeCompositionInput): CandyArcadeCompositionBundle {
  QuizV2Schema.parse(input.quiz);
  const aspectRatio = input.aspectRatio ?? "16:9";
  const canvas = MASCOT_CANVAS_SIZES[aspectRatio];
  const fps = input.fps ?? 30;
  const duration = Math.max(3, input.narrationDurationSeconds, input.timeline.duration_seconds);
  const copy = quizCopy(input.quiz.language);

  const resolvedQuestions = resolveCandyArcadeQuestions({
    quiz: input.quiz,
    director: input.director,
    styleContext: input.styleContext,
    aspectRatio,
  });
  const usedBackgroundStyles = new Set(resolvedQuestions.map(({ style }) => style.backgroundStyle));

  const events = [...input.timeline.events];
  const { firstStart, outroStart, questionEndStart } = resolveFirstAndOutroTiming(events, input.quiz.questions[0]?.id);
  const chosenStyleId = resolveChosenMascotStyleId(input);
  const snapshot = input.mascotAnimationSnapshot ?? createMascotAnimationRenderSnapshot(input.quiz.episode_id || "default_video");
  const effectiveMediaMode = resolveEffectiveMascotMediaMode(input.mascotConfig, input.mascotMediaMode);

  const bridgeTopicEvent = events.find((event) => event.type === "bridge.topic.enter");
  const bridgeCtaEvent = events.find((event) => event.type === "bridge.cta.enter");
  const introEnd = bridgeTopicEvent?.at_seconds ?? bridgeCtaEvent?.at_seconds ?? firstStart;

  const topicPayload = bridgeTopicEvent?.payload?.topic as string | undefined;
  const resolvedTopic =
    input.topic?.trim() ||
    (topicPayload && topicPayload !== "Today's Quiz" && topicPayload !== "Today's Challenge" ? topicPayload : undefined) ||
    (input.quiz as { topic?: { title?: string } }).topic?.title ||
    topicPayload ||
    "Today's Challenge";

  const channelName =
    input.channelName ||
    input.brandIdentity?.channelName ||
    (bridgeCtaEvent?.payload?.channelName as string) ||
    (input.quiz as { quiz_config?: { channel_name?: string } }).quiz_config?.channel_name ||
    (input.quiz as { channel_name?: string }).channel_name ||
    "Quiz";

  const brandLogoHtml =
    input.brandIdentity?.hasCustomLogo && input.brandIdentity.logoRelativeUrl
      ? `<img src="${escAttr(input.brandIdentity.logoRelativeUrl)}" alt="Logo" class="motion-brand-logo" />`
      : undefined;

  const firstQuestionPalette = resolvedQuestions[0]?.visual.palette;
  const intro = resolveCandyArcadeIntroClip({
    hasAudio: input.introHasAudio,
    introVideoPath: input.introVideoPath,
    firstStart: introEnd,
    transitionType: input.transitionType,
    transitionDurationSeconds: input.transitionDurationSeconds,
    transitionInstances: input.transitionInstances,
    fps,
    canvas,
    audioMode: input.audioMode,
    aspectRatio,
    questionCount: input.quiz.questions.length,
    copy,
    mascot: input.mascot,
    mascotConfig: input.mascotConfig,
    chosenStyleId,
    palette: firstQuestionPalette,
    mediaMode: effectiveMediaMode,
    motionTemplateId: input.introMotionTemplateId,
    motionTemplateOptions: input.introMotionTemplateOptions,
    topic: resolvedTopic,
    channelName,
    brandLogoHtml,
  });

  if (introEnd > 0.04 && (input.transitionType ?? "stinger_swipe") !== "cut") {
    const introTiming = calculateIntroTransitionTiming(
      introEnd,
      input.transitionType ?? "stinger_swipe",
      input.transitionDurationSeconds,
    );
    if (introTiming.transitionDuration > 0) {
      events.push({
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
  }

  const transitionInstances: Record<string, ResolvedTransitionInstance> = intro.transitionInstance
    ? { [intro.transitionInstance.id]: intro.transitionInstance.instance }
    : {};
  const clips: string[] = intro.clip ? [intro.clip] : [];

  if (bridgeTopicEvent) {
    const rawShowcaseItems = bridgeTopicEvent.payload?.showcaseItems as BridgeShowcaseItem[] | undefined;
    const isShowcaseDisabled =
      (bridgeTopicEvent.payload as { enableShowcase?: boolean })?.enableShowcase === false ||
      (input.quiz as { bridge_config?: { enableShowcase?: boolean } })?.bridge_config?.enableShowcase === false;

    const showcaseItems =
      (rawShowcaseItems && rawShowcaseItems.length > 0)
        ? rawShowcaseItems
        : (!isShowcaseDisabled ? extractBridgeShowcaseItems(input.quiz) : undefined);

    clips.push(
      bridgeTopicClip({
        start: bridgeTopicEvent.at_seconds,
        duration: bridgeTopicEvent.duration_seconds,
        topic: resolvedTopic,
        questionCount: (bridgeTopicEvent.payload?.questionCount as number) || input.quiz.questions.length,
        badgeText: bridgeTopicEvent.payload?.badgeText as string | undefined,
        promptText:
          (bridgeTopicEvent.payload?.subtitle as string) ||
          (bridgeTopicEvent.payload?.promptText as string) ||
          undefined,
        visualStyle: bridgeTopicEvent.payload?.visualStyle as string | undefined,
        mascotAction: bridgeTopicEvent.payload?.mascotAction as string | undefined,
        aspectRatio,
        mascot: input.mascot,
        mascotConfig: input.mascotConfig,
        mediaMode: effectiveMediaMode,
        channelName,
        hasCustomLogo: input.brandIdentity?.hasCustomLogo ?? false,
        logoUrl: input.brandIdentity?.logoRelativeUrl,
        fallbackInitial:
          input.brandIdentity?.fallbackInitial ?? (channelName.trim().charAt(0).toUpperCase() || "★"),
        showcaseItems,
        assets: input.assets,
      }),
    );
  }

  const bridgeStingerEvent = events.find(
    (event) =>
      event.type === "transition.start" &&
      (event.payload?.instance_id === "bridge_topic_to_cta" ||
        event.payload?.transition_id === "brand_logo_stinger" ||
        event.event_id === "transition_bridge_topic_to_cta"),
  );

  const shouldRenderBridgeStinger = Boolean(bridgeStingerEvent || (bridgeTopicEvent && bridgeCtaEvent));

  if (shouldRenderBridgeStinger) {
    const channelName =
      input.brandIdentity?.channelName ||
      (bridgeCtaEvent?.payload?.channelName as string) ||
      (input.quiz as { quiz_config?: { channel_name?: string } }).quiz_config?.channel_name ||
      (input.quiz as { channel_name?: string }).channel_name ||
      "Channel";

    const stingerDuration = bridgeStingerEvent?.duration_seconds ?? 1.3;
    const stingerStart =
      bridgeStingerEvent?.at_seconds ??
      (bridgeCtaEvent ? Math.max(0, bridgeCtaEvent.at_seconds - 0.65) : 0);

    if (!bridgeStingerEvent) {
      events.push({
        event_id: "transition_bridge_topic_to_cta",
        question_id: null,
        choice_id: null,
        segment_id: null,
        type: "transition.start",
        at_seconds: stingerStart,
        duration_seconds: stingerDuration,
        payload: {
          intent: "stinger",
          transition_id: "brand_logo_stinger",
          instance_id: "bridge_topic_to_cta",
        },
      });

      const hasStingerWhoosh = events.some((e) => e.type === "sfx.play" && e.payload?.name === "stinger_whoosh");
      if (!hasStingerWhoosh) {
        events.push({
          event_id: "sfx_stinger_whoosh",
          type: "sfx.play",
          at_seconds: stingerStart,
          duration_seconds: 0.5,
          question_id: null,
          choice_id: null,
          segment_id: null,
          payload: { sound: "transition_fast", name: "stinger_whoosh", volume: 0.8 },
        });
      }

      const hasStingerImpact = events.some((e) => e.type === "sfx.play" && e.payload?.name === "stinger_logo_impact");
      if (!hasStingerImpact) {
        events.push({
          event_id: "sfx_stinger_logo_impact",
          type: "sfx.play",
          at_seconds: Math.round((stingerStart + stingerDuration * 0.45) * 100) / 100,
          duration_seconds: 0.5,
          question_id: null,
          choice_id: null,
          segment_id: null,
          payload: { sound: "correct_small", name: "stinger_logo_impact", volume: 0.75 },
        });
      }
    }

    clips.push(
      brandLogoStingerClip({
        start: stingerStart,
        duration: stingerDuration,
        channelName,
        hasCustomLogo: input.brandIdentity?.hasCustomLogo ?? false,
        logoUrl: input.brandIdentity?.logoRelativeUrl,
        fallbackInitial:
          input.brandIdentity?.fallbackInitial ?? (channelName.trim().charAt(0).toUpperCase() || "★"),
        aspectRatio,
        fromColor: firstQuestionPalette?.backgroundPrimary,
        toColor: firstQuestionPalette?.backgroundSecondary,
        accentColor: firstQuestionPalette?.accent,
        instanceId: (bridgeStingerEvent?.payload?.instance_id as string) ?? "bridge_topic_to_cta",
        showChannelName: false,
      }),
    );
  }

  if (bridgeCtaEvent) {
    const channelName =
      input.brandIdentity?.channelName ||
      (bridgeCtaEvent.payload?.channelName as string) ||
      (input.quiz as { quiz_config?: { channel_name?: string } }).quiz_config?.channel_name ||
      (input.quiz as { channel_name?: string }).channel_name ||
      "Channel";
    clips.push(
      bridgeSubscribeCtaClip({
        start: bridgeCtaEvent.at_seconds,
        duration: bridgeCtaEvent.duration_seconds,
        channelName,
        badgeText: bridgeCtaEvent.payload?.badgeText as string | undefined,
        headlineText:
          (bridgeCtaEvent.payload?.customText as string) ||
          (bridgeCtaEvent.payload?.headlineText as string) ||
          undefined,
        promptText: bridgeCtaEvent.payload?.promptText as string | undefined,
        ctaMode: (bridgeCtaEvent.payload?.ctaMode as "hero_action" | "classic") || "hero_action",
        minimalBranding: (bridgeCtaEvent.payload?.minimalBranding as boolean | undefined) ?? true,
        aspectRatio,
        mascot: input.mascot,
        mascotConfig: input.mascotConfig,
        mediaMode: effectiveMediaMode,
      }),
    );
  }

  const bridgeCtaToQuestionEvent = events.find(
    (event) =>
      event.type === "transition.start" &&
      (event.payload?.instance_id === "bridge_cta_to_question" ||
        event.payload?.transition_id === "energy_whip" ||
        event.event_id === "transition_bridge_cta_to_question"),
  );

  const shouldRenderCtaToQuestionStinger = Boolean(
    bridgeCtaToQuestionEvent || (bridgeCtaEvent && resolvedQuestions.length > 0),
  );

  if (shouldRenderCtaToQuestionStinger) {
    const ctaToQuestionDuration = bridgeCtaToQuestionEvent?.duration_seconds ?? 1.2;
    const ctaToQuestionStart =
      bridgeCtaToQuestionEvent?.at_seconds ??
      (bridgeCtaEvent ? Math.max(0, bridgeCtaEvent.at_seconds + bridgeCtaEvent.duration_seconds - 0.6) : 0);

    if (!bridgeCtaToQuestionEvent) {
      events.push({
        event_id: "transition_bridge_cta_to_question",
        question_id: null,
        choice_id: null,
        segment_id: null,
        type: "transition.start",
        at_seconds: ctaToQuestionStart,
        duration_seconds: ctaToQuestionDuration,
        payload: {
          intent: "stinger",
          transition_id: "energy_whip",
          instance_id: "bridge_cta_to_question",
        },
      });

      const hasWhipWhoosh = events.some((e) => e.type === "sfx.play" && e.payload?.name === "energy_whip_whoosh");
      if (!hasWhipWhoosh) {
        events.push({
          event_id: "sfx_energy_whip_whoosh",
          type: "sfx.play",
          at_seconds: ctaToQuestionStart,
          duration_seconds: 0.5,
          question_id: null,
          choice_id: null,
          segment_id: null,
          payload: { sound: "transition_fast", name: "energy_whip_whoosh", volume: 0.8 },
        });
      }
    }

    clips.push(
      energyWhipStingerClip({
        start: ctaToQuestionStart,
        duration: ctaToQuestionDuration,
        aspectRatio,
        instanceId: (bridgeCtaToQuestionEvent?.payload?.instance_id as string) ?? "bridge_cta_to_question",
        fromColor: firstQuestionPalette?.backgroundPrimary,
        toColor: firstQuestionPalette?.backgroundSecondary,
        accentColor: firstQuestionPalette?.accent,
      }),
    );
  }

  events.sort((a, b) => a.at_seconds - b.at_seconds);

  const timeline = buildCandyArcadeQuestionTimeline({
    quiz: input.quiz,
    resolvedQuestions,
    events,
    duration,
    outroStart: questionEndStart,
    mascot: input.mascot,
    mascotConfig: input.mascotConfig,
    chosenStyleId,
    snapshot,
    styleContext: input.styleContext,
    assets: input.assets,
    aspectRatio,
    copy,
    fps,
    canvas,
    customTransitionInstances: input.transitionInstances,
    mediaMode: effectiveMediaMode,
  });

  clips.push(...timeline.clips);
  Object.assign(transitionInstances, timeline.transitionInstances);

  const preOutroEvent = events.find(
    (event) => event.type === "pre_outro.enter" || event.segment_id === "pre_outro",
  );
  if (preOutroEvent) {
    clips.push(
      preOutroClip({
        start: preOutroEvent.at_seconds,
        duration: preOutroEvent.duration_seconds,
        headline: preOutroEvent.payload?.headline as string | undefined,
        aspectRatio,
      }),
    );
  }

  const outroClip = resolveCandyArcadeOutroClip({
    hasAudio: input.outroHasAudio,
    outroStart,
    duration,
    outroVideoPath: input.outroVideoPath,
    audioMode: input.audioMode,
    mascot: input.mascot,
    mascotConfig: input.mascotConfig,
    chosenStyleId,
    questionCount: input.quiz.questions.length,
    copy,
    aspectRatio,
    mediaMode: effectiveMediaMode,
    motionTemplateId: input.outroMotionTemplateId,
    motionTemplateOptions: input.outroMotionTemplateOptions,
    topic: resolvedTopic,
    channelName,
    brandLogoHtml,
  });
  if (outroClip) clips.push(outroClip);

  const preOutroToOutroEvent = events.find(
    (event) =>
      event.type === "transition.start" &&
      (event.payload?.instance_id === "pre_outro_to_outro" ||
        event.payload?.transition_id === "celebration_stinger" ||
        event.event_id === "transition_pre_outro_to_outro"),
  );

  if (preOutroEvent && outroClip) {
    const celebrationDuration = preOutroToOutroEvent?.duration_seconds ?? 2.0;
    const boundary = typeof outroStart === "number" ? outroStart : (preOutroEvent.at_seconds + preOutroEvent.duration_seconds);
    const halfDuration = celebrationDuration * 0.5;
    const celebrationStart = Math.max(0, Math.round((boundary - halfDuration) * 1000) / 1000);

    clips.push(
      celebrationStingerClip({
        start: celebrationStart,
        duration: celebrationDuration,
        aspectRatio,
        instanceId: (preOutroToOutroEvent?.payload?.instance_id as string) ?? "pre_outro_to_outro",
        fromColor: firstQuestionPalette?.accent ?? "#F59E0B",
        toColor: firstQuestionPalette?.backgroundPrimary ?? "#7C3AED",
        accentColor: "#FEF08A",
      }),
    );
  }

  const document = assembleCandyArcadeDocument({
    clips,
    canvas,
    aspectRatio,
    duration,
    fps,
    mascot: input.mascot
      ? { ...input.mascot, active_style_id: chosenStyleId ?? input.mascot.active_style_id }
      : null,
    usedBackgroundStyles,
    styleCatalogRevision: input.styleContext.styleCatalogRevision ?? undefined,
    audioPath: input.audioPath,
    narrationDurationSeconds: input.narrationDurationSeconds,
    premixedAudio: input.premixedAudio,
    events,
    assets: input.assets,
    bgmOptions: input.bgmOptions,
    episodeId: input.quiz.episode_id,
    introVideoPath: input.introVideoPath,
    outroVideoPath: input.outroVideoPath,
    firstStart: introEnd,
    outroStart,
  });

  return {
    html: document.html,
    files: document.files,
    transitionInstances,
    mascotAnimationSnapshot: snapshot,
  };
}
