import type { QuizLayoutRenderDefinition } from "./types.js";
import { renderQuizFrameBody } from "../frame/renderQuizFrameBody.js";
import { verdictTrueFalseCss } from "./styles/verdictTrueFalse/verdictTrueFalseStyles.js";

/**
 * Verdict True or False Layout (16:9 Landscape Video, 1920×1080).
 */
export const verdictTrueFalseLayout = {
  id: "verdict_true_false",
  renderBody: (slots) => renderQuizFrameBody(slots, `${slots.heroHtml}${slots.choicesHtml}`),
  css: (aspectRatio) => verdictTrueFalseCss(aspectRatio),
} satisfies QuizLayoutRenderDefinition;
