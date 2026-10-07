import type { BridgeSceneConfig, DirectorPlan, VoicePlan } from "@studio/shared";
import { TimelineContext, round } from "./timelineContext.js";

export type CompileIntroOptions = {
  bridgeConfig?: BridgeSceneConfig;
  channelName?: string;
  topic?: string;
  questionCount?: number;
  topicPauseSeconds?: number;
  ctaPauseSeconds?: number;
  stingerDurationSeconds?: number;
  transitionType?: string;
  badgeText?: string;
  subtitle?: string;
  visualStyle?: string;
  mascotAction?: string;
};

function resolveBridgeTopicParams(options?: CompileIntroOptions) {
  const bridgeConfig = options?.bridgeConfig;
  const timing = bridgeConfig?.timing;
  const legacyBridge = bridgeConfig as { topicPauseSeconds?: number } | undefined;

  return {
    topicPause: options?.topicPauseSeconds ?? timing?.topicPauseSeconds ?? legacyBridge?.topicPauseSeconds ?? 0.5,
    badgeText: options?.badgeText ?? bridgeConfig?.customBadgeText,
    subtitle: options?.subtitle ?? bridgeConfig?.customSubtitleText,
    visualStyle: options?.visualStyle ?? bridgeConfig?.visualStyle ?? "arcade_pop",
    mascotAction: options?.mascotAction ?? "wave",
    stingerDuration: options?.stingerDurationSeconds ?? timing?.stingerDurationSeconds ?? 1.3,
    transitionType: options?.transitionType ?? timing?.transitionType ?? "brand_logo_stinger",
  };
}

function addBridgeTopicSfx(
  ctx: TimelineContext,
  topicStart: number,
  segmentId: string,
  options?: CompileIntroOptions,
): void {
  ctx.add({
    type: "sfx.play",
    at_seconds: topicStart,
    duration_seconds: 0.5,
    question_id: null,
    choice_id: null,
    segment_id: segmentId,
    payload: { sound: "transition_fast", name: "scene_entrance" },
  });

  const showcaseItems = options?.bridgeConfig?.showcaseItems;
  const itemCount = showcaseItems && showcaseItems.length > 0 ? Math.min(showcaseItems.length, 4) : 0;

  if (itemCount > 0) {
    const popOffsets = [0.30, 0.42, 0.54, 0.66];
    for (let i = 0; i < itemCount; i++) {
      const item = showcaseItems![i];
      ctx.add({
        type: "sfx.play",
        at_seconds: round(topicStart + popOffsets[i]),
        duration_seconds: 0.35,
        question_id: null,
        choice_id: null,
        segment_id: segmentId,
        payload: {
          sound: "ui_pop",
          name: `showcase_item_pop_${i + 1}`,
          volume: 0.7,
          ...(item?.subject ? { target_item: item.subject } : {}),
        },
      });
    }
  } else {
    ctx.add({
      type: "sfx.play",
      at_seconds: round(topicStart + 0.28),
      duration_seconds: 0.35,
      question_id: null,
      choice_id: null,
      segment_id: segmentId,
      payload: { sound: "ui_pop", name: "count_sticker_bounce" },
    });
  }

  ctx.add({
    type: "sfx.play",
    at_seconds: round(topicStart + 0.7),
    duration_seconds: 0.6,
    question_id: null,
    choice_id: null,
    segment_id: segmentId,
    payload: { sound: "correct_small", name: "topic_sparkle" },
  });
}

function addBridgeStingerTransition(
  ctx: TimelineContext,
  transitionStart: number,
  stingerDuration: number,
  transitionType: string,
): void {
  ctx.add({
    type: "transition.start",
    at_seconds: transitionStart,
    duration_seconds: stingerDuration,
    question_id: null,
    choice_id: null,
    segment_id: null,
    payload: {
      intent: "stinger",
      transition_id: transitionType,
      instance_id: "bridge_topic_to_cta",
    },
  });

  ctx.add({
    type: "sfx.play",
    at_seconds: transitionStart,
    duration_seconds: 0.5,
    question_id: null,
    choice_id: null,
    segment_id: null,
    payload: { sound: "transition_fast", name: "stinger_whoosh", volume: 0.8 },
  });

  const centerPeakOffset = round(stingerDuration * 0.45);
  ctx.add({
    type: "sfx.play",
    at_seconds: round(transitionStart + centerPeakOffset),
    duration_seconds: 0.5,
    question_id: null,
    choice_id: null,
    segment_id: null,
    payload: { sound: "correct_small", name: "stinger_logo_impact", volume: 0.75 },
  });
}

function compileBridgeTopicSegment(
  ctx: TimelineContext,
  director: DirectorPlan,
  topicSegment: VoicePlan["segments"][number],
  hasNextBridgeScene: boolean,
  options?: CompileIntroOptions,
): void {
  const topicStart = ctx.cursor;
  const { topicPause, badgeText, subtitle, visualStyle, mascotAction, stingerDuration, transitionType } =
    resolveBridgeTopicParams(options);

  const topicDuration = ctx.scheduleNarration(topicSegment.segment_id, topicStart, topicSegment.text, null);
  const transitionOverlap = hasNextBridgeScene ? round(stingerDuration * 0.5) : 0;
  const totalSceneDuration = hasNextBridgeScene
    ? round(topicDuration + topicPause + transitionOverlap)
    : round(topicDuration + topicPause);

  ctx.add({
    type: "bridge.topic.enter",
    at_seconds: topicStart,
    duration_seconds: totalSceneDuration,
    question_id: null,
    choice_id: null,
    segment_id: topicSegment.segment_id,
    payload: {
      topic: options?.topic || "Today's Quiz",
      questionCount: options?.questionCount ?? 8,
      theme: director.archetype_family,
      ...(badgeText ? { badgeText } : {}),
      ...(subtitle ? { subtitle } : {}),
      ...(visualStyle ? { visualStyle } : {}),
      ...(mascotAction ? { mascotAction } : {}),
      ...(options?.bridgeConfig?.enableShowcase !== undefined ? { enableShowcase: options.bridgeConfig.enableShowcase } : {}),
      ...(options?.bridgeConfig?.showcaseItems ? { showcaseItems: options.bridgeConfig.showcaseItems } : {}),
    },
  });

  addBridgeTopicSfx(ctx, topicStart, topicSegment.segment_id, options);

  ctx.add({
    type: "mascot.state",
    at_seconds: topicStart,
    duration_seconds: 0,
    question_id: null,
    choice_id: null,
    segment_id: topicSegment.segment_id,
    payload: {
      state: mascotAction,
      phase: "intro",
    },
  });

  if (hasNextBridgeScene) {
    const transitionStart = round(topicStart + topicDuration + topicPause);
    addBridgeStingerTransition(ctx, transitionStart, stingerDuration, transitionType);
  }

  ctx.cursor = round(topicStart + totalSceneDuration);
}

function resolveBridgeCtaParams(options?: CompileIntroOptions) {
  const bridgeConfig = options?.bridgeConfig;
  const timing = bridgeConfig?.timing;
  const legacyBridge = bridgeConfig as { ctaPauseSeconds?: number } | undefined;

  let ctaPause = options?.ctaPauseSeconds ?? timing?.ctaPauseSeconds ?? legacyBridge?.ctaPauseSeconds ?? 0.5;
  if (options?.ctaPauseSeconds === undefined && (ctaPause === 2.0 || ctaPause === 0.9)) {
    ctaPause = 0.5;
  }

  return {
    ctaPause,
    ctaMode: bridgeConfig?.ctaMode ?? "hero_action",
    channelName: options?.channelName || "Felix",
    customCtaText: bridgeConfig?.customCtaText,
  };
}

function addBridgeCtaSfx(
  ctx: TimelineContext,
  ctaStart: number,
  segmentId: string,
  hasPrecedingTopicScene: boolean,
): void {
  if (!hasPrecedingTopicScene) {
    ctx.add({
      type: "sfx.play",
      at_seconds: ctaStart,
      duration_seconds: 0.5,
      question_id: null,
      choice_id: null,
      segment_id: segmentId,
      payload: { sound: "transition_fast", name: "cta_entrance", volume: 0.65 },
    });
  }

  ctx.add({
    type: "sfx.play",
    at_seconds: round(ctaStart + 1.4),
    duration_seconds: 0.35,
    question_id: null,
    choice_id: null,
    segment_id: segmentId,
    payload: { sound: "ui_pop", name: "subscribe_click", volume: 0.7 },
  });

  ctx.add({
    type: "sfx.play",
    at_seconds: round(ctaStart + 2.2),
    duration_seconds: 0.6,
    question_id: null,
    choice_id: null,
    segment_id: segmentId,
    payload: { sound: "correct_small", name: "bell_ding", volume: 0.65 },
  });

  ctx.add({
    type: "sfx.play",
    at_seconds: round(ctaStart + 2.6),
    duration_seconds: 0.8,
    question_id: null,
    choice_id: null,
    segment_id: segmentId,
    payload: { sound: "streak", name: "celebration_burst", volume: 0.6 },
  });
}

function addBridgeEnergyWhipTransition(ctx: TimelineContext, transitionStart: number): void {
  const whipDuration = 1.2;
  ctx.add({
    type: "transition.start",
    at_seconds: transitionStart,
    duration_seconds: whipDuration,
    question_id: null,
    choice_id: null,
    segment_id: null,
    payload: {
      intent: "stinger",
      transition_id: "energy_whip",
      instance_id: "bridge_cta_to_question",
    },
  });

  ctx.add({
    type: "sfx.play",
    at_seconds: transitionStart,
    duration_seconds: 0.5,
    question_id: null,
    choice_id: null,
    segment_id: null,
    payload: { sound: "transition_fast", name: "energy_whip_whoosh", volume: 0.8 },
  });

  ctx.add({
    type: "sfx.play",
    at_seconds: round(transitionStart + 0.55),
    duration_seconds: 0.5,
    question_id: null,
    choice_id: null,
    segment_id: null,
    payload: { sound: "correct_small", name: "energy_whip_impact", volume: 0.75 },
  });
}

function compileBridgeCtaSegment(
  ctx: TimelineContext,
  ctaSegment: VoicePlan["segments"][number],
  hasPrecedingTopicScene: boolean,
  options?: CompileIntroOptions,
): void {
  const ctaStart = ctx.cursor;
  const ctaVoiceStart = hasPrecedingTopicScene ? round(ctaStart + 0.4) : ctaStart;
  const { ctaPause, ctaMode, channelName, customCtaText } = resolveBridgeCtaParams(options);
  const ctaDuration = ctx.scheduleNarration(ctaSegment.segment_id, ctaVoiceStart, ctaSegment.text, null);
  const ctaVoiceEnd = round(ctaVoiceStart + ctaDuration);

  const hasNextQuestion = (options?.questionCount ?? 1) > 0;
  // Transition starts strictly after the post-narration delay (default 0.5s after voice completes)
  const transitionStart = round(ctaVoiceEnd + ctaPause);
  // Energy whip transition reaches apex full-screen occlusion at +0.55s, cutting to Question 1
  const transitionCutOffset = hasNextQuestion ? 0.55 : 0;
  const ctaEnd = hasNextQuestion ? round(transitionStart + transitionCutOffset) : transitionStart;
  const totalSceneDuration = round(ctaEnd - ctaStart);

  ctx.add({
    type: "bridge.cta.enter",
    at_seconds: ctaStart,
    duration_seconds: totalSceneDuration,
    question_id: null,
    choice_id: null,
    segment_id: ctaSegment.segment_id,
    payload: {
      channelName,
      buttonState: "idle",
      hasBell: true,
      ctaMode,
      customText: customCtaText,
    },
  });

  addBridgeCtaSfx(ctx, ctaStart, ctaSegment.segment_id, hasPrecedingTopicScene);

  ctx.add({
    type: "mascot.state",
    at_seconds: ctaStart,
    duration_seconds: 0,
    question_id: null,
    choice_id: null,
    segment_id: ctaSegment.segment_id,
    payload: {
      state: "cheer",
      phase: "intro",
    },
  });

  if (hasNextQuestion) {
    addBridgeEnergyWhipTransition(ctx, transitionStart);
  }

  ctx.cursor = ctaEnd;
}

export function compileIntroStage(
  ctx: TimelineContext,
  director: DirectorPlan,
  voicePlan: VoicePlan,
  introDuration?: number,
  options?: CompileIntroOptions,
): void {
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

  if (introDuration !== undefined) {
    ctx.cursor = round(introDuration);
  } else {
    const introDurationSec = intro ? ctx.scheduleNarration(intro.segment_id, ctx.cursor, intro.text, null) : 0;
    ctx.cursor = round(Math.max(ctx.policy.intro_minimum_seconds, introDurationSec));
  }
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

  const topicSegment = voicePlan.segments.find((segment) => segment.role === "intro_topic");
  const ctaSegment = voicePlan.segments.find((segment) => segment.role === "intro_cta");

  if (topicSegment) {
    compileBridgeTopicSegment(ctx, director, topicSegment, Boolean(ctaSegment), options);
  }

  if (ctaSegment) {
    compileBridgeCtaSegment(ctx, ctaSegment, Boolean(topicSegment), options);
  }
}
