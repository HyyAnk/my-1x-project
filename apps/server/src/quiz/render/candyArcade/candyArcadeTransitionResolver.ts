import {
  type ChannelMascotConfig,
  type IntroOutroTransitionType,
  type MascotProfile,
  type MascotRenderAspectRatio,
  type QuizTimelineEvent,
  type ResolvedTransitionInstance,
  resolveTransitionInstance,
} from "@studio/shared";
import type { QuizTemplateScene } from "../../visual/types.js";
import { calculateIntroTransitionTiming } from "./customVideoClips.js";
import { customIntroVideoClip, customOutroVideoClip, introClip, outroClip, transitionClip, type Copy } from "./candyArcadeClips.js";
import { adaptMascotForPhase } from "../productionMascotRenderer.js";

export type ResolveCandyArcadeIntroClipInput = {
  introVideoPath?: string;
  firstStart: number;
  transitionType?: IntroOutroTransitionType;
  transitionDurationSeconds?: number;
  transitionInstances?: Record<string, ResolvedTransitionInstance>;
  fps: number;
  canvas: { width: number; height: number };
  audioMode?: "use_video_audio" | "overlay_bgm";
  aspectRatio: MascotRenderAspectRatio;
  questionCount: number;
  copy: Copy;
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
  chosenStyleId?: string | null;
};

export type ResolveCandyArcadeIntroClipResult = {
  clip?: string;
  transitionInstance?: {
    id: string;
    instance: ResolvedTransitionInstance;
  };
};

export function resolveCandyArcadeIntroClip(input: ResolveCandyArcadeIntroClipInput): ResolveCandyArcadeIntroClipResult {
  if (input.introVideoPath && input.firstStart > 0.04) {
    const introBoundaryId = "intro";
    const introTransitionType = input.transitionType ?? "stinger_swipe";
    const timing = calculateIntroTransitionTiming(input.firstStart, introTransitionType, input.transitionDurationSeconds);
    const startFrames = Math.round(timing.transitionStart * input.fps);
    const boundaryFrame = Math.round(input.firstStart * input.fps);
    const endFramesExclusive = boundaryFrame + Math.max(1, Math.round(timing.transitionDuration * input.fps));

    let resolvedIntroInstance: ResolvedTransitionInstance | undefined;
    if (introTransitionType !== "cut") {
      try {
        resolvedIntroInstance =
          input.transitionInstances?.[introBoundaryId] ??
          resolveTransitionInstance(
            { id: introTransitionType, durationSeconds: timing.transitionDuration },
            {
              instanceId: introBoundaryId,
              placement: "intro",
              fps: { numerator: input.fps, denominator: 1 },
              startFrame: startFrames,
              boundaryFrame,
              availableEndFrameExclusive: endFramesExclusive,
              width: input.canvas.width,
              height: input.canvas.height,
              fromColor: "#000000",
              toColor: "#000000",
              inkColor: "#ffffff",
            },
          );
      } catch {
        // Uncataloged or legacy intro transition type
      }
    }

    const hasAudio = input.audioMode !== "overlay_bgm";
    const clip = customIntroVideoClip(
      input.introVideoPath,
      input.firstStart,
      introTransitionType,
      hasAudio,
      input.transitionDurationSeconds,
      introBoundaryId,
      input.aspectRatio,
    );

    return {
      clip,
      transitionInstance: resolvedIntroInstance ? { id: introBoundaryId, instance: resolvedIntroInstance } : undefined,
    };
  }

  if (input.firstStart > 0.04) {
    const introMascot = adaptMascotForPhase(input.mascot, "intro", input.chosenStyleId);
    const clip = introClip(input.firstStart, input.questionCount, input.copy, introMascot, input.mascotConfig, input.aspectRatio);
    return { clip };
  }

  return {};
}

export type ResolveCandyArcadeOutroClipInput = {
  outroStart?: number;
  duration: number;
  outroVideoPath?: string;
  audioMode?: "use_video_audio" | "overlay_bgm";
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
  chosenStyleId?: string | null;
  questionCount: number;
  copy: Copy;
  aspectRatio: MascotRenderAspectRatio;
};

export function resolveCandyArcadeOutroClip(input: ResolveCandyArcadeOutroClipInput): string | undefined {
  if (typeof input.outroStart !== "number" || input.outroStart >= input.duration - 0.04) {
    return undefined;
  }

  if (input.outroVideoPath) {
    const hasAudio = input.audioMode !== "overlay_bgm";
    return customOutroVideoClip(input.outroVideoPath, input.outroStart, input.duration - input.outroStart, hasAudio);
  }

  const outroMascot = adaptMascotForPhase(input.mascot, "outro", input.chosenStyleId);
  return outroClip(input.outroStart, input.duration, input.questionCount, input.copy, outroMascot, input.mascotConfig, input.aspectRatio);
}

export type ResolveCandyArcadeSceneTransitionInput = {
  transition: QuizTimelineEvent;
  questionId: string;
  visual: QuizTemplateScene;
  nextPalette: QuizTemplateScene["palette"];
  fps: number;
  canvas: { width: number; height: number };
  customTransitionInstances?: Record<string, ResolvedTransitionInstance>;
};

export type ResolveCandyArcadeSceneTransitionResult = {
  boundaryId: string;
  instance: ResolvedTransitionInstance;
  clip: string;
};

export function resolveCandyArcadeSceneTransition(input: ResolveCandyArcadeSceneTransitionInput): ResolveCandyArcadeSceneTransitionResult {
  const { transition, questionId, visual, nextPalette, fps, canvas, customTransitionInstances } = input;
  const boundaryId = (transition.payload?.instance_id as string | undefined) ?? questionId;
  const startFrames = Math.round(transition.at_seconds * fps);
  const durationFrames = Math.round(transition.duration_seconds * fps);
  const endFramesExclusive = startFrames + Math.max(1, durationFrames);
  const boundaryFrame = Math.round((transition.at_seconds + transition.duration_seconds * 0.5) * fps);

  const resolvedInstance =
    customTransitionInstances?.[boundaryId] ??
    resolveTransitionInstance(
      {
        id: visual.transitionId,
        durationSeconds: transition.duration_seconds,
      },
      {
        instanceId: boundaryId,
        placement: "scene",
        fps: { numerator: fps, denominator: 1 },
        startFrame: startFrames,
        boundaryFrame: Math.min(endFramesExclusive - 1, Math.max(startFrames, boundaryFrame)),
        availableEndFrameExclusive: endFramesExclusive,
        width: canvas.width,
        height: canvas.height,
        fromColor: visual.palette.accent,
        toColor: nextPalette.backgroundPrimary,
        inkColor: visual.palette.text,
      },
    );

  const clip = transitionClip({
    start: transition.at_seconds,
    end: transition.at_seconds + transition.duration_seconds,
    visual,
    nextPalette,
    instanceId: boundaryId,
    instance: resolvedInstance,
  });

  return {
    boundaryId,
    instance: resolvedInstance,
    clip,
  };
}
