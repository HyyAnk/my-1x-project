import {
  resolveEffectiveMascotMediaMode,
  type ChannelMascotConfig,
  type IntroOutroTransitionType,
  type MascotProfile,
  type MascotRenderAspectRatio,
  type MascotStateMediaMode,
  type MotionTemplateOptions,
  type ResolvedTransitionInstance,
} from "@studio/shared";
import { INTRO_BOUNDARY_ID, resolveIntroBoundaryTransition } from "./introBoundaryTransition.js";
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
    const introTransitionType = input.transitionType ?? "stinger_swipe";
    const transition = resolveIntroBoundaryTransition({
      boundarySeconds: input.firstStart,
      transitionType: introTransitionType,
      transitionDurationSeconds: input.transitionDurationSeconds,
      transitionInstances: input.transitionInstances,
      fps: input.fps,
      canvas: input.canvas,
      palette: input.palette,
    });
    const hasAudio = input.hasAudio ?? input.audioMode !== "overlay_bgm";
    const clip = customIntroVideoClip(
      input.introVideoPath,
      input.firstStart,
      introTransitionType,
      hasAudio,
      input.transitionDurationSeconds,
      INTRO_BOUNDARY_ID,
      input.aspectRatio,
      transition.colors,
    );

    return {
      clip,
      transitionInstance: transition.instance ? { id: INTRO_BOUNDARY_ID, instance: transition.instance } : undefined,
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
    const clip = introClip(
      input.firstStart,
      input.questionCount,
      input.copy,
      introMascot,
      input.mascotConfig,
      input.aspectRatio,
      effectiveMode,
    );
    return { clip };
  }

  return {};
}
