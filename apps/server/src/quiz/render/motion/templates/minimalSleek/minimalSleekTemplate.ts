import type { MascotRenderAspectRatio, MotionTemplateOptions } from "@studio/shared";
import { esc } from "../../../candyArcade/candyArcadeSvg.js";
import { minimalSleekStyles } from "./minimalSleekStyles.js";

export interface MinimalSleekInput {
  topicTitle?: string;
  channelName?: string;
  startSeconds?: number;
  durationSeconds?: number;
  aspectRatio?: MascotRenderAspectRatio;
  options?: MotionTemplateOptions;
  mascotHtml?: string;
  brandLogoHtml?: string;
}

const DEFAULT_DURATION = 2.5;

/**
 * Renders the Minimal Sleek modern motion intro scene markup.
 */
export function renderMinimalSleekIntro(input: MinimalSleekInput = {}): string {
  const startAttr = input.startSeconds && input.startSeconds > 0 ? input.startSeconds.toFixed(3) : "0";
  const duration = Math.max(1.5, input.durationSeconds ?? DEFAULT_DURATION);
  const aspectRatio = input.aspectRatio ?? "16:9";
  const accentColor = input.options?.accentColor || "#6366F1";
  const tagText = input.options?.headlineText || input.channelName || "FEATURED QUIZ";
  const title = input.options?.subheadlineText || input.topicTitle || "GET READY";
  const showMascot = input.options?.showMascot !== false;

  const styles = minimalSleekStyles({ accentColor, aspectRatio });
  const mascotMarkup = showMascot && input.mascotHtml
    ? `<div class="sleek-mascot-slot">${input.mascotHtml}</div>`
    : "";
  const brandMarkup = input.brandLogoHtml
    ? `<div class="sleek-brand-slot">${input.brandLogoHtml}</div>`
    : "";

  return [
    `<section id="motion-intro-minimal-sleek" class="clip candy-scene motion-intro-scene" data-start="${startAttr}" data-duration="${duration.toFixed(3)}" data-track-index="0">`,
    `<style>${styles}</style>`,
    `<div class="motion-minimal-sleek">`,
    `  <div class="sleek-ambient-glow" aria-hidden="true"></div>`,
    `  <div class="sleek-card-container">`,
    `    <div class="sleek-tag">✦ ${esc(tagText)}</div>`,
    `    <h1 class="sleek-title">${esc(title)}</h1>`,
    `    ${brandMarkup}`,
    `  </div>`,
    `  ${mascotMarkup}`,
    `</div>`,
    `</section>`,
  ].join("\n");
}
