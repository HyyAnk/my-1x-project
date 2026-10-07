import type { MascotRenderAspectRatio, MotionTemplateOptions } from "@studio/shared";
import { esc } from "../../../candyArcade/candyArcadeSvg.js";
import { cyberNeonStyles } from "./cyberNeonStyles.js";

export interface CyberNeonInput {
  topicTitle?: string;
  channelName?: string;
  startSeconds?: number;
  durationSeconds?: number;
  aspectRatio?: MascotRenderAspectRatio;
  options?: MotionTemplateOptions;
  mascotHtml?: string;
  brandLogoHtml?: string;
}

const DEFAULT_DURATION = 3.0;

/**
 * Renders the Cyber Neon dynamic arcade motion intro scene markup.
 */
export function renderCyberNeonIntro(input: CyberNeonInput = {}): string {
  const startAttr = input.startSeconds && input.startSeconds > 0 ? input.startSeconds.toFixed(3) : "0";
  const duration = Math.max(1.5, input.durationSeconds ?? DEFAULT_DURATION);
  const aspectRatio = input.aspectRatio ?? "16:9";
  const cyan = (input.options?.customParameters?.primaryColor as string) || "#00FFFF";
  const magenta = input.options?.accentColor || "#FF007F";
  const badgeText = input.options?.headlineText || input.channelName || "INSERT COIN";
  const title = input.options?.subheadlineText || input.topicTitle || "CYBER QUIZ";
  const showMascot = input.options?.showMascot !== false;

  const styles = cyberNeonStyles({ primaryColor: cyan, accentColor: magenta, aspectRatio });
  const mascotMarkup = showMascot && input.mascotHtml
    ? `<div class="cyber-mascot-slot">${input.mascotHtml}</div>`
    : "";
  const brandMarkup = input.brandLogoHtml
    ? `<div class="cyber-brand-slot">${input.brandLogoHtml}</div>`
    : "";

  return [
    `<section id="motion-intro-cyber-neon" class="clip candy-scene motion-intro-scene" data-start="${startAttr}" data-duration="${duration.toFixed(3)}" data-track-index="0">`,
    `<style>${styles}</style>`,
    `<div class="motion-cyber-neon">`,
    `  <div class="cyber-grid-floor" aria-hidden="true"></div>`,
    `  <div class="cyber-horizon-glow" aria-hidden="true"></div>`,
    `  <div class="cyber-scanlines" aria-hidden="true"></div>`,
    `  <div class="cyber-content">`,
    `    <div class="cyber-badge">${esc(badgeText)}</div>`,
    `    <h1 class="cyber-title">${esc(title)}</h1>`,
    `    ${brandMarkup}`,
    `  </div>`,
    `  ${mascotMarkup}`,
    `</div>`,
    `</section>`,
  ].join("\n");
}
