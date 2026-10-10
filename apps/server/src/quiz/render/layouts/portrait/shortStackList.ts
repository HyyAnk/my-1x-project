import type { QuizLayoutRenderDefinition } from "../types.js";
import { renderQuizFrameBody } from "../../frame/renderQuizFrameBody.js";
import { shortStackListStyles } from "./styles/shortStackList/shortStackListStyles.js";

/**
 * Short Stack List Layout (9:16 Quiz Short, 1080x1920): text question with 2 or 3 stacked choices.
 */
export const shortStackListLayout = {
  id: "short_stack_list",
  renderBody: (slots) => renderQuizFrameBody(slots, slots.choicesHtml),
  css: (aspectRatio) => shortStackListStyles(aspectRatio),
} satisfies QuizLayoutRenderDefinition;
