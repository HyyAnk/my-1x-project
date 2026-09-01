import type { QuizLayoutRenderDefinition } from "./types.js";

export const mediaTopChoicesBottomLayout = {
  id: "media_top_choices_bottom",
  renderBody: (slots) => `${slots.questionBoxHtml}${slots.heroHtml}${slots.choicesHtml}<div class="phase-region">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
.layout-media_top_choices_bottom .game-stage { grid-template-columns: 1fr; grid-template-areas: "title" "hero" "answers"; align-items: center; justify-items: center; row-gap: 24px; }
.layout-media_top_choices_bottom .question-title { grid-area: title; width: 100%; max-width: 1440px; margin: 0 auto; }
.layout-media_top_choices_bottom .game-stage > .hero-image { grid-area: hero; width: 840px; height: 360px; margin: 0 auto; }
.layout-media_top_choices_bottom .answer-grid { grid-area: answers; width: 100%; max-width: 1540px; margin: 0 auto; display: grid; grid-template-columns: repeat(var(--choice-count, 3), 1fr); gap: 32px; box-sizing: border-box; }
.layout-media_top_choices_bottom .answer-grid.answer-count-2 { grid-template-columns: repeat(2, 1fr); max-width: 1100px; }
.layout-media_top_choices_bottom .answer-grid.answer-count-3 { grid-template-columns: repeat(3, 1fr); max-width: 1540px; }
.layout-media_top_choices_bottom.quiz-question-clip .hero-image { animation: enter-from-top .66s cubic-bezier(.22,.8,.3,1) var(--clip-start) both, hero-float var(--scene-duration) ease-in-out calc(var(--clip-start) + .66s) 1 alternate both; }

.layout-media_top_choices_bottom {
  --choice-card-min-height: 110px;
  --choice-card-height: 110px;
  --choice-card-margin-left: 60px;
  --choice-card-padding: 10px 24px 10px 32px;
  --choice-badge-size: 120px;
  --choice-badge-margin-left: -58px;
  --choice-badge-font-size: 64px;
  --choice-font-size-base: 36px;
  --choice-font-size-medium: 30px;
  --choice-font-size-long: 24px;
  --choice-font-size-very_long: 20px;
  --choice-font-size-overflow: 20px;
  --choice-fit-min: 18px;
  --choice-fit-max: 48px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
  --choice-fit-multiline-gain: 6px;
}

.has-mascot.layout-media_top_choices_bottom .answer-grid { max-width: 1360px; gap: 24px; }
.has-mascot.layout-media_top_choices_bottom {
  --choice-font-size-base: 32px;
  --choice-font-size-medium: 26px;
  --choice-font-size-long: 22px;
  --choice-font-size-very_long: 18px;
  --choice-font-size-overflow: 18px;
}

${
  aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .layout-media_top_choices_bottom .game-stage { grid-template-columns: 1fr; grid-template-areas: "title" "hero" "answers"; row-gap: 20px; }
#stage[data-aspect-ratio="9:16"] .layout-media_top_choices_bottom .game-stage > .hero-image { width: 100%; height: 420px; margin: 0; }
#stage[data-aspect-ratio="9:16"] .layout-media_top_choices_bottom .answer-grid { grid-template-columns: 1fr; width: 100%; gap: 20px; padding: 0; }
#stage[data-aspect-ratio="9:16"] .layout-media_top_choices_bottom {
  --choice-card-min-height: 110px;
  --choice-card-height: auto;
  --choice-card-margin-left: 64px;
  --choice-card-padding: 10px 24px 10px 30px;
  --choice-badge-size: 110px;
  --choice-badge-margin-left: -60px;
  --choice-badge-font-size: 58px;
  --choice-font-size-base: 36px;
  --choice-fit-max: 68px;
}
`
    : ""
}`,
} satisfies QuizLayoutRenderDefinition;
