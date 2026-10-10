import type { QuizTimelineEvent } from "@studio/shared";
import { isBridgeBrandStingerEvent, isBridgeCtaToQuestionEvent } from "../../bridge/bridgeTransitionIds.js";
import { resolveQuestionPaletteAfter } from "./bridgeScenePalette.js";
import { brandLogoStingerClip, celebrationStingerClip, energyWhipStingerClip } from "./candyArcadeClips.js";
import { resolveBrandFallbackInitial, resolveBridgeChannelName, type EpisodeCompositionContext } from "./episodeCompositionContext.js";

type StingerWindow = { start: number; duration: number };

function pushStingerTransitionEvent(
  events: QuizTimelineEvent[],
  eventId: string,
  window: StingerWindow,
  transitionId: string,
  instanceId: string,
): void {
  events.push({
    event_id: eventId,
    question_id: null,
    choice_id: null,
    segment_id: null,
    type: "transition.start",
    at_seconds: window.start,
    duration_seconds: window.duration,
    payload: { intent: "stinger", transition_id: transitionId, instance_id: instanceId },
  });
}

type SfxSpec = { eventId: string; name: string; sound: string; atSeconds: number; volume: number };

/** Adds a sound effect unless the timeline already carries one with the same name. */
function pushSfxEventOnce(events: QuizTimelineEvent[], sfx: SfxSpec): void {
  if (events.some((event) => event.type === "sfx.play" && event.payload?.name === sfx.name)) return;
  events.push({
    event_id: sfx.eventId,
    type: "sfx.play",
    at_seconds: sfx.atSeconds,
    duration_seconds: 0.5,
    question_id: null,
    choice_id: null,
    segment_id: null,
    payload: { sound: sfx.sound, name: sfx.name, volume: sfx.volume },
  });
}

function scheduleSyntheticBrandStinger(events: QuizTimelineEvent[], window: StingerWindow): void {
  pushStingerTransitionEvent(events, "transition_bridge_topic_to_cta", window, "brand_logo_stinger", "bridge_topic_to_cta");
  pushSfxEventOnce(events, {
    eventId: "sfx_stinger_whoosh",
    name: "stinger_whoosh",
    sound: "transition_fast",
    atSeconds: window.start,
    volume: 0.8,
  });
  pushSfxEventOnce(events, {
    eventId: "sfx_stinger_logo_impact",
    name: "stinger_logo_impact",
    sound: "correct_small",
    atSeconds: Math.round((window.start + window.duration * 0.45) * 100) / 100,
    volume: 0.75,
  });
}

/** Brand logo stinger between the bridge topic and the subscribe CTA, synthesizing its events on legacy timelines. */
export function buildEpisodeBrandStingerClip(context: EpisodeCompositionContext): string | undefined {
  const { input, events, bridgeCtaEvent, firstQuestionPalette } = context;
  const stingerEvent = events.find(isBridgeBrandStingerEvent);
  if (!stingerEvent && !(context.bridgeTopicEvent && context.isLeadingBridgeCta)) return undefined;
  const channelName = resolveBridgeChannelName(input, bridgeCtaEvent);
  const window: StingerWindow = {
    duration: stingerEvent?.duration_seconds ?? 1.3,
    start: stingerEvent?.at_seconds ?? (bridgeCtaEvent ? Math.max(0, bridgeCtaEvent.at_seconds - 0.65) : 0),
  };
  if (!stingerEvent) scheduleSyntheticBrandStinger(events, window);
  return brandLogoStingerClip({
    start: window.start,
    duration: window.duration,
    channelName,
    hasCustomLogo: input.brandIdentity?.hasCustomLogo ?? false,
    logoUrl: input.brandIdentity?.logoRelativeUrl,
    fallbackInitial: resolveBrandFallbackInitial(input, channelName),
    aspectRatio: context.aspectRatio,
    fromColor: firstQuestionPalette?.backgroundPrimary,
    toColor: firstQuestionPalette?.backgroundSecondary,
    accentColor: firstQuestionPalette?.accent,
    instanceId: (stingerEvent?.payload?.instance_id as string) ?? "bridge_topic_to_cta",
    showChannelName: false,
  });
}

function scheduleSyntheticEnergyWhip(events: QuizTimelineEvent[], window: StingerWindow): void {
  pushStingerTransitionEvent(events, "transition_bridge_cta_to_question", window, "energy_whip", "bridge_cta_to_question");
  pushSfxEventOnce(events, {
    eventId: "sfx_energy_whip_whoosh",
    name: "energy_whip_whoosh",
    sound: "transition_fast",
    atSeconds: window.start,
    volume: 0.8,
  });
}

function resolveEnergyWhipWindow(context: EpisodeCompositionContext, whipEvent: QuizTimelineEvent | undefined): StingerWindow {
  const cta = context.bridgeCtaEvent;
  return {
    duration: whipEvent?.duration_seconds ?? 1.2,
    start: whipEvent?.at_seconds ?? (cta ? Math.max(0, cta.at_seconds + cta.duration_seconds - 0.6) : 0),
  };
}

/** Energy whip stinger from the subscribe CTA into the next question, synthesizing its events on legacy timelines. */
export function buildEpisodeEnergyWhipClip(context: EpisodeCompositionContext): string | undefined {
  const { events, bridgeCtaEvent, resolvedQuestions, firstQuestionPalette } = context;
  const whipEvent = events.find(isBridgeCtaToQuestionEvent);
  const palette = bridgeCtaEvent
    ? (resolveQuestionPaletteAfter(events, resolvedQuestions, bridgeCtaEvent.at_seconds) ?? firstQuestionPalette)
    : firstQuestionPalette;
  if (!whipEvent && !(bridgeCtaEvent && resolvedQuestions.length > 0)) return undefined;
  const window = resolveEnergyWhipWindow(context, whipEvent);
  if (!whipEvent) scheduleSyntheticEnergyWhip(events, window);
  return energyWhipStingerClip({
    start: window.start,
    duration: window.duration,
    aspectRatio: context.aspectRatio,
    instanceId: (whipEvent?.payload?.instance_id as string) ?? "bridge_cta_to_question",
    fromColor: palette?.backgroundPrimary,
    toColor: palette?.backgroundSecondary,
    accentColor: palette?.accent,
  });
}

function findPreOutroToOutroEvent(events: QuizTimelineEvent[]): QuizTimelineEvent | undefined {
  return events.find(
    (event) =>
      event.type === "transition.start" &&
      (event.payload?.instance_id === "pre_outro_to_outro" ||
        event.payload?.transition_id === "celebration_stinger" ||
        event.event_id === "transition_pre_outro_to_outro"),
  );
}

/** Celebration stinger centered on the pre-outro to outro boundary. */
export function buildEpisodeCelebrationClip(context: EpisodeCompositionContext, preOutroEvent: QuizTimelineEvent): string {
  const transitionEvent = findPreOutroToOutroEvent(context.events);
  const duration = transitionEvent?.duration_seconds ?? 2.0;
  const { outroStart, firstQuestionPalette } = context;
  const boundary = typeof outroStart === "number" ? outroStart : preOutroEvent.at_seconds + preOutroEvent.duration_seconds;
  return celebrationStingerClip({
    start: Math.max(0, Math.round((boundary - duration * 0.5) * 1000) / 1000),
    duration,
    aspectRatio: context.aspectRatio,
    instanceId: (transitionEvent?.payload?.instance_id as string) ?? "pre_outro_to_outro",
    fromColor: firstQuestionPalette?.accent ?? "#F59E0B",
    toColor: firstQuestionPalette?.backgroundPrimary ?? "#7C3AED",
    accentColor: "#FEF08A",
  });
}
