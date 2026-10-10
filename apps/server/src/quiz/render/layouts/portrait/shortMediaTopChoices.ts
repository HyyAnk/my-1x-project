import type { QuizLayoutRenderDefinition } from "../types.js";
import { renderQuizFrameBody } from "../../frame/renderQuizFrameBody.js";
import { shortMediaTopChoicesStyles } from "./styles/shortMediaTopChoices/shortMediaTopChoicesStyles.js";

/**
 * Short Media Top Choices Layout (9:16 Quiz Short, 1080x1920): one hero image above stacked choices.
 */
export const shortMediaTopChoicesLayout = {
  id: "short_media_top_choices",
  renderBody: (slots) => renderQuizFrameBody(slots, `${slots.heroHtml}${slots.choicesHtml}`),
  css: (aspectRatio) => shortMediaTopChoicesStyles(aspectRatio),
} satisfies QuizLayoutRenderDefinition;
