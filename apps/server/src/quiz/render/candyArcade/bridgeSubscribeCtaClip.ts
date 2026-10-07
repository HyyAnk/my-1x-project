import type {
  ChannelMascotConfig,
  MascotProfile,
  MascotRenderAspectRatio,
  MascotStateMediaMode,
} from "@studio/shared";
import { esc } from "./candyArcadeSvg.js";
import { source } from "./candyArcadeAudio.js";
import {
  renderProductionMascotHtmlLayer,
  type ProductionMascotTimelineEvent,
} from "../productionMascotRenderer.js";
import { normalizeMascotTimelineEventsToZeroBased } from "./candyArcadeTiming.js";

export interface BridgeSubscribeCtaClipInput {
  start: number;
  duration: number;
  channelName: string;
  badgeText?: string;
  headlineText?: string;
  promptText?: string;
  aspectRatio?: MascotRenderAspectRatio;
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
  mascotEvents?: readonly ProductionMascotTimelineEvent[];
  mediaMode?: MascotStateMediaMode;
  ctaMode?: "hero_action" | "classic";
  minimalBranding?: boolean;
}

function renderCtaBackdrop(): string {
  return `<div class="bridge-cta-backdrop">` +
    `<div class="bridge-cta-rays"></div>` +
    `<div class="bridge-cta-aura"></div>` +
    `<div class="bridge-cta-shockwave"></div>` +
    `<div class="bridge-cta-bubbles" aria-hidden="true" data-layout-ignore>` +
      `<span class="bridge-cta-bubble bb-1"></span>` +
      `<span class="bridge-cta-bubble bb-2"></span>` +
      `<span class="bridge-cta-bubble bb-3"></span>` +
      `<span class="bridge-cta-bubble bb-4"></span>` +
      `<span class="bridge-cta-bubble bb-5"></span>` +
      `<span class="bridge-cta-bubble bb-6"></span>` +
      `<span class="bridge-cta-bubble bb-7"></span>` +
      `<span class="bridge-cta-bubble bb-8"></span>` +
      `<span class="bridge-cta-bubble bb-9"></span>` +
      `<span class="bridge-cta-bubble bb-10"></span>` +
    `</div>` +
    `<div class="bridge-cta-ambient-sparkles" aria-hidden="true" data-layout-ignore>` +
      `<span class="bridge-cta-sparkle cs-1">✦</span>` +
      `<span class="bridge-cta-sparkle cs-2">✨</span>` +
      `<span class="bridge-cta-sparkle cs-3">★</span>` +
      `<span class="bridge-cta-sparkle cs-4">🔔</span>` +
      `<span class="bridge-cta-sparkle cs-5">💖</span>` +
      `<span class="bridge-cta-sparkle cs-6">✦</span>` +
    `</div>` +
  `</div>`;
}

function renderCtaHeroWidget(channel: string, modeClass: string, minimalClass: string): string {
  return `<div class="bridge-cta-hero-container${modeClass}${minimalClass}">` +
    `<div class="bridge-cta-channel-sr sr-only" data-channel-name="${esc(channel)}">${esc(channel)}</div>` +
    `<div class="bridge-cta-widget-wrapper">` +
      `<div class="bridge-cta-burst" aria-hidden="true"></div>` +
      `<div class="bridge-cta-confetti" aria-hidden="true">` +
        `<span class="confetti-piece cp-1"></span>` +
        `<span class="confetti-piece cp-2"></span>` +
        `<span class="confetti-piece cp-3"></span>` +
        `<span class="confetti-piece cp-4"></span>` +
        `<span class="confetti-piece cp-5"></span>` +
        `<span class="confetti-piece cp-6"></span>` +
      `</div>` +
      `<button type="button" class="bridge-cta-subscribe-button" aria-label="Subscribe to ${esc(channel)}">` +
        `<span class="bridge-cta-sub-label-normal">` +
          `<svg class="bridge-cta-sub-icon" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>` +
          `SUBSCRIBE` +
        `</span>` +
        `<span class="bridge-cta-sub-label-active">` +
          `<svg class="bridge-cta-check-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>` +
          `SUBSCRIBED` +
        `</span>` +
      `</button>` +
      `<div class="bridge-cta-bell-button" aria-label="Notifications bell">` +
        `<span class="bridge-cta-bell-soundwave bsw-1" aria-hidden="true"></span>` +
        `<span class="bridge-cta-bell-soundwave bsw-2" aria-hidden="true"></span>` +
        `<span class="bridge-cta-bell-icon" aria-hidden="true">🔔</span>` +
      `</div>` +
      `<div class="bridge-cta-cursor" aria-hidden="true">` +
        `<svg viewBox="0 0 24 24" fill="none">` +
          `<path d="M4 3L11 20L14 13L21 10L4 3Z" fill="#FFFFFF" stroke="#1E1B4B" stroke-width="2.2" stroke-linejoin="round"/>` +
        `</svg>` +
      `</div>` +
    `</div>` +
  `</div>`;
}

function renderClassicCtaCard(params: {
  channel: string;
  initial: string;
  badgeText: string;
  headlineText: string;
  promptText: string;
  modeClass: string;
  minimalClass: string;
}): string {
  return `<div class="bridge-cta-card bridge-cta-hero-card${params.modeClass}${params.minimalClass}">` +
    `<span class="bridge-decor-star bridge-star-tl" data-layout-ignore aria-hidden="true">★</span>` +
    `<span class="bridge-decor-star bridge-star-br" data-layout-ignore aria-hidden="true">★</span>` +
    `<div class="bridge-cta-badge"><span>✨</span> ${esc(params.badgeText)}</div>` +
    `<div class="bridge-cta-channel">` +
      `<div class="bridge-cta-channel-avatar" aria-hidden="true">${esc(params.initial)}</div>` +
      `<span class="bridge-cta-channel-name">${esc(params.channel)}</span>` +
    `</div>` +
    `<h1 class="bridge-cta-headline">${esc(params.headlineText)}</h1>` +
    `<div class="bridge-cta-widget-wrapper">` +
      `<div class="bridge-cta-burst" aria-hidden="true"></div>` +
      `<button type="button" class="bridge-cta-subscribe-button" aria-label="Subscribe to channel">` +
        `<span class="bridge-cta-sub-label-normal">` +
          `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>` +
          `SUBSCRIBE` +
        `</span>` +
        `<span class="bridge-cta-sub-label-active">` +
          `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>` +
          `SUBSCRIBED` +
        `</span>` +
      `</button>` +
      `<div class="bridge-cta-bell-button" aria-label="Notifications bell">` +
        `<span class="bridge-cta-bell-icon" aria-hidden="true">🔔</span>` +
      `</div>` +
      `<div class="bridge-cta-cursor" aria-hidden="true">` +
        `<svg viewBox="0 0 24 24" fill="none">` +
          `<path d="M4 3L11 20L14 13L21 10L4 3Z" fill="#FFFFFF" stroke="#1E1B4B" stroke-width="2.2" stroke-linejoin="round"/>` +
        `</svg>` +
      `</div>` +
    `</div>` +
    `<p class="bridge-cta-prompt">${esc(params.promptText)}</p>` +
  `</div>`;
}

export function bridgeSubscribeCtaClip(input: BridgeSubscribeCtaClipInput): string {
  const duration = Math.max(0.04, input.duration);
  const channel = input.channelName.trim() || "Channel";
  const initial = channel.charAt(0).toUpperCase() || "★";
  const badgeText = input.badgeText?.trim() || "JOIN THE COMMUNITY";
  const headlineText = input.headlineText?.trim() || "Don't forget to subscribe for more exciting quizzes!";
  const promptText = input.promptText?.trim() || "Turn on notifications so you never miss a challenge!";

  const ctaMode = input.ctaMode ?? "hero_action";
  const modeClass = ` bridge-cta-mode-${ctaMode}`;
  const minimalClass = input.minimalBranding ? " bridge-cta-minimal-branding" : "";

  // Mascot is excluded in hero_action mode to keep 100% viewer focus on the Subscribe CTA
  const showMascot = ctaMode === "classic";
  const mascotHtml = showMascot && input.mascot
    ? renderProductionMascotHtmlLayer(input.mascot, input.mascotConfig, {
        phase: "intro",
        clipStartSeconds: 0,
        clipDurationSeconds: duration,
        timelineEvents: normalizeMascotTimelineEventsToZeroBased(input.mascotEvents, input.start),
        aspectRatio: input.aspectRatio ?? "16:9",
        sourceMapper: source,
        mediaMode: input.mediaMode,
      })
    : "";

  const fallbackMascot = showMascot && !input.mascot
    ? `<div class="brand-mascot mascot-cheer" data-layout-ignore aria-hidden="true">✦</div>`
    : "";

  const backdropHtml = renderCtaBackdrop();
  const bodyHtml = ctaMode === "classic"
    ? renderClassicCtaCard({
        channel,
        initial,
        badgeText,
        headlineText,
        promptText,
        modeClass,
        minimalClass,
      })
    : renderCtaHeroWidget(channel, modeClass, minimalClass);

  return `<section id="candy-bridge-cta-${Math.round(input.start * 1000)}" class="clip candy-scene bridge-cta-scene" data-start="${input.start.toFixed(3)}" data-duration="${duration.toFixed(3)}" data-track-index="0" style="--clip-start:0s;">` +
    backdropHtml +
    bodyHtml +
    mascotHtml +
    fallbackMascot +
  `</section>`;
}
