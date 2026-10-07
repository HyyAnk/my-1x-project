import type { MascotRenderAspectRatio, MotionTemplateOptions } from "@studio/shared";
import { esc } from "../../../candyArcade/candyArcadeSvg.js";
import { kineticPunchStyles } from "./kineticPunchStyles.js";

export interface KineticPunchInput {
  topicTitle?: string;
  channelName?: string;
  startSeconds?: number;
  durationSeconds?: number;
  aspectRatio?: MascotRenderAspectRatio;
  options?: MotionTemplateOptions;
  mascotHtml?: string;
  brandLogoHtml?: string;
}

const DEFAULT_DURATION = 2.6;

/**
 * Renders the Kinetic Punch dynamic motion intro scene markup.
 */
export function renderKineticPunchIntro(input: KineticPunchInput = {}): string {
  const startAttr = input.startSeconds && input.startSeconds > 0 ? input.startSeconds.toFixed(3) : "0";
  const duration = Math.max(1.5, input.durationSeconds ?? DEFAULT_DURATION);
  const aspectRatio = input.aspectRatio ?? "16:9";
  const accentColor = input.options?.accentColor || "#FF007F";
  const kicker = input.options?.headlineText || input.channelName || "QUIZ TIME";
  const title = input.options?.subheadlineText || input.topicTitle || "READY TO PLAY?";
  const showMascot = input.options?.showMascot !== false;

  const styles = kineticPunchStyles({ accentColor, aspectRatio });
  const mascotMarkup = showMascot && input.mascotHtml
    ? `<div class="punch-mascot-slot">${input.mascotHtml}</div>`
    : "";
  const brandMarkup = input.brandLogoHtml
    ? `<div class="punch-brand-slot">${input.brandLogoHtml}</div>`
    : "";

  return [
    `<section id="motion-intro-kinetic-punch" class="clip candy-scene motion-intro-scene" data-start="${startAttr}" data-duration="${duration.toFixed(3)}" data-track-index="0">`,
    `<style>${styles}</style>`,
    `<div class="motion-kinetic-punch">`,
    `  <div class="punch-bg-radial" aria-hidden="true"></div>`,
    `  <div class="punch-shockwave" aria-hidden="true"></div>`,
    `  <div class="punch-content">`,
    `    <div class="punch-kicker">${esc(kicker)}</div>`,
    `    <h1 class="punch-headline">${esc(title)}</h1>`,
    `    ${brandMarkup}`,
    `  </div>`,
    `  ${mascotMarkup}`,
    `</div>`,
    `</section>`,
  ].join("\n");
}
