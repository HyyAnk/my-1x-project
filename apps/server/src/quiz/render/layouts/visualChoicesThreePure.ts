import type { QuizLayoutRenderDefinition } from "./types.js";
import { renderQuizFrameBody } from "../frame/renderQuizFrameBody.js";
import { visualChoicesThreePureCss } from "./styles/visualChoicesThreePure/visualChoicesThreePureStyles.js";

/**
 * Visual Choices Three Pure Layout (16:9 Landscape Video, 1920x1080).
 */
export const visualChoicesThreePureLayout = {
  id: "visual_choices_three_pure",
  renderBody: (slots) => renderQuizFrameBody(slots, slots.choicesHtml),
  css: (aspectRatio) => visualChoicesThreePureCss(aspectRatio),
} satisfies QuizLayoutRenderDefinition;
