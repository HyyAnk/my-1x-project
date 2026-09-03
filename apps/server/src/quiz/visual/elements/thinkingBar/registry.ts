import type { QuizThinkingBarStyle } from "@studio/shared";
import type { ThinkingBarVariant } from "./types.js";
import { BUILT_IN_THINKING_BAR_MODULES } from "../../styleModules/builtins.js";
import { renderValidatedModuleCss } from "../../styleModules/namespaceCss.js";
import { getActiveStyleSnapshot, getStyleModuleAtRevision, getStyleSnapshotAtRevision } from "../../styleModules/activation.js";

export const THINKING_BAR_VARIANTS: Record<Exclude<QuizThinkingBarStyle, "auto">, ThinkingBarVariant> = {
  star_slider: BUILT_IN_THINKING_BAR_MODULES[0].renderer,
  capsule_liquid: BUILT_IN_THINKING_BAR_MODULES[1].renderer,
  energy_laser: BUILT_IN_THINKING_BAR_MODULES[2].renderer,
  construction_machine: BUILT_IN_THINKING_BAR_MODULES[3].renderer,
  flame_fuse: BUILT_IN_THINKING_BAR_MODULES[4].renderer,
  cosmic_rocket: BUILT_IN_THINKING_BAR_MODULES[5].renderer,
};

export const DEFAULT_THINKING_BAR_STYLE: Exclude<QuizThinkingBarStyle, "auto"> = "star_slider";

export function getThinkingBarVariant(style: Exclude<QuizThinkingBarStyle, "auto">): ThinkingBarVariant {
  return THINKING_BAR_VARIANTS[style] ?? THINKING_BAR_VARIANTS[DEFAULT_THINKING_BAR_STYLE];
}

export function resolveThinkingBarVariant(
  requested?: QuizThinkingBarStyle | null,
  fallback: Exclude<QuizThinkingBarStyle, "auto"> = DEFAULT_THINKING_BAR_STYLE,
  revision?: string,
): ThinkingBarVariant {
  if (!requested || requested === "auto") {
    return THINKING_BAR_VARIANTS[fallback] ?? THINKING_BAR_VARIANTS[DEFAULT_THINKING_BAR_STYLE];
  }
  return (getStyleModuleAtRevision("thinking-bar", requested, revision)?.renderer as ThinkingBarVariant | undefined) ?? THINKING_BAR_VARIANTS[requested] ?? THINKING_BAR_VARIANTS[fallback] ?? THINKING_BAR_VARIANTS[DEFAULT_THINKING_BAR_STYLE];
}

export function getThinkingBarsCss(revision?: string): string {
  const builtIn = BUILT_IN_THINKING_BAR_MODULES.map(renderValidatedModuleCss).filter(Boolean);
  const activeSnapshot = revision ? getStyleSnapshotAtRevision(revision) : getActiveStyleSnapshot();
  if (!activeSnapshot) return builtIn.join("\n");
  const activeRevision = activeSnapshot.revision;
  const custom = activeSnapshot.catalog.entries
    .filter((entry) => entry.slot === "thinking-bar" && !BUILT_IN_THINKING_BAR_MODULES.some((module) => module.manifest.id === entry.id))
    .map((entry) => getStyleModuleAtRevision("thinking-bar", entry.id, activeRevision))
    .filter((module): module is NonNullable<typeof module> => Boolean(module))
    .map(renderValidatedModuleCss);
  return [...builtIn, ...custom].join("\n");
}
