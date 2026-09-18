import type { QuizAnswerCardStyle } from "@studio/shared";
import type { AnswerCardSkin } from "./types.js";
import { BUILT_IN_ANSWER_CARD_MODULES } from "../../styleModules/builtins.js";
import { renderValidatedModuleCss } from "../../styleModules/namespaceCss.js";
import { getActiveStyleSnapshot, getStyleModuleAtRevision, getStyleSnapshotAtRevision } from "../../styleModules/activation.js";

export const ANSWER_CARD_VARIANTS: Record<Exclude<QuizAnswerCardStyle, "auto">, AnswerCardSkin> = {
  glossy_arcade: BUILT_IN_ANSWER_CARD_MODULES[0].renderer,
  comic_chunky: BUILT_IN_ANSWER_CARD_MODULES[1].renderer,
  glass_neon: BUILT_IN_ANSWER_CARD_MODULES[2].renderer,
  minimal_soft: BUILT_IN_ANSWER_CARD_MODULES[3].renderer,
  steel_beam_plate: BUILT_IN_ANSWER_CARD_MODULES[4].renderer,
  pastel_marshmallow: BUILT_IN_ANSWER_CARD_MODULES[5].renderer,
  rustic_wood_plank: BUILT_IN_ANSWER_CARD_MODULES[6].renderer,
};

export const DEFAULT_ANSWER_CARD_STYLE: Exclude<QuizAnswerCardStyle, "auto"> = "glossy_arcade";

export const answerCardRegistry = new Map<Exclude<QuizAnswerCardStyle, "auto">, AnswerCardSkin>([
  ["glossy_arcade", ANSWER_CARD_VARIANTS.glossy_arcade],
  ["comic_chunky", ANSWER_CARD_VARIANTS.comic_chunky],
  ["glass_neon", ANSWER_CARD_VARIANTS.glass_neon],
  ["minimal_soft", ANSWER_CARD_VARIANTS.minimal_soft],
  ["steel_beam_plate", ANSWER_CARD_VARIANTS.steel_beam_plate],
  ["pastel_marshmallow", ANSWER_CARD_VARIANTS.pastel_marshmallow],
  ["rustic_wood_plank", ANSWER_CARD_VARIANTS.rustic_wood_plank],
]);

export function getAnswerCardSkin(style: Exclude<QuizAnswerCardStyle, "auto">): AnswerCardSkin {
  return ANSWER_CARD_VARIANTS[style] ?? ANSWER_CARD_VARIANTS[DEFAULT_ANSWER_CARD_STYLE];
}

export function resolveAnswerCardSkin(style?: QuizAnswerCardStyle | null, revision?: string): AnswerCardSkin {
  if (!style || style === "auto") {
    return answerCardRegistry.get(DEFAULT_ANSWER_CARD_STYLE)!;
  }
  return (
    (getStyleModuleAtRevision("answer-card", style, revision)?.renderer as AnswerCardSkin | undefined) ??
    answerCardRegistry.get(style) ??
    answerCardRegistry.get(DEFAULT_ANSWER_CARD_STYLE)!
  );
}

export function getAnswerCardSkinsCss(revision?: string): string {
  let css = "";
  for (const module of BUILT_IN_ANSWER_CARD_MODULES) {
    css += `\n/* === Answer Card: ${module.renderer.displayName} === */\n` + renderValidatedModuleCss(module) + "\n";
  }
  const snapshot = revision ? getStyleSnapshotAtRevision(revision) : getActiveStyleSnapshot();
  if (!snapshot) return css;
  const activeRevision = snapshot.revision;
  for (const entry of snapshot.catalog.entries.filter(
    (item) => item.slot === "answer-card" && !BUILT_IN_ANSWER_CARD_MODULES.some((module) => module.manifest.id === item.id),
  )) {
    const module = getStyleModuleAtRevision("answer-card", entry.id, activeRevision);
    if (module) css += `\n/* === Answer Card: ${entry.displayName} === */\n` + renderValidatedModuleCss(module) + "\n";
  }
  return css;
}

export const getAnswerCardsCss = getAnswerCardSkinsCss;
