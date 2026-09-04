import type { QuizLayoutRenderDefinition } from "./types.js";

export const splitVersusTwoLayout = {
  id: "split_versus_two",
  renderBody: (slots) => `${slots.questionBoxHtml}${slots.choicesHtml}<div class="phase-region">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
.layout-split_versus_two .game-stage { grid-template-columns: 1fr; grid-template-areas: "title" "answers"; align-items: start; justify-items: center; row-gap: 32px; }
.layout-split_versus_two .question-title { grid-area: title; width: 100%; max-width: 1440px; margin: 0 auto; }
.layout-split_versus_two .answer-grid { grid-area: answers; width: 100%; max-width: 1560px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 56px; box-sizing: border-box; align-items: stretch; }
.layout-split_versus_two .visual-answer-grid { grid-area: answers; width: 100%; max-width: 1560px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 56px; box-sizing: border-box; }

.layout-split_versus_two {
  --choice-card-min-height: 480px;
  --choice-card-height: 480px;
  --choice-media-height: 400px;
  --choice-badge-size: 138px;
  --choice-badge-margin-left: -74px;
  --choice-badge-font-size: 72px;
  --choice-font-size-base: 46px;
  --choice-font-size-medium: 38px;
  --choice-font-size-long: 30px;
  --choice-font-size-very_long: 24px;
  --choice-font-size-overflow: 24px;
  --choice-fit-min: 22px;
  --choice-fit-max: 64px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
}

.has-mascot.layout-split_versus_two .answer-grid,
.has-mascot.layout-split_versus_two .visual-answer-grid { max-width: 1360px; gap: 36px; }

${
  aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .game-stage { grid-template-columns: 1fr; grid-template-areas: "title" "answers"; row-gap: 28px; }
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .answer-grid,
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .visual-answer-grid { grid-template-columns: 1fr; width: 100%; gap: 28px; padding: 0; }
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two {
  --choice-card-min-height: 280px;
  --choice-card-height: auto;
  --choice-media-height: 240px;
  --choice-badge-size: 124px;
  --choice-badge-margin-left: -70px;
  --choice-badge-font-size: 68px;
  --choice-font-size-base: 40px;
  --choice-fit-max: 72px;
}
`
    : ""
}`,
} satisfies QuizLayoutRenderDefinition;
