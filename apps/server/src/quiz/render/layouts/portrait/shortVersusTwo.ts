import type { QuizLayoutRenderDefinition } from "../types.js";
import { renderQuizFrameBody } from "../../frame/renderQuizFrameBody.js";
import { shortVersusTwoStyles } from "./styles/shortVersusTwo/shortVersusTwoStyles.js";

export const SHORT_VERSUS_BADGE_HTML = `<div class="short-versus-badge" data-layout-ignore aria-hidden="true">VS</div>`;

/**
 * Short Versus Two Layout (9:16 Quiz Short, 1080x1920): two portrait contender cards with a VS emblem.
 */
export const shortVersusTwoLayout = {
  id: "short_versus_two",
  renderBody: (slots) => renderQuizFrameBody(slots, `${slots.choicesHtml}${SHORT_VERSUS_BADGE_HTML}`),
  css: (aspectRatio) => shortVersusTwoStyles(aspectRatio),
} satisfies QuizLayoutRenderDefinition;
