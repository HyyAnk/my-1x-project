import type { BridgeSceneConfig, VoicePlan } from "@studio/shared";
import { TimelineContext, round } from "./timelineContext.js";
import { BRIDGE_CTA_TO_QUESTION_INSTANCE_ID } from "../../bridge/bridgeTransitionIds.js";
import { MID_ROLL_CTA_SEGMENT_ROLE } from "../../bridge/midRollCta.js";

export type CompileMidRollCtaOptions = {
  bridgeConfig?: BridgeSceneConfig;
  channelName?: string;
  hasNextQuestion: boolean;
};

/** Delay before the CTA voice so the preceding question's outgoing wipe can clear first. */
const CTA_VOICE_LEAD_IN_SECONDS = 0.4;
/** The energy whip reaches full-screen occlusion at this offset, where the next question cuts in. */
const ENERGY_WHIP_CUT_OFFSET_SECONDS = 0.55;
const ENERGY_WHIP_DURATION_SECONDS = 1.2;

function resolveCtaParams(options: CompileMidRollCtaOptions) {
  const bridgeConfig = options.bridgeConfig;
  const legacyBridge = bridgeConfig as { ctaPauseSeconds?: number } | undefined;

  let ctaPause = bridgeConfig?.timing?.ctaPauseSeconds ?? legacyBridge?.ctaPauseSeconds ?? 0.5;
  if (ctaPause === 2.0 || ctaPause === 0.9) {
    ctaPause = 0.5;
  }

  return {
    ctaPause,
    ctaMode: bridgeConfig?.ctaMode ?? "hero_action",
    channelName: options.channelName || "Felix",
    customCtaText: bridgeConfig?.customCtaText,
  };
}

function addCtaSfx(ctx: TimelineContext, ctaStart: number, segmentId: string): void {
  const cues = [
    { offset: 1.4, duration: 0.35, sound: "ui_pop", name: "subscribe_click", volume: 0.7 },
    { offset: 2.2, duration: 0.6, sound: "correct_small", name: "bell_ding", volume: 0.65 },
    { offset: 2.6, duration: 0.8, sound: "streak", name: "celebration_burst", volume: 0.6 },
  ];
  for (const cue of cues) {
    ctx.add({
      type: "sfx.play",
      at_seconds: round(ctaStart + cue.offset),
      duration_seconds: cue.duration,
      question_id: null,
      choice_id: null,
      segment_id: segmentId,
      payload: { sound: cue.sound, name: cue.name, volume: cue.volume },
    });
  }
}

function addEnergyWhipTransition(ctx: TimelineContext, transitionStart: number): void {
  const baseEvent = { question_id: null, choice_id: null, segment_id: null } as const;
  ctx.add({
    ...baseEvent,
    type: "transition.start",
    at_seconds: transitionStart,
    duration_seconds: ENERGY_WHIP_DURATION_SECONDS,
    payload: { intent: "stinger", transition_id: "energy_whip", instance_id: BRIDGE_CTA_TO_QUESTION_INSTANCE_ID },
  });
  ctx.add({
    ...baseEvent,
    type: "sfx.play",
    at_seconds: transitionStart,
    duration_seconds: 0.5,
    payload: { sound: "transition_fast", name: "energy_whip_whoosh", volume: 0.8 },
  });
  ctx.add({
    ...baseEvent,
    type: "sfx.play",
    at_seconds: round(transitionStart + ENERGY_WHIP_CUT_OFFSET_SECONDS),
    duration_seconds: 0.5,
    payload: { sound: "correct_small", name: "energy_whip_impact", volume: 0.75 },
  });
}

/**
 * Compiles the subscribe CTA scene as a mid-roll interstitial between two questions. It starts where the
 * previous question's outgoing transition hands over, and exits through an energy whip into the next question.
 */
export function compileMidRollCtaStage(ctx: TimelineContext, voicePlan: VoicePlan, options: CompileMidRollCtaOptions): void {
  const ctaSegment = voicePlan.segments.find((segment) => segment.role === MID_ROLL_CTA_SEGMENT_ROLE);
  if (!ctaSegment) return;

  const ctaStart = ctx.cursor;
  const ctaVoiceStart = round(ctaStart + CTA_VOICE_LEAD_IN_SECONDS);
  const { ctaPause, ctaMode, channelName, customCtaText } = resolveCtaParams(options);
  const ctaDuration = ctx.scheduleNarration(ctaSegment.segment_id, ctaVoiceStart, ctaSegment.text, null);
  const transitionStart = round(ctaVoiceStart + ctaDuration + ctaPause);
  const ctaEnd = options.hasNextQuestion ? round(transitionStart + ENERGY_WHIP_CUT_OFFSET_SECONDS) : transitionStart;

  ctx.add({
    type: "bridge.cta.enter",
    at_seconds: ctaStart,
    duration_seconds: round(ctaEnd - ctaStart),
    question_id: null,
    choice_id: null,
    segment_id: ctaSegment.segment_id,
    payload: { channelName, buttonState: "idle", hasBell: true, ctaMode, customText: customCtaText, placement: "mid_roll" },
  });
  addCtaSfx(ctx, ctaStart, ctaSegment.segment_id);
  ctx.add({
    type: "mascot.state",
    at_seconds: ctaStart,
    duration_seconds: 0,
    question_id: null,
    choice_id: null,
    segment_id: ctaSegment.segment_id,
    payload: { state: "cheer", phase: "mid_roll_cta" },
  });

  if (options.hasNextQuestion) {
    addEnergyWhipTransition(ctx, transitionStart);
  }
  ctx.cursor = ctaEnd;
}
