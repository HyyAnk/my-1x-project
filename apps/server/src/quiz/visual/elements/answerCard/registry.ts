import type { QuizAnswerCardStyle } from "@studio/shared";
import type { AnswerCardSkin } from "./types.js";
import { BUILT_IN_ANSWER_CARD_MODULES } from "../../styleModules/builtins.js";
import { renderValidatedModuleCss } from "../../styleModules/namespaceCss.js";

export const answerCardRegistry = new Map<Exclude<QuizAnswerCardStyle, "auto">, AnswerCardSkin>([
  ["glossy_arcade", BUILT_IN_ANSWER_CARD_MODULES[0].renderer],
  ["comic_chunky", BUILT_IN_ANSWER_CARD_MODULES[1].renderer],
  ["glass_neon", BUILT_IN_ANSWER_CARD_MODULES[2].renderer],
  ["minimal_soft", BUILT_IN_ANSWER_CARD_MODULES[3].renderer],
]);

export function resolveAnswerCardSkin(style?: QuizAnswerCardStyle | null): AnswerCardSkin {
  if (!style || style === "auto") {
    return answerCardRegistry.get("glossy_arcade")!;
  }
  return answerCardRegistry.get(style) ?? answerCardRegistry.get("glossy_arcade")!;
}

export function getAnswerCardSkinsCss(): string {
  let css = "";
  for (const module of BUILT_IN_ANSWER_CARD_MODULES) {
    css += `\n/* === Answer Card: ${module.renderer.displayName} === */\n` + renderValidatedModuleCss(module) + "\n";
  }
  return css;
}
