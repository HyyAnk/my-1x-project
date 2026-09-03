import type { QuizBackgroundStyle } from "@studio/shared";
import type { QuizBackgroundVariant, QuizBackgroundVariantId } from "./types.js";
import { BUILT_IN_BACKGROUND_MODULES } from "../../styleModules/builtins.js";
import { renderValidatedModuleCss } from "../../styleModules/namespaceCss.js";

export const backgroundRegistry = new Map<QuizBackgroundVariantId, QuizBackgroundVariant>([
  ["candy_rays", BUILT_IN_BACKGROUND_MODULES[0].renderer],
  ["aurora_glow", BUILT_IN_BACKGROUND_MODULES[1].renderer],
]);

export function resolveBackgroundVariant(style?: QuizBackgroundStyle | null): QuizBackgroundVariant {
  if (!style || style === "auto") {
    return backgroundRegistry.get("candy_rays")!;
  }
  return backgroundRegistry.get(style) ?? backgroundRegistry.get("candy_rays")!;
}

export function getBackgroundStylesCss(): string {
  return getSelectedBackgroundStylesCss(backgroundRegistry.keys());
}

export function getSelectedBackgroundStylesCss(styles: Iterable<QuizBackgroundStyle | null | undefined>): string {
  const selected = new Set(Array.from(styles, (style) => resolveBackgroundVariant(style).id));
  let css = "";
  for (const module of BUILT_IN_BACKGROUND_MODULES) {
    if (!selected.has(module.renderer.id)) continue;
    css += `\n/* === Background Variant: ${module.renderer.displayName} === */\n` + renderValidatedModuleCss(module) + "\n";
  }
  return css;
}
