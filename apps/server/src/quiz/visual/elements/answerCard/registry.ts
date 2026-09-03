import type { QuizAnswerCardStyle } from "@studio/shared";
import type { AnswerCardSkin } from "./types.js";
import { BUILT_IN_ANSWER_CARD_MODULES } from "../../styleModules/builtins.js";
import { renderValidatedModuleCss } from "../../styleModules/namespaceCss.js";
import { getActiveStyleSnapshot, getStyleModuleAtRevision } from "../../styleModules/activation.js";

export const answerCardRegistry = new Map<Exclude<QuizAnswerCardStyle, "auto">, AnswerCardSkin>([
  ["glossy_arcade", BUILT_IN_ANSWER_CARD_MODULES[0].renderer],
  ["comic_chunky", BUILT_IN_ANSWER_CARD_MODULES[1].renderer],
  ["glass_neon", BUILT_IN_ANSWER_CARD_MODULES[2].renderer],
  ["minimal_soft", BUILT_IN_ANSWER_CARD_MODULES[3].renderer],
]);

export function resolveAnswerCardSkin(style?: QuizAnswerCardStyle | null, revision?: string): AnswerCardSkin {
  if (!style || style === "auto") {
    return answerCardRegistry.get("glossy_arcade")!;
  }
  return (getStyleModuleAtRevision("answer-card", style, revision)?.renderer as AnswerCardSkin | undefined) ?? answerCardRegistry.get(style) ?? answerCardRegistry.get("glossy_arcade")!;
}

export function getAnswerCardSkinsCss(): string {
  let css = "";
  for (const module of BUILT_IN_ANSWER_CARD_MODULES) {
    css += `\n/* === Answer Card: ${module.renderer.displayName} === */\n` + renderValidatedModuleCss(module) + "\n";
  }
  const snapshot = getActiveStyleSnapshot();
  for (const entry of snapshot.catalog.entries.filter((item) => item.slot === "answer-card" && !BUILT_IN_ANSWER_CARD_MODULES.some((module) => module.manifest.id === item.id))) {
    const module = getStyleModuleAtRevision("answer-card", entry.id, snapshot.revision);
    if (module) css += `\n/* === Answer Card: ${entry.displayName} === */\n` + renderValidatedModuleCss(module) + "\n";
  }
  return css;
}
