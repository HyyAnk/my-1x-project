import type { QuizLayoutRenderDefinition } from "./types.js";
import { renderQuizFrameBody } from "../frame/renderQuizFrameBody.js";
import { verdictYesNoCss } from "./styles/verdictYesNo/verdictYesNoStyles.js";

/**
 * Verdict Yes or No Layout (16:9 Landscape Video, 1920×1080).
 */
export const verdictYesNoLayout = {
  id: "verdict_yes_no",
  renderBody: (slots) => renderQuizFrameBody(slots, `${slots.heroHtml}${slots.choicesHtml}`),
  css: (aspectRatio) => verdictYesNoCss(aspectRatio),
} satisfies QuizLayoutRenderDefinition;
