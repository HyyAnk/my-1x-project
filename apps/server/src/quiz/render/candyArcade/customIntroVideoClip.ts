import { getTransitionDefinition, type MascotRenderAspectRatio } from "@studio/shared";
import { renderUploadedVideoElements } from "./uploadedVideoElements.js";
import {
  calculateIntroTransitionTiming,
  renderIntroTransitionOverlay,
  resolveTransitionDefinition,
  type IntroTransitionColors,
  type TransitionWithMarkup,
} from "./introVideoTransition.js";

/**
 * Renders custom intro video clip with transition overlay.
 */
export function customIntroVideoClip(
  videoPath: string,
  durationSeconds: number,
  transitionType = "stinger_swipe",
  hasAudioOrDuration: boolean | number = true,
  transitionDurationSeconds?: number,
  instanceId?: string,
  aspectRatio: MascotRenderAspectRatio = "16:9",
  colors?: IntroTransitionColors,
): string {
  if (durationSeconds < 0.08) return "";

  let hasAudio = true;
  let targetDuration = transitionDurationSeconds;
  if (typeof hasAudioOrDuration === "boolean") {
    hasAudio = hasAudioOrDuration;
  } else if (typeof hasAudioOrDuration === "number") {
    targetDuration = hasAudioOrDuration;
  }

  let def: TransitionWithMarkup | undefined;
  try {
    def = getTransitionDefinition(transitionType) as unknown as TransitionWithMarkup;
  } catch {
    def = resolveTransitionDefinition(transitionType);
  }
  const { transitionStart, transitionDuration } = calculateIntroTransitionTiming(durationSeconds, transitionType, targetDuration);
  const transitionHtml = renderIntroTransitionOverlay(transitionType, transitionStart, transitionDuration, def, instanceId, aspectRatio, colors);

  const media = renderUploadedVideoElements({ placement: "intro", videoPath, durationSeconds, hasAudio });
  return `<section id="custom-intro" class="clip candy-scene custom-intro-scene" data-start="0" data-duration="${durationSeconds.toFixed(3)}" data-track-index="0">${media}${transitionHtml}</section>`;
}
