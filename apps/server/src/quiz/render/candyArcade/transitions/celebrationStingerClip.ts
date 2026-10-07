import type { MascotRenderAspectRatio } from "@studio/shared";
import { escAttr } from "../candyArcadeSvg.js";

export interface CelebrationStingerClipInput {
  start: number;
  duration: number;
  aspectRatio?: MascotRenderAspectRatio;
  instanceId?: string;
  fromColor?: string;
  toColor?: string;
  accentColor?: string;
}

/**
 * Celebration Stinger Transition (~2.0s / 60 frames).
 * High-energy golden and regal violet multi-ribbon sweep with luminous apex flash burst
 * and celebratory star sparkles bridging the Pre-Outro celebration and Outro stage.
 * Runs on overlay track index 1 across the transition boundary.
 */
export function celebrationStingerClip(input: CelebrationStingerClipInput): string {
  const duration = Math.max(0.1, input.duration);
  const start = Math.max(0, input.start);
  const aspectRatio = input.aspectRatio ?? "16:9";
  const fromColor = input.fromColor || "#F59E0B";
  const toColor = input.toColor || "#7C3AED";
  const accentColor = input.accentColor || "#FEF08A";

  const instanceId = input.instanceId ?? `celebration-stinger-${Math.round(start * 1000)}`;

  return (
    `<section id="${escAttr(instanceId)}" ` +
    `class="clip candy-transition transition-celebration-stinger" ` +
    `data-start="${start.toFixed(3)}" ` +
    `data-duration="${duration.toFixed(3)}" ` +
    `data-track-index="1" ` +
    `data-aspect-ratio="${aspectRatio}" ` +
    `data-layout-ignore data-layout-allow-occlusion data-layout-allow-overflow ` +
    `style="--clip-start:0s;--celebration-dur:${duration.toFixed(3)}s;--celebration-gold:${fromColor};--celebration-violet:${toColor};--celebration-accent:${accentColor};">` +
      `<div class="celebration-stinger-backdrop" aria-hidden="true">` +
        `<div class="celebration-ribbon ribbon-gold-primary"></div>` +
        `<div class="celebration-ribbon ribbon-violet-secondary"></div>` +
        `<div class="celebration-ribbon ribbon-gold-accent"></div>` +
        `<div class="celebration-flash-burst"></div>` +
        `<div class="celebration-star-badge">★</div>` +
        `<div class="celebration-sparkle-cluster">` +
          `<span class="celebration-sparkle csp-1">✦</span>` +
          `<span class="celebration-sparkle csp-2">★</span>` +
          `<span class="celebration-sparkle csp-3">✦</span>` +
          `<span class="celebration-sparkle csp-4">✨</span>` +
          `<span class="celebration-sparkle csp-5">✦</span>` +
          `<span class="celebration-sparkle csp-6">★</span>` +
        `</div>` +
      `</div>` +
    `</section>`
  );
}
