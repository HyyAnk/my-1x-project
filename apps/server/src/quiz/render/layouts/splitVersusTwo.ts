import type { QuizLayoutRenderDefinition } from "./types.js";
import { renderQuizFrameBody } from "../frame/renderQuizFrameBody.js";
import { splitVersusTwoCss } from "./styles/splitVersusTwoStyles.js";

/**
 * Split Versus Two Layout (16:9 Landscape Video, 1920×1080).
 */
export const splitVersusTwoLayout = {
  id: "split_versus_two",
  renderBody: (slots) => renderQuizFrameBody(slots, slots.choicesHtml),
  css: (aspectRatio) => splitVersusTwoCss(aspectRatio),
} satisfies QuizLayoutRenderDefinition;
