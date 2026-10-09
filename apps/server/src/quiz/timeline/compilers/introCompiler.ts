import type { BridgeSceneConfig, DirectorPlan, VoicePlan } from "@studio/shared";
import { TimelineContext, round } from "./timelineContext.js";
import { BRIDGE_TOPIC_TO_QUESTION_INSTANCE_ID } from "../../bridge/bridgeTransitionIds.js";

export type CompileIntroOptions = {
  bridgeConfig?: BridgeSceneConfig;
  topic?: string;
  questionCount?: number;
  topicPauseSeconds?: number;
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
      instance_id: BRIDGE_TOPIC_TO_QUESTION_INSTANCE_ID,
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
  hasNextScene: boolean,
  options?: CompileIntroOptions,
): void {
  const topicStart = ctx.cursor;
  const { topicPause, badgeText, subtitle, visualStyle, mascotAction, stingerDuration, transitionType } =
    resolveBridgeTopicParams(options);

  const topicDuration = ctx.scheduleNarration(topicSegment.segment_id, topicStart, topicSegment.text, null);
  const transitionOverlap = hasNextScene ? round(stingerDuration * 0.5) : 0;
  const totalSceneDuration = hasNextScene
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

  if (hasNextScene) {
    const transitionStart = round(topicStart + topicDuration + topicPause);
    addBridgeStingerTransition(ctx, transitionStart, stingerDuration, transitionType);
  }

  ctx.cursor = round(topicStart + totalSceneDuration);
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

  // The subscribe CTA no longer follows the topic card; it plays mid-roll (see midRollCtaCompiler).
  const topicSegment = voicePlan.segments.find((segment) => segment.role === "intro_topic");
  if (topicSegment) {
    const hasFirstQuestion = (options?.questionCount ?? 1) > 0;
    compileBridgeTopicSegment(ctx, director, topicSegment, hasFirstQuestion, options);
  }
}
