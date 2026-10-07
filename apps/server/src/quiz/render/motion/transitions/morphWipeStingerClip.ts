import type { MascotRenderAspectRatio } from "@studio/shared";
import { escAttr } from "../../candyArcade/candyArcadeSvg.js";

export interface MorphWipeStingerClipInput {
  start: number;
  duration: number;
  aspectRatio?: MascotRenderAspectRatio;
  instanceId?: string;
  fromColor?: string;
  toColor?: string;
}

/**
 * Renders an SVG/CSS geometric aperture morphing wipe stinger transition clip.
 * Runs on overlay track index 1 across scene boundaries.
 */
export function morphWipeStingerClip(input: MorphWipeStingerClipInput): string {
  const duration = Math.max(0.1, input.duration);
  const start = Math.max(0, input.start);
  const aspectRatio = input.aspectRatio ?? "16:9";
  const fromColor = input.fromColor || "#7C3AED";
  const toColor = input.toColor || "#EC4899";
  const instanceId = input.instanceId ?? `morph-wipe-${Math.round(start * 1000)}`;

  return (
    `<section id="${escAttr(instanceId)}" ` +
    `class="clip candy-transition transition-morph-wipe" ` +
    `data-start="${start.toFixed(3)}" ` +
    `data-duration="${duration.toFixed(3)}" ` +
    `data-track-index="1" ` +
    `data-aspect-ratio="${aspectRatio}" ` +
    `data-layout-ignore data-layout-allow-occlusion data-layout-allow-overflow ` +
    `style="--clip-start:0s;--trans-dur:${duration.toFixed(3)}s;--trans-from-color:${fromColor};--trans-to-color:${toColor};">` +
      `<div class="morph-wipe-aperture" aria-hidden="true"></div>` +
      `<div class="morph-wipe-flash" aria-hidden="true"></div>` +
    `</section>`
  );
}
