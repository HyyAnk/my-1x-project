import type { QuizLayoutRenderDefinition } from "./types.js";

export const verdictTrueFalseLayout = {
  id: "verdict_true_false",
  renderBody: (slots) => `${slots.questionBoxHtml}${slots.heroHtml}${slots.choicesHtml}<div class="phase-region">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
.layout-verdict_true_false .game-stage { grid-template-columns: minmax(0, 1.15fr) minmax(480px, .85fr); grid-template-areas: "title title" "hero answers"; align-items: start; column-gap: 48px; row-gap: 35px; }
.layout-verdict_true_false .question-title { grid-area: title; width: 100%; max-width: 1440px; justify-self: end; margin-left: auto; }
.layout-verdict_true_false .game-stage > .hero-image { grid-area: hero; width: 100%; height: 580px; margin-top: 0; }
.layout-verdict_true_false .answer-grid { grid-area: answers; grid-template-columns: 1fr; width: 100%; height: 580px; margin-top: 0; padding-top: 24px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; gap: 48px; }
.layout-verdict_true_false.quiz-question-clip .hero-image { animation: enter-from-left .66s cubic-bezier(.22,.8,.3,1) var(--clip-start) both, hero-float var(--scene-duration) ease-in-out calc(var(--clip-start) + .66s) 1 alternate both; }

.layout-verdict_true_false {
  --choice-card-min-height: 160px;
  --choice-card-height: 160px;
  --choice-card-margin-left: 80px;
  --choice-card-padding: 16px 36px 16px 48px;
  --choice-badge-size: 150px;
  --choice-badge-margin-left: -80px;
  --choice-badge-font-size: 80px;
  --choice-font-size-base: 52px;
  --choice-font-size-medium: 44px;
  --choice-font-size-long: 36px;
  --choice-font-size-very_long: 28px;
  --choice-font-size-overflow: 28px;
  --choice-fit-min: 24px;
  --choice-fit-max: 68px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
  --choice-fit-multiline-gain: 6px;
}

.has-mascot.layout-verdict_true_false .game-stage { column-gap: 36px; }
.has-mascot.layout-verdict_true_false {
  --choice-card-min-height: 140px;
  --choice-card-height: 140px;
  --choice-font-size-base: 44px;
  --choice-font-size-medium: 36px;
  --choice-font-size-long: 28px;
}

${
  aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .layout-verdict_true_false .game-stage { grid-template-columns: minmax(0, 1fr); grid-template-areas: "title" "hero" "answers"; row-gap: 24px; }
#stage[data-aspect-ratio="9:16"] .layout-verdict_true_false .game-stage > .hero-image { width: 100%; height: 500px; margin: 0; }
#stage[data-aspect-ratio="9:16"] .layout-verdict_true_false .answer-grid { width: 100%; height: auto; margin: 0; padding: 0; gap: 20px; }
#stage[data-aspect-ratio="9:16"] .layout-verdict_true_false {
  --choice-card-min-height: 120px;
  --choice-card-height: auto;
  --choice-card-margin-left: 68px;
  --choice-card-padding: 12px 28px 12px 32px;
  --choice-badge-size: 124px;
  --choice-badge-margin-left: -70px;
  --choice-badge-font-size: 68px;
  --choice-font-size-base: 42px;
  --choice-fit-max: 72px;
}
`
    : ""
}`,
} satisfies QuizLayoutRenderDefinition;
