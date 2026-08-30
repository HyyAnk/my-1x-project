import type { QuizLayoutRenderDefinition } from "./types.js";

export const visualChoicesThreeLayout = {
  id: "visual_choices_three",
  dimensions: { width: 501, height: 500, count: 3 },
  renderBody: (slots) => `${slots.questionBoxHtml}${slots.visualChoicesHtml}<div class="phase-region">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
.layout-visual_choices_three .game-stage { grid-template-columns: 1fr; grid-template-areas: "title" "answers"; align-items: start; row-gap: 35px; }
.layout-visual_choices_three .question-title { grid-area: title; width: 100%; max-width: 1440px; justify-self: end; margin-left: auto; }
.layout-visual_choices_three .visual-answer-grid { grid-area: answers; width: 1560px; margin-top: 0; gap: 28px; }
.has-mascot.layout-visual_choices_three .visual-answer-grid { width: 100%; gap: 24px; }
${
  aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three .game-stage { grid-template-columns: 1fr; grid-template-areas: "title" "answers"; row-gap: 24px; }
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three .visual-answer-grid { width: 100%; grid-template-columns: 1fr; gap: 26px; }
`
    : ""
}`,
} satisfies QuizLayoutRenderDefinition;
