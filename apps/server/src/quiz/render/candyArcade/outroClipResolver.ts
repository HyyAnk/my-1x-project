import {
  resolveEffectiveMascotMediaMode,
  type ChannelMascotConfig,
  type MascotProfile,
  type MascotRenderAspectRatio,
  type MascotStateMediaMode,
  type MotionTemplateOptions,
} from "@studio/shared";
import { customOutroVideoClip } from "./customOutroVideoClip.js";
import { mascotElement, outroClip, type Copy } from "./candyArcadeClips.js";
import { adaptMascotForPhase } from "../productionMascotRenderer.js";
import { renderMotionOutroClip } from "../motion/index.js";

export type ResolveCandyArcadeOutroClipInput = {
  hasAudio?: boolean;
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
  mediaMode?: MascotStateMediaMode;
  motionTemplateId?: string;
  motionTemplateOptions?: MotionTemplateOptions;
  topic?: string;
  channelName?: string;
  brandLogoHtml?: string;
};

export function resolveCandyArcadeOutroClip(input: ResolveCandyArcadeOutroClipInput): string | undefined {
  if (typeof input.outroStart !== "number" || input.outroStart >= input.duration - 0.04) {
    return undefined;
  }

  if (input.outroVideoPath) {
    const hasAudio = input.hasAudio ?? input.audioMode !== "overlay_bgm";
    return customOutroVideoClip(input.outroVideoPath, input.outroStart, input.duration - input.outroStart, hasAudio);
  }

  const effectiveMode = resolveEffectiveMascotMediaMode(input.mascotConfig, input.mediaMode);
  const outroMascot = adaptMascotForPhase(input.mascot, "outro", input.chosenStyleId, effectiveMode);

  if (input.motionTemplateId) {
    const outroDuration = input.duration - input.outroStart;
    const mascotHtml = mascotElement(outroMascot, input.mascotConfig, "outro", {
      clipStartSeconds: 0,
      clipDurationSeconds: outroDuration,
      aspectRatio: input.aspectRatio,
      mediaMode: effectiveMode,
    });
    return renderMotionOutroClip(input.motionTemplateId, {
      topicTitle: input.topic,
      channelName: input.channelName,
      startSeconds: input.outroStart,
      durationSeconds: outroDuration,
      aspectRatio: input.aspectRatio,
      options: input.motionTemplateOptions,
      mascotHtml,
      brandLogoHtml: input.brandLogoHtml,
    });
  }

  return outroClip(input.outroStart, input.duration, input.questionCount, input.copy, outroMascot, input.mascotConfig, input.aspectRatio, effectiveMode);
}
