import type { QuizLayoutRenderDefinition } from "./types.js";
import { renderQuizFrameBody } from "../frame/renderQuizFrameBody.js";
import { mediaLeftChoicesRightStyles } from "./styles/mediaLeftChoicesRight/index.js";

/**
 * Media Left Choices Right Layout (16:9 Landscape Video, 1920x1080).
 *
 * Modularized per AGENTS.md clean code rules and Phase 05 specification.
 * Styles extracted into focused submodules under ./styles/mediaLeftChoicesRight/.
 */
export const mediaLeftChoicesRightLayout = {
  id: "media_left_choices_right",
  renderBody: (slots) => renderQuizFrameBody(slots, `${slots.heroHtml}${slots.choicesHtml}`),
  css: (aspectRatio) => mediaLeftChoicesRightStyles(aspectRatio),
} satisfies QuizLayoutRenderDefinition;
