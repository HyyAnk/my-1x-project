import type { QuizLayoutRenderDefinition } from "./types.js";

export const visualChoicesThreePureLayout = {
  id: "visual_choices_three_pure",
  renderBody: (slots) => `${slots.questionBoxHtml}${slots.choicesHtml}<div class="phase-region">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
.layout-visual_choices_three_pure .game-stage { grid-template-columns: 1fr; grid-template-areas: "title" "answers"; align-items: start; row-gap: 35px; }
.layout-visual_choices_three_pure .question-title { grid-area: title; width: 100%; max-width: 1440px; justify-self: end; margin-left: auto; }
.layout-visual_choices_three_pure .visual-answer-grid { grid-area: answers; width: 1560px; margin-top: 0; gap: 28px; }
.layout-visual_choices_three_pure .visual-answer-label { display: none; }
.layout-visual_choices_three_pure .option-image { height: 580px; }

.layout-visual_choices_three_pure {
  --choice-media-height: 580px;
  --choice-badge-size: 108px;
  --choice-badge-margin-left: -56px;
  --choice-badge-font-size: 56px;
}

.has-mascot.layout-visual_choices_three_pure .visual-answer-grid { width: 100%; gap: 24px; }
.has-mascot.layout-visual_choices_three_pure {
  --choice-media-height: 560px;
  --choice-badge-size: 98px;
  --choice-badge-margin-left: -50px;
  --choice-badge-font-size: 48px;
}

${
  aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .game-stage { grid-template-columns: 1fr; grid-template-areas: "title" "answers"; row-gap: 24px; }
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .visual-answer-grid { width: 100%; grid-template-columns: 1fr; gap: 26px; }
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure {
  --choice-media-height: 380px;
  --choice-badge-size: 104px;
  --choice-badge-margin-left: -54px;
  --choice-badge-font-size: 52px;
}
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .option-image { height: 380px; }
`
    : ""
}`,
} satisfies QuizLayoutRenderDefinition;
