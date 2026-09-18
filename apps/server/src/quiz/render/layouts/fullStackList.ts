import type { QuizLayoutRenderDefinition } from "./types.js";
import { renderQuizFrameBody } from "../frame/renderQuizFrameBody.js";
import { fullStackListStyles } from "./styles/fullStackList/index.js";

/**
 * Full Stack List Layout (16:9 Landscape Video, 1920x1080).
 *
 * Modularized per AGENTS.md clean code rules and Phase 05 specification.
 * Styles extracted into focused submodules under ./styles/fullStackList/.
 */
export const fullStackListLayout = {
  id: "full_stack_list",
  renderBody: (slots) => renderQuizFrameBody(slots, slots.choicesHtml),
  css: (aspectRatio) => fullStackListStyles(aspectRatio),
} satisfies QuizLayoutRenderDefinition;
