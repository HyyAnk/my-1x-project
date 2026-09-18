import type { QuizLayoutRenderDefinition } from "./types.js";
import { renderQuizFrameBody } from "../frame/renderQuizFrameBody.js";
import { visualChoicesThreeStyles } from "./styles/visualChoicesThree/index.js";

/**
 * Visual Choices Three Layout (16:9 Landscape Video, 1920x1080).
 *
 * Modularized per AGENTS.md clean code rules and Phase 06 specification.
 * Styles extracted into focused submodules under ./styles/visualChoicesThree/.
 */
export const visualChoicesThreeLayout = {
  id: "visual_choices_three",
  renderBody: (slots) => renderQuizFrameBody(slots, slots.choicesHtml),
  css: (aspectRatio) => visualChoicesThreeStyles(aspectRatio),
} satisfies QuizLayoutRenderDefinition;
