import type { MascotRenderAspectRatio } from "@studio/shared";
import { esc } from "./candyArcadeSvg.js";

export interface PreOutroClipInput {
  start: number;
  duration: number;
  headline?: string;
  subtext?: string;
  badgeText?: string;
  aspectRatio?: MascotRenderAspectRatio;
}

/**
 * Generates the Pre-Outro celebration clip markup.
 * Renders the celebratory "FANTASTIC JOB!" headline, floating iridescent bubbles,
 * fluttering colorful confetti, and animated sunburst rays without mascot.
 */
export function preOutroClip(input: PreOutroClipInput): string {
  const duration = Math.max(0.04, input.duration);
  const headline = esc(input.headline?.trim() || "FANTASTIC JOB!");
  const badgeText = esc(input.badgeText?.trim() || "🎉 QUIZ COMPLETE! 🎉");
  const subtext = esc(input.subtext?.trim() || "You crushed today's challenge!");

  return `<section id="candy-pre-outro" class="clip candy-scene candy-pre-outro-scene" style="--clip-start: 0s;" data-start="${input.start.toFixed(3)}" data-duration="${duration.toFixed(3)}" data-track-index="0">
  <div class="pre-outro-backdrop">
    <div class="pre-outro-rays"></div>
    <div class="pre-outro-halo"></div>
  </div>

  <div class="pre-outro-bubbles" data-layout-ignore aria-hidden="true">
    <div class="pre-outro-bubble bubble-1"></div>
    <div class="pre-outro-bubble bubble-2"></div>
    <div class="pre-outro-bubble bubble-3"></div>
    <div class="pre-outro-bubble bubble-4"></div>
    <div class="pre-outro-bubble bubble-5"></div>
    <div class="pre-outro-bubble bubble-6"></div>
    <div class="pre-outro-bubble bubble-7"></div>
    <div class="pre-outro-bubble bubble-8"></div>
  </div>

  <div class="pre-outro-confetti-wrap" data-layout-ignore aria-hidden="true">
    <div class="pre-outro-confetti c-gold confetti-1"></div>
    <div class="pre-outro-confetti c-pink confetti-2"></div>
    <div class="pre-outro-confetti c-cyan confetti-3"></div>
    <div class="pre-outro-confetti c-lime confetti-4"></div>
    <div class="pre-outro-confetti c-purple confetti-5"></div>
    <div class="pre-outro-confetti c-white confetti-6"></div>
    <div class="pre-outro-confetti c-gold confetti-7"></div>
    <div class="pre-outro-confetti c-pink confetti-8"></div>
    <div class="pre-outro-confetti c-cyan confetti-9"></div>
    <div class="pre-outro-confetti c-lime confetti-10"></div>
  </div>

  <div class="pre-outro-card">
    <div class="pre-outro-badge">${badgeText}</div>
    <h1 class="pre-outro-headline">${headline}</h1>
    <p class="pre-outro-subtext">${subtext}</p>
    <div class="pre-outro-sparkles" data-layout-ignore aria-hidden="true">✦&nbsp;&nbsp;★&nbsp;&nbsp;✦</div>
  </div>
</section>`;
}
