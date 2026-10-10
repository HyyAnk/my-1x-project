import type { QuizLayoutRenderDefinition } from "../types.js";
import { renderQuizFrameBody } from "../../frame/renderQuizFrameBody.js";
import { shortVerdictYesNoStyles } from "./styles/shortVerdictYesNo/shortVerdictYesNoStyles.js";

/**
 * Short Verdict Yes/No Layout (9:16 Quiz Short, 1080x1920): hero image with two large pill buttons.
 */
export const shortVerdictYesNoLayout = {
  id: "short_verdict_yes_no",
  renderBody: (slots) => renderQuizFrameBody(slots, `${slots.heroHtml}${slots.choicesHtml}`),
  css: (aspectRatio) => shortVerdictYesNoStyles(aspectRatio),
} satisfies QuizLayoutRenderDefinition;
