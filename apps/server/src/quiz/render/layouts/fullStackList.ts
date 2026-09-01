import type { QuizLayoutRenderDefinition } from "./types.js";

export const fullStackListLayout = {
  id: "full_stack_list",
  renderBody: (slots) => `${slots.questionBoxHtml}${slots.choicesHtml}<div class="phase-region">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
.layout-full_stack_list .game-stage { grid-template-columns: 1fr; grid-template-areas: "title" "answers"; align-items: start; justify-items: center; row-gap: 32px; }
.layout-full_stack_list .question-title { grid-area: title; width: 100%; max-width: 1440px; margin: 0 auto; }
.layout-full_stack_list .answer-grid { grid-area: answers; width: 100%; max-width: 1440px; margin: 0 auto; display: flex; flex-direction: column; justify-content: flex-start; gap: 32px; box-sizing: border-box; }
.layout-full_stack_list .answer-grid.answer-count-2 { gap: 48px; padding-top: 40px; }
.layout-full_stack_list .answer-grid.answer-count-3 { gap: 28px; padding-top: 10px; }

.layout-full_stack_list {
  --choice-card-min-height: 126px;
  --choice-card-height: 126px;
  --choice-card-margin-left: 76px;
  --choice-card-padding: 14px 36px 14px 44px;
  --choice-badge-size: 140px;
  --choice-badge-margin-left: -76px;
  --choice-badge-font-size: 74px;
  --choice-font-size-base: 46px;
  --choice-font-size-medium: 38px;
  --choice-font-size-long: 30px;
  --choice-font-size-very_long: 24px;
  --choice-font-size-overflow: 24px;
  --choice-fit-min: 22px;
  --choice-fit-max: 64px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
  --choice-fit-multiline-gain: 6px;
}

.has-mascot.layout-full_stack_list .answer-grid { max-width: 1280px; }
.has-mascot.layout-full_stack_list {
  --choice-font-size-base: 40px;
  --choice-font-size-medium: 32px;
  --choice-font-size-long: 26px;
  --choice-font-size-very_long: 22px;
  --choice-font-size-overflow: 22px;
}

${
  aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .layout-full_stack_list .game-stage { grid-template-columns: 1fr; grid-template-areas: "title" "answers"; row-gap: 28px; }
#stage[data-aspect-ratio="9:16"] .layout-full_stack_list .answer-grid { width: 100%; gap: 24px; padding: 0; }
#stage[data-aspect-ratio="9:16"] .layout-full_stack_list {
  --choice-card-min-height: 116px;
  --choice-card-height: auto;
  --choice-card-margin-left: 68px;
  --choice-card-padding: 12px 28px 12px 32px;
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
