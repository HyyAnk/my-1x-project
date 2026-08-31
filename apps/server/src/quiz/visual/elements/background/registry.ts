import type { QuizBackgroundStyle } from "@studio/shared";
import type { QuizBackgroundVariant, QuizBackgroundVariantId } from "./types.js";
import { candyRaysVariant } from "./variants/candyRays.js";
import { auroraGlowVariant } from "./variants/auroraGlow.js";

export const backgroundRegistry = new Map<QuizBackgroundVariantId, QuizBackgroundVariant>([
  ["candy_rays", candyRaysVariant],
  ["aurora_glow", auroraGlowVariant],
]);

export function resolveBackgroundVariant(style?: QuizBackgroundStyle | null): QuizBackgroundVariant {
  if (!style || style === "auto") {
    return candyRaysVariant;
  }
  return backgroundRegistry.get(style) ?? candyRaysVariant;
}

export function getBackgroundStylesCss(): string {
  return getSelectedBackgroundStylesCss(backgroundRegistry.keys());
}

export function getSelectedBackgroundStylesCss(styles: Iterable<QuizBackgroundStyle | null | undefined>): string {
  const selected = new Set(Array.from(styles, (style) => resolveBackgroundVariant(style).id));
  let css = "";
  for (const [id, variant] of backgroundRegistry) {
    if (!selected.has(id)) continue;
    css += `\n/* === Background Variant: ${variant.displayName} === */\n` + variant.renderCss() + "\n";
  }
  return css;
}
