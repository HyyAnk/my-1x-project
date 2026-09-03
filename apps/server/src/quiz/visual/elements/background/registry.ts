import type { QuizBackgroundStyle } from "@studio/shared";
import type { QuizBackgroundVariant, QuizBackgroundVariantId } from "./types.js";
import { BUILT_IN_BACKGROUND_MODULES } from "../../styleModules/builtins.js";
import { renderValidatedModuleCss } from "../../styleModules/namespaceCss.js";
import { getActiveStyleSnapshot, getStyleModuleAtRevision, getStyleSnapshotAtRevision } from "../../styleModules/activation.js";

export const backgroundRegistry = new Map<QuizBackgroundVariantId, QuizBackgroundVariant>([
  ["candy_rays", BUILT_IN_BACKGROUND_MODULES[0].renderer],
  ["aurora_glow", BUILT_IN_BACKGROUND_MODULES[1].renderer],
]);

export function resolveBackgroundVariant(style?: QuizBackgroundStyle | null, revision?: string): QuizBackgroundVariant {
  if (!style || style === "auto") {
    return backgroundRegistry.get("candy_rays")!;
  }
  return (getStyleModuleAtRevision("background", style, revision)?.renderer as QuizBackgroundVariant | undefined) ?? backgroundRegistry.get(style) ?? backgroundRegistry.get("candy_rays")!;
}

export function getBackgroundStylesCss(revision?: string): string {
  return getSelectedBackgroundStylesCss(backgroundRegistry.keys(), revision);
}

export function getSelectedBackgroundStylesCss(styles: Iterable<QuizBackgroundStyle | null | undefined>, revision?: string): string {
  const requested = Array.from(styles);
  const selected = new Set(requested.map((style) => resolveBackgroundVariant(style).id));
  let css = "";
  for (const module of BUILT_IN_BACKGROUND_MODULES) {
    if (!selected.has(module.renderer.id)) continue;
    css += `\n/* === Background Variant: ${module.renderer.displayName} === */\n` + renderValidatedModuleCss(module) + "\n";
  }
  const snapshot = revision ? getStyleSnapshotAtRevision(revision) : getActiveStyleSnapshot();
  if (!snapshot) return css;
  const activeRevision = snapshot.revision;
  for (const style of requested) {
    if (!style || style === "auto" || BUILT_IN_BACKGROUND_MODULES.some((module) => module.manifest.id === style)) continue;
    const module = getStyleModuleAtRevision("background", style, activeRevision);
    if (module) css += `\n/* === Background Variant: ${style} === */\n` + renderValidatedModuleCss(module) + "\n";
  }
  return css;
}
