import {
  resolveEffectiveMascotMediaMode,
  type ChannelMascotConfig,
  type MascotProfile,
  type MascotRenderAspectRatio,
  type MascotStateMediaMode,
} from "@studio/shared";
import { customOutroVideoClip } from "./customOutroVideoClip.js";
import { outroClip, type Copy } from "./candyArcadeClips.js";
import { adaptMascotForPhase } from "../productionMascotRenderer.js";

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
  return outroClip(input.outroStart, input.duration, input.questionCount, input.copy, outroMascot, input.mascotConfig, input.aspectRatio, effectiveMode);
}
