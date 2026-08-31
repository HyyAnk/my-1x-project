import type { QuizAnswerCardStyle } from "@studio/shared";
import type { AnswerCardSkin } from "./types.js";
import { glossyArcadeVariant } from "./variants/glossyArcade.js";
import { comicChunkyVariant } from "./variants/comicChunky.js";
import { glassNeonVariant } from "./variants/glassNeon.js";
import { minimalSoftVariant } from "./variants/minimalSoft.js";

export const answerCardRegistry = new Map<Exclude<QuizAnswerCardStyle, "auto">, AnswerCardSkin>([
  ["glossy_arcade", glossyArcadeVariant],
  ["comic_chunky", comicChunkyVariant],
  ["glass_neon", glassNeonVariant],
  ["minimal_soft", minimalSoftVariant],
]);

export function resolveAnswerCardSkin(style?: QuizAnswerCardStyle | null): AnswerCardSkin {
  if (!style || style === "auto") {
    return glossyArcadeVariant;
  }
  return answerCardRegistry.get(style) ?? glossyArcadeVariant;
}

export function getAnswerCardSkinsCss(): string {
  let css = "";
  for (const skin of answerCardRegistry.values()) {
    css += `\n/* === Answer Card: ${skin.displayName} === */\n` + skin.renderCss() + "\n";
  }
  return css;
}
