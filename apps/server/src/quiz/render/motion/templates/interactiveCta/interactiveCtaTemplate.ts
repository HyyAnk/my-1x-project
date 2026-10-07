import type { MascotRenderAspectRatio, MotionTemplateOptions } from "@studio/shared";
import { esc } from "../../../candyArcade/candyArcadeSvg.js";
import { interactiveCtaStyles } from "./interactiveCtaStyles.js";

export interface InteractiveCtaInput {
  topicTitle?: string;
  channelName?: string;
  startSeconds?: number;
  durationSeconds?: number;
  aspectRatio?: MascotRenderAspectRatio;
  options?: MotionTemplateOptions;
  mascotHtml?: string;
  brandLogoHtml?: string;
}

const DEFAULT_DURATION = 3.5;

/**
 * Renders the Interactive CTA dynamic motion outro scene markup.
 */
export function renderInteractiveCtaOutro(input: InteractiveCtaInput = {}): string {
  const startAttr = input.startSeconds && input.startSeconds > 0 ? input.startSeconds.toFixed(3) : "0";
  const duration = Math.max(2.0, input.durationSeconds ?? DEFAULT_DURATION);
  const aspectRatio = input.aspectRatio ?? "16:9";
  const accentColor = input.options?.accentColor || "#FF0033";
  const bubbleText = input.options?.headlineText || "THANKS FOR PLAYING!";
  const buttonText = input.options?.subheadlineText || "SUBSCRIBE FOR MORE";
  const subtext = input.channelName ? `Join the ${input.channelName} community!` : "New quiz challenge tomorrow!";
  const showMascot = input.options?.showMascot !== false;

  const styles = interactiveCtaStyles({ accentColor, aspectRatio });
  const mascotMarkup = showMascot && input.mascotHtml
    ? `<div class="cta-mascot-slot">${input.mascotHtml}</div>`
    : "";
  const brandMarkup = input.brandLogoHtml
    ? `<div class="cta-brand-slot">${input.brandLogoHtml}</div>`
    : "";

  return [
    `<section id="motion-outro-interactive-cta" class="clip candy-scene motion-outro-scene" data-start="${startAttr}" data-duration="${duration.toFixed(3)}" data-track-index="0" style="--cta-duration:${duration.toFixed(3)}s;">`,
    `<style>${styles}</style>`,
    `<div class="motion-interactive-cta">`,
    `  <div class="cta-glow-pulse" aria-hidden="true"></div>`,
    `  <div class="cta-container">`,
    `    <div class="cta-speech-bubble">${esc(bubbleText)}</div>`,
    `    <div class="cta-button">`,
    `      <span class="cta-bell-icon">🔔</span>`,
    `      <span>${esc(buttonText)}</span>`,
    `    </div>`,
    `    <p class="cta-subtext">${esc(subtext)}</p>`,
    `    ${brandMarkup}`,
    `  </div>`,
    `  ${mascotMarkup}`,
    `  <div class="cta-progress-track" aria-hidden="true">`,
    `    <div class="cta-progress-fill"></div>`,
    `  </div>`,
    `</div>`,
    `</section>`,
  ].join("\n");
}
