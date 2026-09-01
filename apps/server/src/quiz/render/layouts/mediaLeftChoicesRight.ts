import type { QuizLayoutRenderDefinition } from "./types.js";

export const mediaLeftChoicesRightLayout = {
  id: "media_left_choices_right",
  renderBody: (slots) => `${slots.questionBoxHtml}${slots.heroHtml}${slots.choicesHtml}<div class="phase-region">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
.layout-media_left_choices_right .game-stage { grid-template-columns: minmax(0, 1.08fr) minmax(520px, .92fr); grid-template-areas: "title title" "hero answers"; align-items: start; column-gap: 42px; row-gap: 35px; }
.layout-media_left_choices_right .question-title { grid-area: title; width: 100%; max-width: 1440px; justify-self: end; margin-left: auto; }
.layout-media_left_choices_right .game-stage > .hero-image { grid-area: hero; width: 100%; height: 580px; margin-top: 0; }
.layout-media_left_choices_right .answer-grid { grid-area: answers; grid-template-columns: 1fr; width: 100%; height: 580px; margin-top: 0; padding-top: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: flex-start; }
.layout-media_left_choices_right .answer-grid.answer-count-2 { gap: 50px; height: 580px; padding-top: 100px; }
.layout-media_left_choices_right .answer-grid.answer-count-3 { gap: 50px; height: 580px; padding-top: 18px; }
.layout-media_left_choices_right.quiz-question-clip .hero-image { animation: enter-from-left .66s cubic-bezier(.22,.8,.3,1) var(--clip-start) both, hero-float var(--scene-duration) ease-in-out calc(var(--clip-start) + .66s) 1 alternate both; }

.layout-media_left_choices_right {
  --choice-card-min-height: 116px;
  --choice-card-height: 116px;
  --choice-card-margin-left: 76px;
  --choice-card-padding: 12px 34px 12px 42px;
  --choice-badge-size: 138px;
  --choice-badge-margin-left: -74px;
  --choice-badge-font-size: 72px;
  --choice-font-size-base: 48px;
  --choice-font-size-medium: 40px;
  --choice-font-size-long: 32px;
  --choice-font-size-very_long: 26px;
  --choice-font-size-overflow: 26px;
  --choice-fit-min: 24px;
  --choice-fit-max: 64px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
  --choice-fit-multiline-gain: 6px;
}

.has-mascot.layout-media_left_choices_right .game-stage { column-gap: 34px; }
.has-mascot.layout-media_left_choices_right {
  --choice-font-size-base: 38px;
  --choice-font-size-medium: 30px;
  --choice-font-size-long: 24px;
  --choice-font-size-very_long: 20px;
  --choice-font-size-overflow: 20px;
}
.has-mascot.layout-media_left_choices_right .answer-count-2 {
  --choice-font-size-base: 42px;
}

${
  aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .layout-media_left_choices_right .game-stage { grid-template-columns: minmax(0, 1fr); grid-template-areas: "title" "hero" "answers"; row-gap: 24px; }
#stage[data-aspect-ratio="9:16"] .layout-media_left_choices_right .game-stage > .hero-image { width: 100%; height: 520px; margin: 0; }
#stage[data-aspect-ratio="9:16"] .layout-media_left_choices_right .answer-grid { width: 100%; height: auto; margin: 0; padding: 0; gap: 24px; }
#stage[data-aspect-ratio="9:16"] .layout-media_left_choices_right {
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
