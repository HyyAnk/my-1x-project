import { getTransitionDefinition, type ResolvedTransitionInstance } from "@studio/shared";
import type { QuizPalette } from "../../visual/types.js";

export type RenderTransitionClipContext = {
  visual: {
    palette: QuizPalette;
    transitionId: string;
  };
  nextPalette: QuizPalette;
  fps?: number;
};

/**
 * Emits timed HTML markup for a transition clip from an already-resolved instance.
 */
export function renderResolvedTransitionClip(
  instance: ResolvedTransitionInstance,
  context: RenderTransitionClipContext,
): string {
  if (instance.id === "cut" || instance.durationFrames === 0) {
    return "";
  }

  const definition = getTransitionDefinition(instance.id);
  const fps = instance.fps.numerator / instance.fps.denominator;
  const startSeconds = instance.startFrame / fps;
  const durationSeconds = instance.durationFrames / fps;

  const markup = definition.renderMarkup({
    instanceId: instance.instanceId,
    placement: instance.placement,
    fps: instance.fps,
    startFrame: instance.startFrame,
    boundaryFrame: instance.boundaryFrame,
    availableEndFrameExclusive: instance.endFrameExclusive,
    width: 1920,
    height: 1080,
    fromColor: context.visual.palette.accent,
    toColor: context.nextPalette.backgroundPrimary,
    inkColor: context.visual.palette.text,
  });

  const styleAttr = [
    `--from:${context.visual.palette.accent}`,
    `--to:${context.nextPalette.backgroundPrimary}`,
    `--ink:${context.visual.palette.text}`,
    `--clip-start:${startSeconds.toFixed(3)}s`,
    `--trans-start:0s`,
    `--trans-dur:${durationSeconds.toFixed(3)}s`,
  ].join(";");

  return `<section id="candy-transition-${Math.round(startSeconds * 1000)}" class="clip candy-transition transition-${instance.id}" data-transition-instance="${instance.instanceId}" data-layout-ignore data-layout-allow-occlusion data-layout-allow-overflow style="${styleAttr}" data-start="${startSeconds.toFixed(3)}" data-duration="${durationSeconds.toFixed(3)}" data-track-index="1">${markup}</section>`;
}
