import type { MascotRenderAspectRatio, MotionTemplateOptions } from "@studio/shared";
import { esc } from "../../../candyArcade/candyArcadeSvg.js";
import { scorecardRecapStyles } from "./scorecardRecapStyles.js";

export interface ScorecardRecapInput {
  topicTitle?: string;
  channelName?: string;
  startSeconds?: number;
  durationSeconds?: number;
  aspectRatio?: MascotRenderAspectRatio;
  options?: MotionTemplateOptions;
  mascotHtml?: string;
  brandLogoHtml?: string;
}

const DEFAULT_DURATION = 4.0;

/**
 * Renders the Scorecard Recap dynamic motion outro scene markup.
 */
export function renderScorecardRecapOutro(input: ScorecardRecapInput = {}): string {
  const startAttr = input.startSeconds && input.startSeconds > 0 ? input.startSeconds.toFixed(3) : "0";
  const duration = Math.max(2.0, input.durationSeconds ?? DEFAULT_DURATION);
  const aspectRatio = input.aspectRatio ?? "16:9";
  const accentColor = input.options?.accentColor || "#FFD700";
  const headline = input.options?.headlineText || "HOW MANY DID YOU GET?";
  const subtext = input.options?.subheadlineText || "COMMENT YOUR SCORE BELOW";
  const ctaPillText = input.channelName ? `Subscribe to ${input.channelName}` : "Play more quizzes every day!";
  const showMascot = input.options?.showMascot !== false;

  const styles = scorecardRecapStyles({ accentColor, aspectRatio });
  const mascotMarkup = showMascot && input.mascotHtml
    ? `<div class="scorecard-mascot-slot">${input.mascotHtml}</div>`
    : "";
  const brandMarkup = input.brandLogoHtml
    ? `<div class="scorecard-brand-slot">${input.brandLogoHtml}</div>`
    : "";

  return [
    `<section id="motion-outro-scorecard-recap" class="clip candy-scene motion-outro-scene" data-start="${startAttr}" data-duration="${duration.toFixed(3)}" data-track-index="0">`,
    `<style>${styles}</style>`,
    `<div class="motion-scorecard-recap">`,
    `  <div class="scorecard-confetti-layer" aria-hidden="true"></div>`,
    `  <div class="scorecard-trophy-badge">🏆</div>`,
    `  <div class="scorecard-board">`,
    `    <h1 class="scorecard-headline">${esc(headline)}</h1>`,
    `    <div class="scorecard-subtext">${esc(subtext)}</div>`,
    `    <div class="scorecard-cta-pill">${esc(ctaPillText)}</div>`,
    `    ${brandMarkup}`,
    `  </div>`,
    `  ${mascotMarkup}`,
    `</div>`,
    `</section>`,
  ].join("\n");
}
