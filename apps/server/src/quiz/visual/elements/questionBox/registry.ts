import type { QuizQuestionBoxStyle } from "@studio/shared";
import type { QuestionBoxVariant } from "./types.js";
import { candyPopVariant } from "./variants/candyPop.js";
import { comicBubbleVariant } from "./variants/comicBubble.js";
import { glassMorphismVariant } from "./variants/glassMorphism.js";
import { parchmentScrollVariant } from "./variants/parchmentScroll.js";

export const QUESTION_BOX_VARIANTS: Record<Exclude<QuizQuestionBoxStyle, "auto">, QuestionBoxVariant> = {
  candy_pop: candyPopVariant,
  comic_bubble: comicBubbleVariant,
  glass_morphism: glassMorphismVariant,
  parchment_scroll: parchmentScrollVariant,
};

export const DEFAULT_QUESTION_BOX_STYLE: Exclude<QuizQuestionBoxStyle, "auto"> = "candy_pop";

export function getQuestionBoxVariant(style: Exclude<QuizQuestionBoxStyle, "auto">): QuestionBoxVariant {
  return QUESTION_BOX_VARIANTS[style] ?? candyPopVariant;
}

export function resolveQuestionBoxVariant(
  requested?: QuizQuestionBoxStyle | null,
  fallback: Exclude<QuizQuestionBoxStyle, "auto"> = DEFAULT_QUESTION_BOX_STYLE,
): QuestionBoxVariant {
  if (!requested || requested === "auto") {
    return QUESTION_BOX_VARIANTS[fallback] ?? candyPopVariant;
  }
  return QUESTION_BOX_VARIANTS[requested] ?? QUESTION_BOX_VARIANTS[fallback] ?? candyPopVariant;
}

export function getQuestionBoxesCss(): string {
  return Object.values(QUESTION_BOX_VARIANTS)
    .map((variant) => variant.renderCss?.() ?? "")
    .filter(Boolean)
    .join("\n");
}

