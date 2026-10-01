import { esc, escAttr } from "../candyArcadeSvg.js";

export interface RenderBrandLogoBadgeOptions {
  hasCustomLogo: boolean;
  logoUrl?: string;
  channelName: string;
  fallbackInitial: string;
}

/**
 * Renders the hero brand emblem for the brand logo stinger transition.
 * Uses the uploaded channel logo image when available, or a 3D metallic lettermark badge as a resilient fallback.
 */
export function renderBrandLogoBadge(options: RenderBrandLogoBadgeOptions): string {
  const { hasCustomLogo, logoUrl, channelName, fallbackInitial } = options;

  if (hasCustomLogo && logoUrl) {
    return (
      `<div class="brand-stinger-hero-badge brand-stinger-custom-logo" data-layout-ignore aria-label="${escAttr(channelName)}">` +
        `<div class="brand-badge-ring brand-badge-glow" aria-hidden="true"></div>` +
        `<div class="brand-stinger-logo-frame">` +
          `<img class="brand-stinger-logo-img" src="${escAttr(logoUrl)}" alt="${escAttr(channelName)}" />` +
          `<div class="brand-stinger-shimmer" aria-hidden="true"></div>` +
        `</div>` +
        `<span class="brand-stinger-sparkle sp-tl" aria-hidden="true">✦</span>` +
        `<span class="brand-stinger-sparkle sp-br" aria-hidden="true">✨</span>` +
        `<span class="brand-stinger-sparkle sp-tr" aria-hidden="true">★</span>` +
        `<span class="brand-stinger-sparkle sp-bl" aria-hidden="true">✦</span>` +
      `</div>`
    );
  }

  return (
    `<div class="brand-stinger-hero-badge brand-stinger-fallback-badge" data-layout-ignore aria-label="${escAttr(channelName)}">` +
      `<div class="brand-badge-ring brand-badge-glow" aria-hidden="true"></div>` +
      `<div class="brand-stinger-lettermark-frame">` +
        `<span class="brand-lettermark-text">${esc(fallbackInitial)}</span>` +
        `<div class="brand-stinger-shimmer" aria-hidden="true"></div>` +
      `</div>` +
      `<span class="brand-stinger-sparkle sp-tl" aria-hidden="true">✦</span>` +
      `<span class="brand-stinger-sparkle sp-br" aria-hidden="true">✨</span>` +
      `<span class="brand-stinger-sparkle sp-tr" aria-hidden="true">★</span>` +
      `<span class="brand-stinger-sparkle sp-bl" aria-hidden="true">✦</span>` +
    `</div>`
  );
}
