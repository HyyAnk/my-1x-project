import type { QuizAnswerCardStyle } from "@studio/shared";
import type { AnswerCardVariant } from "./types.js";
import { glossyArcadeVariant } from "./variants/glossyArcade.js";
import { comicChunkyVariant } from "./variants/comicChunky.js";
import { glassNeonVariant } from "./variants/glassNeon.js";
import { minimalSoftVariant } from "./variants/minimalSoft.js";

export const answerCardRegistry = new Map<Exclude<QuizAnswerCardStyle, "auto">, AnswerCardVariant>([
  ["glossy_arcade", glossyArcadeVariant],
  ["comic_chunky", comicChunkyVariant],
  ["glass_neon", glassNeonVariant],
  ["minimal_soft", minimalSoftVariant],
]);

export function resolveAnswerCardVariant(style?: QuizAnswerCardStyle | null): AnswerCardVariant {
  if (!style || style === "auto") {
    return glossyArcadeVariant;
  }
  return answerCardRegistry.get(style) ?? glossyArcadeVariant;
}

export function getAnswerCardsCss(): string {
  let css = "";
  for (const variant of answerCardRegistry.values()) {
    if (variant.renderCss) {
      css += `\n/* === Answer Card: ${variant.displayName} === */\n` + variant.renderCss() + "\n";
    }
  }
  return css;
}
