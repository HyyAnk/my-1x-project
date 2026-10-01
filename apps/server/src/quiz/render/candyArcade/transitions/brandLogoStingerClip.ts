import type { MascotRenderAspectRatio } from "@studio/shared";
import { esc, escAttr } from "../candyArcadeSvg.js";
import { renderBrandLogoBadge } from "./brandLogoFallbackBadge.js";

export interface BrandLogoStingerClipInput {
  start: number;
  duration: number;
  channelName: string;
  hasCustomLogo: boolean;
  logoUrl?: string;
  fallbackInitial: string;
  aspectRatio?: MascotRenderAspectRatio;
  fromColor?: string;
  toColor?: string;
  accentColor?: string;
  instanceId?: string;
  showChannelName?: boolean;
}

/**
 * Renders the full DOM structure for the Brand Logo Stinger Transition.
 * Runs on overlay track index 1 across the transition boundary.
 * Defaults showChannelName to false to focus cleanly on the Channel Logo emblem.
 */
export function brandLogoStingerClip(input: BrandLogoStingerClipInput): string {
  const duration = Math.max(0.1, input.duration);
  const start = Math.max(0, input.start);
  const aspectRatio = input.aspectRatio ?? "16:9";
  const channelName = input.channelName.trim() || "Channel";
  const fallbackInitial = input.fallbackInitial || "★";
  const fromColor = input.fromColor || "#4338CA";
  const toColor = input.toColor || "#EC4899";
  const accentColor = input.accentColor || "#F59E0B";
  const showChannelName = input.showChannelName ?? false;

  const instanceId = input.instanceId ?? `bridge-stinger-${Math.round(start * 1000)}`;

  const badgeHtml = renderBrandLogoBadge({
    hasCustomLogo: input.hasCustomLogo,
    logoUrl: input.logoUrl,
    channelName,
    fallbackInitial,
  });

  const channelPillHtml = showChannelName
    ? `<div class="brand-stinger-channel-pill" aria-hidden="true">` +
        `<span class="brand-stinger-channel-name">${esc(channelName)}</span>` +
        `<span class="brand-stinger-sub">QUIZ</span>` +
      `</div>`
    : "";

  return (
    `<section id="${escAttr(instanceId)}" ` +
    `class="clip candy-transition transition-brand-logo-stinger" ` +
    `data-start="${start.toFixed(3)}" ` +
    `data-duration="${duration.toFixed(3)}" ` +
    `data-track-index="1" ` +
    `data-aspect-ratio="${aspectRatio}" ` +
    `data-layout-ignore data-layout-allow-occlusion data-layout-allow-overflow ` +
    `style="--clip-start:${start.toFixed(3)}s;--trans-dur:${duration.toFixed(3)}s;--trans-from:${fromColor};--trans-to:${toColor};--trans-accent:${accentColor};">` +
      `<div class="brand-stinger-backdrop" aria-hidden="true">` +
        `<div class="brand-stinger-slash slash-primary"></div>` +
        `<div class="brand-stinger-slash slash-secondary"></div>` +
        `<div class="brand-stinger-slash slash-accent"></div>` +
        `<div class="brand-stinger-shockwave-ring ring-1"></div>` +
        `<div class="brand-stinger-shockwave-ring ring-2"></div>` +
        `<div class="brand-stinger-flash"></div>` +
      `</div>` +
      `<div class="brand-stinger-content">` +
        badgeHtml +
        channelPillHtml +
      `</div>` +
    `</section>`
  );
}
