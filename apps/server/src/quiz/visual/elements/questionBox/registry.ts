import type { QuizQuestionBoxStyle } from "@studio/shared";
import type { QuestionBoxVariant } from "./types.js";
import { BUILT_IN_QUESTION_BOX_MODULES } from "../../styleModules/builtins.js";
import { renderValidatedModuleCss } from "../../styleModules/namespaceCss.js";

export const QUESTION_BOX_VARIANTS: Record<Exclude<QuizQuestionBoxStyle, "auto">, QuestionBoxVariant> = {
  candy_pop: BUILT_IN_QUESTION_BOX_MODULES[0].renderer,
  comic_bubble: BUILT_IN_QUESTION_BOX_MODULES[1].renderer,
  glass_morphism: BUILT_IN_QUESTION_BOX_MODULES[2].renderer,
  parchment_scroll: BUILT_IN_QUESTION_BOX_MODULES[3].renderer,
};

export const DEFAULT_QUESTION_BOX_STYLE: Exclude<QuizQuestionBoxStyle, "auto"> = "candy_pop";

export function getQuestionBoxVariant(style: Exclude<QuizQuestionBoxStyle, "auto">): QuestionBoxVariant {
  return QUESTION_BOX_VARIANTS[style] ?? QUESTION_BOX_VARIANTS[DEFAULT_QUESTION_BOX_STYLE];
}

export function resolveQuestionBoxVariant(
  requested?: QuizQuestionBoxStyle | null,
  fallback: Exclude<QuizQuestionBoxStyle, "auto"> = DEFAULT_QUESTION_BOX_STYLE,
): QuestionBoxVariant {
  if (!requested || requested === "auto") {
    return QUESTION_BOX_VARIANTS[fallback] ?? QUESTION_BOX_VARIANTS[DEFAULT_QUESTION_BOX_STYLE];
  }
  return QUESTION_BOX_VARIANTS[requested] ?? QUESTION_BOX_VARIANTS[fallback] ?? QUESTION_BOX_VARIANTS[DEFAULT_QUESTION_BOX_STYLE];
}

export function getQuestionBoxesCss(): string {
  return BUILT_IN_QUESTION_BOX_MODULES.map(renderValidatedModuleCss).filter(Boolean).join("\n");
}
