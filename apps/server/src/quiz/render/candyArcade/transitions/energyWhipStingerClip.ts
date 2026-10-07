import type { MascotRenderAspectRatio } from "@studio/shared";
import { escAttr } from "../candyArcadeSvg.js";

export interface EnergyWhipStingerClipInput {
  start: number;
  duration: number;
  aspectRatio?: MascotRenderAspectRatio;
  instanceId?: string;
  fromColor?: string;
  toColor?: string;
  accentColor?: string;
}

/**
 * Concept B: Arcade Energy Whip Stinger Transition (1.2s / 36 frames).
 * Pure kinetic motion with slanted dynamic slashes, speed lines, and apex flash burst.
 * Runs on overlay track index 1 across the Bridge CTA -> Question 1 boundary.
 */
export function energyWhipStingerClip(input: EnergyWhipStingerClipInput): string {
  const duration = Math.max(0.1, input.duration);
  const start = Math.max(0, input.start);
  const aspectRatio = input.aspectRatio ?? "16:9";
  const fromColor = input.fromColor || "#7C3AED";
  const toColor = input.toColor || "#EC4899";
  const accentColor = input.accentColor || "#FBBF24";

  const instanceId = input.instanceId ?? `bridge-whip-${Math.round(start * 1000)}`;

  return (
    `<section id="${escAttr(instanceId)}" ` +
    `class="clip candy-transition transition-energy-whip" ` +
    `data-start="${start.toFixed(3)}" ` +
    `data-duration="${duration.toFixed(3)}" ` +
    `data-track-index="1" ` +
    `data-aspect-ratio="${aspectRatio}" ` +
    `data-layout-ignore data-layout-allow-occlusion data-layout-allow-overflow ` +
    `style="--clip-start:0s;--whip-dur:${duration.toFixed(3)}s;--whip-from:${fromColor};--whip-to:${toColor};--whip-accent:${accentColor};">` +
      `<div class="energy-whip-backdrop" aria-hidden="true">` +
        `<div class="energy-whip-slash slash-primary"></div>` +
        `<div class="energy-whip-slash slash-secondary"></div>` +
        `<div class="energy-whip-slash slash-accent"></div>` +
        `<div class="energy-whip-speed-lines">` +
          `<span class="whip-line wl-1"></span>` +
          `<span class="whip-line wl-2"></span>` +
          `<span class="whip-line wl-3"></span>` +
          `<span class="whip-line wl-4"></span>` +
        `</div>` +
        `<div class="energy-whip-flash"></div>` +
        `<div class="energy-whip-spark-burst">` +
          `<span class="whip-spark ws-1">✦</span>` +
          `<span class="whip-spark ws-2">★</span>` +
          `<span class="whip-spark ws-3">✦</span>` +
          `<span class="whip-spark ws-4">✨</span>` +
        `</div>` +
      `</div>` +
    `</section>`
  );
}
