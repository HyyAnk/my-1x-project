import type { MascotRenderAspectRatio } from "@studio/shared";
import { escAttr } from "../../candyArcade/candyArcadeSvg.js";

export interface EnergySlashStingerClipInput {
  start: number;
  duration: number;
  aspectRatio?: MascotRenderAspectRatio;
  instanceId?: string;
  fromColor?: string;
  toColor?: string;
}

/**
 * Renders a chromatic aberration high-speed energy blade slash stinger clip.
 * Runs on overlay track index 1 across scene boundaries.
 */
export function energySlashStingerClip(input: EnergySlashStingerClipInput): string {
  const duration = Math.max(0.1, input.duration);
  const start = Math.max(0, input.start);
  const aspectRatio = input.aspectRatio ?? "16:9";
  const fromColor = input.fromColor || "#EC4899";
  const toColor = input.toColor || "#7C3AED";
  const instanceId = input.instanceId ?? `energy-slash-${Math.round(start * 1000)}`;

  return (
    `<section id="${escAttr(instanceId)}" ` +
    `class="clip candy-transition transition-energy-slash" ` +
    `data-start="${start.toFixed(3)}" ` +
    `data-duration="${duration.toFixed(3)}" ` +
    `data-track-index="1" ` +
    `data-aspect-ratio="${aspectRatio}" ` +
    `data-layout-ignore data-layout-allow-occlusion data-layout-allow-overflow ` +
    `style="--clip-start:0s;--trans-dur:${duration.toFixed(3)}s;--trans-from-color:${fromColor};--trans-to-color:${toColor};">` +
      `<div class="energy-slash-blade blade-cyan" aria-hidden="true"></div>` +
      `<div class="energy-slash-blade blade-magenta" aria-hidden="true"></div>` +
      `<div class="energy-slash-burst" aria-hidden="true"></div>` +
    `</section>`
  );
}
