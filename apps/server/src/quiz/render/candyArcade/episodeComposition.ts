import { QuizV2Schema } from "@studio/shared";
import type { CandyArcadeCompositionBundle, CandyArcadeCompositionInput } from "../candyArcadeComposition.js";
import { assembleCandyArcadeDocument } from "./candyArcadeAssetBundler.js";
import { buildCandyArcadeQuestionTimeline } from "./candyArcadeQuestionTimeline.js";
import {
  buildEpisodeBridgeTopicClip,
  buildEpisodeIntro,
  buildEpisodeOutroClip,
  buildEpisodePreOutroClip,
  buildEpisodeSubscribeCtaClip,
  findEpisodePreOutroEvent,
} from "./episodeCompositionBookends.js";
import { createEpisodeCompositionContext, type EpisodeCompositionContext } from "./episodeCompositionContext.js";
import { buildEpisodeBrandStingerClip, buildEpisodeCelebrationClip, buildEpisodeEnergyWhipClip } from "./episodeCompositionStingers.js";

function pushOptionalClip(clips: string[], clip: string | undefined): void {
  if (clip !== undefined) clips.push(clip);
}

function buildEpisodeQuestionTimeline(context: EpisodeCompositionContext) {
  const { input } = context;
  return buildCandyArcadeQuestionTimeline({
    quiz: input.quiz,
    resolvedQuestions: context.resolvedQuestions,
    events: context.events,
    duration: context.duration,
    outroStart: context.questionEndStart,
    mascot: input.mascot,
    mascotConfig: input.mascotConfig,
    chosenStyleId: context.chosenStyleId,
    snapshot: context.snapshot,
    styleContext: input.styleContext,
    assets: input.assets,
    aspectRatio: context.aspectRatio,
    copy: context.copy,
    fps: context.fps,
    canvas: context.canvas,
    customTransitionInstances: input.transitionInstances,
    mediaMode: context.effectiveMediaMode,
  });
}

/** Pre-outro, outro and the celebration stinger that bridges them. */
function appendEpisodeClosingClips(context: EpisodeCompositionContext, clips: string[]): void {
  const preOutroEvent = findEpisodePreOutroEvent(context);
  if (preOutroEvent) clips.push(buildEpisodePreOutroClip(context, preOutroEvent));
  const outroClip = buildEpisodeOutroClip(context);
  if (outroClip) clips.push(outroClip);
  if (preOutroEvent && outroClip) clips.push(buildEpisodeCelebrationClip(context, preOutroEvent));
}

function assembleEpisodeDocument(context: EpisodeCompositionContext, clips: string[]) {
  const { input, chosenStyleId } = context;
  return assembleCandyArcadeDocument({
    clips,
    canvas: context.canvas,
    aspectRatio: context.aspectRatio,
    duration: context.duration,
    fps: context.fps,
    mascot: input.mascot ? { ...input.mascot, active_style_id: chosenStyleId ?? input.mascot.active_style_id } : null,
    usedBackgroundStyles: new Set(context.resolvedQuestions.map(({ style }) => style.backgroundStyle)),
    styleCatalogRevision: input.styleContext.styleCatalogRevision ?? undefined,
    audioPath: input.audioPath,
    narrationDurationSeconds: input.narrationDurationSeconds,
    premixedAudio: input.premixedAudio,
    events: context.events,
    assets: input.assets,
    bgmOptions: input.bgmOptions,
    episodeId: input.quiz.episode_id,
    introVideoPath: input.introVideoPath,
    outroVideoPath: input.outroVideoPath,
    firstStart: context.introEnd,
    outroStart: context.outroStart,
  });
}

/** Builds the landscape Episode composition: intro, bridge scenes and stingers, questions, pre-outro and outro. */
export function buildEpisodeCompositionBundle(input: CandyArcadeCompositionInput): CandyArcadeCompositionBundle {
  QuizV2Schema.parse(input.quiz);
  const context = createEpisodeCompositionContext(input);
  const intro = buildEpisodeIntro(context);
  const clips = intro.clips;
  pushOptionalClip(clips, buildEpisodeBridgeTopicClip(context));
  pushOptionalClip(clips, buildEpisodeBrandStingerClip(context));
  pushOptionalClip(clips, buildEpisodeSubscribeCtaClip(context));
  pushOptionalClip(clips, buildEpisodeEnergyWhipClip(context));
  context.events.sort((a, b) => a.at_seconds - b.at_seconds);

  const timeline = buildEpisodeQuestionTimeline(context);
  clips.push(...timeline.clips);
  const transitionInstances = { ...intro.transitionInstances, ...timeline.transitionInstances };
  appendEpisodeClosingClips(context, clips);

  const document = assembleEpisodeDocument(context, clips);
  return {
    html: document.html,
    files: document.files,
    transitionInstances,
    mascotAnimationSnapshot: context.snapshot,
  };
}
