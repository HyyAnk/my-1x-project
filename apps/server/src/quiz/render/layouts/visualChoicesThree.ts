import type { QuizLayoutRenderDefinition } from "./types.js";

export const visualChoicesThreeLayout = {
  id: "visual_choices_three",
  renderBody: (slots) => `${slots.questionBoxHtml}${slots.choicesHtml}<div class="phase-region">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
.layout-visual_choices_three .game-stage { grid-template-columns: 1fr; grid-template-areas: "title" "answers"; align-items: start; row-gap: 35px; }
.layout-visual_choices_three .question-title { grid-area: title; width: 100%; max-width: 1440px; justify-self: end; margin-left: auto; }
.layout-visual_choices_three .visual-answer-grid { grid-area: answers; width: 1560px; margin-top: 0; gap: 28px; }

.layout-visual_choices_three {
  --choice-media-height: 500px;
  --choice-label-min-height: 76px;
  --choice-label-padding: 8px 24px 8px 18px;
  --choice-badge-size: 108px;
  --choice-badge-margin-left: -56px;
  --choice-badge-font-size: 56px;
  --choice-label-font-size-base: 32px;
  --choice-label-font-size-medium: 28px;
  --choice-label-font-size-long: 24px;
  --choice-label-font-size-very_long: 24px;
  --choice-label-font-size-overflow: 24px;
}

.has-mascot.layout-visual_choices_three .visual-answer-grid { width: 100%; gap: 24px; }
.has-mascot.layout-visual_choices_three {
  --choice-label-min-height: 70px;
  --choice-badge-size: 98px;
  --choice-badge-margin-left: -50px;
  --choice-badge-font-size: 48px;
  --choice-label-font-size-base: 26px;
  --choice-label-font-size-medium: 22px;
  --choice-label-font-size-long: 19px;
  --choice-label-font-size-very_long: 17px;
  --choice-label-font-size-overflow: 17px;
}

${
  aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three .game-stage { grid-template-columns: 1fr; grid-template-areas: "title" "answers"; row-gap: 24px; }
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three .visual-answer-grid { width: 100%; grid-template-columns: 1fr; gap: 26px; }
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three {
  --choice-media-height: 360px;
  --choice-label-min-height: 74px;
  --choice-badge-size: 104px;
  --choice-badge-margin-left: -54px;
  --choice-badge-font-size: 52px;
}
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three .option-image { height: 320px; }
`
    : ""
}`,
} satisfies QuizLayoutRenderDefinition;
