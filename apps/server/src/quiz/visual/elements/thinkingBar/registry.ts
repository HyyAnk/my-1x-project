import type { QuizThinkingBarStyle } from "@studio/shared";
import type { ThinkingBarVariant } from "./types.js";
import { starSliderVariant } from "./variants/starSlider.js";
import { capsuleLiquidVariant } from "./variants/capsuleLiquid.js";
import { energyLaserVariant } from "./variants/energyLaser.js";
import { retroPixelVariant } from "./variants/retroPixel.js";
import { flameFuseVariant } from "./variants/flameFuse.js";
import { minimalGlowVariant } from "./variants/minimalGlow.js";

export const THINKING_BAR_VARIANTS: Record<Exclude<QuizThinkingBarStyle, "auto">, ThinkingBarVariant> = {
  star_slider: starSliderVariant,
  capsule_liquid: capsuleLiquidVariant,
  energy_laser: energyLaserVariant,
  retro_pixel: retroPixelVariant,
  flame_fuse: flameFuseVariant,
  minimal_glow: minimalGlowVariant,
};

export const DEFAULT_THINKING_BAR_STYLE: Exclude<QuizThinkingBarStyle, "auto"> = "star_slider";

export function getThinkingBarVariant(style: Exclude<QuizThinkingBarStyle, "auto">): ThinkingBarVariant {
  return THINKING_BAR_VARIANTS[style] ?? starSliderVariant;
}

export function resolveThinkingBarVariant(
  requested?: QuizThinkingBarStyle | null,
  fallback: Exclude<QuizThinkingBarStyle, "auto"> = DEFAULT_THINKING_BAR_STYLE,
): ThinkingBarVariant {
  if (!requested || requested === "auto") {
    return THINKING_BAR_VARIANTS[fallback] ?? starSliderVariant;
  }
  return THINKING_BAR_VARIANTS[requested] ?? THINKING_BAR_VARIANTS[fallback] ?? starSliderVariant;
}

export function getThinkingBarsCss(): string {
  return Object.values(THINKING_BAR_VARIANTS)
    .map((variant) => variant.renderCss?.() ?? "")
    .filter(Boolean)
    .join("\n");
}
