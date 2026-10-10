import {
  MASCOT_CANVAS_SIZES,
  resolveEffectiveMascotMediaMode,
  type MascotRenderAspectRatio,
  type MascotStateMediaMode,
  type QuizTimeline,
  type QuizTimelineEvent,
} from "@studio/shared";
import type { CandyArcadeCompositionInput } from "../candyArcadeComposition.js";
import { createMascotAnimationRenderSnapshot, type MascotAnimationRenderSnapshot } from "../productionMascotRenderer.js";
import { resolveCandyArcadeQuestions, type ResolvedCandyArcadeQuestion } from "./candyArcadeQuestionResolution.js";
import { escAttr } from "./candyArcadeSvg.js";
import { resolveChosenMascotStyleId } from "./mascotStyleSelection.js";
import { quizCopy } from "./quizCopy.js";

export type EpisodeQuestionPalette = ResolvedCandyArcadeQuestion["visual"]["palette"];

/** Everything the Episode bookends, stingers and assembly steps share; `events` is mutated as synthetic events are added. */
export type EpisodeCompositionContext = {
  input: CandyArcadeCompositionInput;
  aspectRatio: MascotRenderAspectRatio;
  canvas: (typeof MASCOT_CANVAS_SIZES)[MascotRenderAspectRatio];
  fps: number;
  duration: number;
  copy: ReturnType<typeof quizCopy>;
  resolvedQuestions: ResolvedCandyArcadeQuestion[];
  events: QuizTimelineEvent[];
  firstStart: number;
  outroStart: number | undefined;
  questionEndStart: number | undefined;
  chosenStyleId: ReturnType<typeof resolveChosenMascotStyleId>;
  snapshot: MascotAnimationRenderSnapshot;
  effectiveMediaMode: MascotStateMediaMode;
  bridgeTopicEvent: QuizTimelineEvent | undefined;
  bridgeCtaEvent: QuizTimelineEvent | undefined;
  isLeadingBridgeCta: boolean;
  introEnd: number;
  resolvedTopic: string;
  channelName: string;
  brandLogoHtml: string | undefined;
  firstQuestionPalette: EpisodeQuestionPalette | undefined;
};

type QuizChannelFields = { quiz_config?: { channel_name?: string }; channel_name?: string };

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

function resolveEpisodeTopic(input: CandyArcadeCompositionInput, bridgeTopicEvent: QuizTimelineEvent | undefined): string {
  const topicPayload = bridgeTopicEvent?.payload?.topic as string | undefined;
  const isGenericTopic = topicPayload === "Today's Quiz" || topicPayload === "Today's Challenge";
  return (
    input.topic?.trim() ||
    (topicPayload && !isGenericTopic ? topicPayload : undefined) ||
    (input.quiz as { topic?: { title?: string } }).topic?.title ||
    topicPayload ||
    "Today's Challenge"
  );
}

function quizChannelName(input: CandyArcadeCompositionInput): string | undefined {
  const quiz = input.quiz as QuizChannelFields;
  return quiz.quiz_config?.channel_name || quiz.channel_name;
}

/** Channel name shown on the bookends; prefers the explicit input override. */
function resolveEpisodeChannelName(input: CandyArcadeCompositionInput, bridgeCtaEvent: QuizTimelineEvent | undefined): string {
  return (
    input.channelName ||
    input.brandIdentity?.channelName ||
    (bridgeCtaEvent?.payload?.channelName as string) ||
    quizChannelName(input) ||
    "Quiz"
  );
}

/** Channel name shown on the bridge stinger and subscribe CTA; ignores the explicit input override. */
export function resolveBridgeChannelName(input: CandyArcadeCompositionInput, bridgeCtaEvent: QuizTimelineEvent | undefined): string {
  return input.brandIdentity?.channelName || (bridgeCtaEvent?.payload?.channelName as string) || quizChannelName(input) || "Channel";
}

export function resolveBrandFallbackInitial(input: CandyArcadeCompositionInput, channelName: string): string {
  return input.brandIdentity?.fallbackInitial ?? (channelName.trim().charAt(0).toUpperCase() || "★");
}

function resolveBrandLogoHtml(input: CandyArcadeCompositionInput): string | undefined {
  const brandIdentity = input.brandIdentity;
  if (!brandIdentity?.hasCustomLogo || !brandIdentity.logoRelativeUrl) return undefined;
  return `<img src="${escAttr(brandIdentity.logoRelativeUrl)}" alt="Logo" class="motion-brand-logo" />`;
}

function resolveIntroEnd(
  bridgeTopicEvent: QuizTimelineEvent | undefined,
  bridgeCtaEvent: QuizTimelineEvent | undefined,
  firstStart: number,
) {
  // Legacy timelines placed the CTA before question 1; current ones play it mid-roll.
  const isLeadingBridgeCta = Boolean(bridgeCtaEvent && bridgeCtaEvent.at_seconds <= firstStart);
  const introEnd = bridgeTopicEvent?.at_seconds ?? (isLeadingBridgeCta ? bridgeCtaEvent?.at_seconds : undefined) ?? firstStart;
  return { isLeadingBridgeCta, introEnd };
}

export function createEpisodeCompositionContext(input: CandyArcadeCompositionInput): EpisodeCompositionContext {
  const aspectRatio = input.aspectRatio ?? "16:9";
  const resolvedQuestions = resolveCandyArcadeQuestions({
    quiz: input.quiz,
    director: input.director,
    styleContext: input.styleContext,
    aspectRatio,
  });
  const events = [...input.timeline.events];
  const timing = resolveFirstAndOutroTiming(events, input.quiz.questions[0]?.id);
  const bridgeTopicEvent = events.find((event) => event.type === "bridge.topic.enter");
  const bridgeCtaEvent = events.find((event) => event.type === "bridge.cta.enter");
  return {
    input,
    aspectRatio,
    canvas: MASCOT_CANVAS_SIZES[aspectRatio],
    fps: input.fps ?? 30,
    duration: Math.max(3, input.narrationDurationSeconds, input.timeline.duration_seconds),
    copy: quizCopy(input.quiz.language),
    resolvedQuestions,
    events,
    ...timing,
    chosenStyleId: resolveChosenMascotStyleId(input),
    snapshot: input.mascotAnimationSnapshot ?? createMascotAnimationRenderSnapshot(input.quiz.episode_id || "default_video"),
    effectiveMediaMode: resolveEffectiveMascotMediaMode(input.mascotConfig, input.mascotMediaMode),
    bridgeTopicEvent,
    bridgeCtaEvent,
    ...resolveIntroEnd(bridgeTopicEvent, bridgeCtaEvent, timing.firstStart),
    resolvedTopic: resolveEpisodeTopic(input, bridgeTopicEvent),
    channelName: resolveEpisodeChannelName(input, bridgeCtaEvent),
    brandLogoHtml: resolveBrandLogoHtml(input),
    firstQuestionPalette: resolvedQuestions[0]?.visual.palette,
  };
}
