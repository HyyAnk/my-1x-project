import {
  resolveEffectiveMascotMediaMode,
  resolveTransitionInstance,
  type ChannelMascotConfig,
  type IntroOutroTransitionType,
  type MascotProfile,
  type MascotRenderAspectRatio,
  type MascotStateMediaMode,
  type MotionTemplateOptions,
  type ResolvedTransitionInstance,
} from "@studio/shared";
import { calculateIntroTransitionTiming } from "./introVideoTransition.js";
import { customIntroVideoClip } from "./customIntroVideoClip.js";
import { introClip, mascotElement, type Copy } from "./candyArcadeClips.js";
import { adaptMascotForPhase } from "../productionMascotRenderer.js";
import { renderMotionIntroClip } from "../motion/index.js";

export type ResolveCandyArcadeIntroClipInput = {
  hasAudio?: boolean;
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
  palette?: {
    accent?: string;
    backgroundPrimary?: string;
    text?: string;
  };
  mediaMode?: MascotStateMediaMode;
  motionTemplateId?: string;
  motionTemplateOptions?: MotionTemplateOptions;
  topic?: string;
  channelName?: string;
  brandLogoHtml?: string;
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

    const fromColor = input.palette?.accent ?? "#F59E0B";
    const toColor = input.palette?.backgroundPrimary ?? "#EF4444";
    const inkColor = input.palette?.text ?? "#FFFFFF";
    const colors = { fromColor, toColor, inkColor };

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
              fromColor,
              toColor,
              inkColor,
            },
          );
      } catch {
        // Uncataloged or legacy intro transition type
      }
    }

    const hasAudio = input.hasAudio ?? input.audioMode !== "overlay_bgm";
    const clip = customIntroVideoClip(
      input.introVideoPath,
      input.firstStart,
      introTransitionType,
      hasAudio,
      input.transitionDurationSeconds,
      introBoundaryId,
      input.aspectRatio,
      colors,
    );

    return {
      clip,
      transitionInstance: resolvedIntroInstance ? { id: introBoundaryId, instance: resolvedIntroInstance } : undefined,
    };
  }

  if (input.motionTemplateId && input.firstStart > 0.04) {
    const effectiveMode = resolveEffectiveMascotMediaMode(input.mascotConfig, input.mediaMode);
    const introMascot = adaptMascotForPhase(input.mascot, "intro", input.chosenStyleId, effectiveMode);
    const mascotHtml = mascotElement(introMascot, input.mascotConfig, "intro", {
      clipStartSeconds: 0,
      clipDurationSeconds: input.firstStart,
      aspectRatio: input.aspectRatio,
      mediaMode: effectiveMode,
    });
    const clip = renderMotionIntroClip(input.motionTemplateId, {
      topicTitle: input.topic,
      channelName: input.channelName,
      startSeconds: 0,
      durationSeconds: input.firstStart,
      aspectRatio: input.aspectRatio,
      options: input.motionTemplateOptions,
      mascotHtml,
      brandLogoHtml: input.brandLogoHtml,
    });
    return { clip };
  }

  if (input.firstStart > 0.04) {
    const effectiveMode = resolveEffectiveMascotMediaMode(input.mascotConfig, input.mediaMode);
    const introMascot = adaptMascotForPhase(input.mascot, "intro", input.chosenStyleId, effectiveMode);
    const clip = introClip(input.firstStart, input.questionCount, input.copy, introMascot, input.mascotConfig, input.aspectRatio, effectiveMode);
    return { clip };
  }

  return {};
}
