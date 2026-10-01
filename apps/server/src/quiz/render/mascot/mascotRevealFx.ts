import { numberValue } from "./mascotHtmlStyles.js";

export interface MascotRevealFxOptions {
  stateDelay: number;
  preview?: boolean;
}

/**
 * Renders the Option A Mascot Reveal VFX transition layer:
 * - Expanding dual shockwave light rings (golden yellow & electric cyan)
 * - Center flash bloom to seamlessly mask sprite / pose discontinuity
 * - Radiating micro-sparkles
 */
export function renderMascotRevealFx(options: MascotRevealFxOptions): string {
  if (options.preview) return "";

  const delayStr = `${numberValue(options.stateDelay)}s`;

  return `<div class="mascot-reveal-fx" style="--mascot-fx-delay:${delayStr}" data-layout-ignore aria-hidden="true"><div class="mascot-fx-bloom"></div><div class="mascot-fx-ring ring-1"></div><div class="mascot-fx-ring ring-2"></div><span class="mascot-fx-sparkle sp-1">✦</span><span class="mascot-fx-sparkle sp-2">★</span><span class="mascot-fx-sparkle sp-3">✦</span><span class="mascot-fx-sparkle sp-4">★</span></div>`;
}
