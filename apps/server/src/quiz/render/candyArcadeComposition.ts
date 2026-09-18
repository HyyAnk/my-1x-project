import {
  QuizV2Schema,
  type ChannelMascotConfig,
  type DirectorPlan,
  type MascotProfile,
  type QuizTimeline,
  type QuizV2,
  type MascotRenderAspectRatio,
  type IntroOutroTransitionType,
  type ResolvedTransitionInstance,
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
import { assetFor, buildBgmClips, buildSfxClips, sfxSource, source } from "./candyArcade/candyArcadeAudio.js";
import {
  introClip,
  outroClip,
  customIntroVideoClip,
  customOutroVideoClip,
  questionClip,
  quizCopy,
  subCompositionMount,
  toSubComposition,
  transitionClip,
  mascotElement,
} from "./candyArcade/candyArcadeClips.js";
import { renderChannelBrandMark } from "./candyArcade/channelBrandMark.js";
import { createMascotAnimationRenderSnapshot, type MascotAnimationRenderSnapshot } from "./productionMascotRenderer.js";
import type { QuizRenderStyleContext } from "./quizRenderStyleContext.js";
import { resolveCandyArcadeIntroClip, resolveCandyArcadeOutroClip } from "./candyArcade/candyArcadeTransitionResolver.js";
import { buildCandyArcadeQuestionTimeline } from "./candyArcade/candyArcadeQuestionTimeline.js";
import { assembleCandyArcadeDocument } from "./candyArcade/candyArcadeAssetBundler.js";

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
  mascotAnimationSnapshot?: MascotAnimationRenderSnapshot;
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
  const outroStart = events.find(
    (event) => event.segment_id === "outro" || (event.type === "narration.segment" && event.segment_id === "outro"),
  )?.at_seconds;
  return { firstStart, outroStart };
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

  const events = input.timeline.events;
  const { firstStart, outroStart } = resolveFirstAndOutroTiming(events, input.quiz.questions[0]?.id);
  const chosenStyleId = resolveChosenMascotStyleId(input);
  const snapshot = input.mascotAnimationSnapshot ?? createMascotAnimationRenderSnapshot(input.quiz.episode_id || "default_video");

  const intro = resolveCandyArcadeIntroClip({
    introVideoPath: input.introVideoPath,
    firstStart,
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
  });

  const transitionInstances: Record<string, ResolvedTransitionInstance> = intro.transitionInstance
    ? { [intro.transitionInstance.id]: intro.transitionInstance.instance }
    : {};
  const clips: string[] = intro.clip ? [intro.clip] : [];

  const timeline = buildCandyArcadeQuestionTimeline({
    quiz: input.quiz,
    resolvedQuestions,
    events,
    duration,
    outroStart,
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
  });

  clips.push(...timeline.clips);
  Object.assign(transitionInstances, timeline.transitionInstances);

  const outroClip = resolveCandyArcadeOutroClip({
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
  });
  if (outroClip) clips.push(outroClip);

  const document = assembleCandyArcadeDocument({
    clips,
    canvas,
    aspectRatio,
    duration,
    fps,
    mascot: input.mascot,
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
    firstStart,
    outroStart,
  });

  return {
    html: document.html,
    files: document.files,
    transitionInstances,
    mascotAnimationSnapshot: snapshot,
  };
}
