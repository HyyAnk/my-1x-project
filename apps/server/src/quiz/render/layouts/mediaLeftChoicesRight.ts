import type { QuizLayoutRenderDefinition } from "./types.js";

export const mediaLeftChoicesRightLayout = {
  id: "media_left_choices_right",
  dimensions: { width: 840, height: 580 },
  renderBody: (slots) =>
    `${slots.questionBoxHtml}${slots.heroHtml}${slots.textChoicesHtml}<div class="phase-region">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
.layout-media_left_choices_right .game-stage { grid-template-columns: minmax(0, 1.08fr) minmax(520px, .92fr); grid-template-areas: "title title" "hero answers"; align-items: start; column-gap: 42px; row-gap: 35px; }
.layout-media_left_choices_right .question-title { grid-area: title; width: 100%; max-width: 1440px; justify-self: end; margin-left: auto; }
.layout-media_left_choices_right .game-stage > .hero-image { grid-area: hero; width: 100%; height: 580px; margin-top: 0; }
.layout-media_left_choices_right .answer-grid { grid-area: answers; grid-template-columns: 1fr; width: 100%; height: 580px; margin-top: 0; padding-top: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: flex-start; }
.layout-media_left_choices_right .answer-grid.answer-count-2 { gap: 50px; height: 580px; padding-top: 100px; }
.layout-media_left_choices_right .answer-count-2 .answer-card, .layout-media_left_choices_right .answer-count-3 .answer-card { height: 116px; min-height: 116px; margin-left: 76px; padding: 12px 34px 12px 42px; }
.layout-media_left_choices_right .answer-count-2 .answer-card::before, .layout-media_left_choices_right .answer-count-3 .answer-card::before { inset: 6px 14px 6px 24px; border-width: 3px; }
.layout-media_left_choices_right .answer-count-2 .answer-card > b, .layout-media_left_choices_right .answer-count-3 .answer-card > b { width: 138px; height: 138px; margin-left: -74px; font-size: 72px; border-width: 8px; }
.layout-media_left_choices_right .answer-count-2 .answer-card span, .layout-media_left_choices_right .answer-count-3 .answer-card span { font-size: 48px; }
.layout-media_left_choices_right .answer-count-2.choice-tier-medium span, .layout-media_left_choices_right .answer-count-3.choice-tier-medium span, .layout-media_left_choices_right .choice-tier-medium.answer-card span { font-size: 40px; }
.layout-media_left_choices_right .answer-count-2.choice-tier-long span, .layout-media_left_choices_right .answer-count-3.choice-tier-long span, .layout-media_left_choices_right .choice-tier-long.answer-card span { font-size: 32px; }
.layout-media_left_choices_right .answer-count-2.choice-tier-very_long span, .layout-media_left_choices_right .answer-count-2.choice-tier-overflow span, .layout-media_left_choices_right .answer-count-3.choice-tier-very_long span, .layout-media_left_choices_right .answer-count-3.choice-tier-overflow span, .layout-media_left_choices_right .choice-tier-very_long.answer-card span, .layout-media_left_choices_right .choice-tier-overflow.answer-card span { font-size: 26px; }
.layout-media_left_choices_right .answer-grid.answer-count-3 { gap: 50px; height: 580px; padding-top: 18px; }
.layout-media_left_choices_right.quiz-question-clip .hero-image { animation: enter-from-left .66s cubic-bezier(.22,.8,.3,1) var(--clip-start) both, hero-float var(--scene-duration) ease-in-out calc(var(--clip-start) + .66s) 1 alternate both; }
.has-mascot.layout-media_left_choices_right .game-stage { column-gap: 34px; }
.has-mascot.layout-media_left_choices_right .answer-card span { font-size: 38px; }
.has-mascot.layout-media_left_choices_right .answer-count-2 .answer-card span { font-size: 42px; }
.has-mascot.layout-media_left_choices_right .choice-tier-medium.answer-card span, .has-mascot.layout-media_left_choices_right .answer-count-3.choice-tier-medium span, .has-mascot.layout-media_left_choices_right .answer-count-2.choice-tier-medium span { font-size: 30px; }
.has-mascot.layout-media_left_choices_right .choice-tier-long.answer-card span, .has-mascot.layout-media_left_choices_right .answer-count-3.choice-tier-long span, .has-mascot.layout-media_left_choices_right .answer-count-2.choice-tier-long span { font-size: 24px; }
.has-mascot.layout-media_left_choices_right .choice-tier-very_long.answer-card span, .has-mascot.layout-media_left_choices_right .choice-tier-overflow.answer-card span, .has-mascot.layout-media_left_choices_right .answer-count-3.choice-tier-very_long span, .has-mascot.layout-media_left_choices_right .answer-count-3.choice-tier-overflow span, .has-mascot.layout-media_left_choices_right .answer-count-2.choice-tier-very_long span, .has-mascot.layout-media_left_choices_right .answer-count-2.choice-tier-overflow span { font-size: 20px; }
${
  aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .layout-media_left_choices_right .game-stage { grid-template-columns: 1fr; grid-template-areas: "title" "hero" "answers"; row-gap: 24px; }
#stage[data-aspect-ratio="9:16"] .layout-media_left_choices_right .game-stage > .hero-image { width: 100%; height: 520px; margin: 0; }
#stage[data-aspect-ratio="9:16"] .layout-media_left_choices_right .answer-grid { width: 100%; height: auto; margin: 0; padding: 0; gap: 24px; }
#stage[data-aspect-ratio="9:16"] .layout-media_left_choices_right .answer-card { min-height: 116px; height: auto; margin-left: 68px; padding: 12px 28px 12px 32px; }
#stage[data-aspect-ratio="9:16"] .layout-media_left_choices_right .answer-card > b { width: 124px; height: 124px; margin-left: -70px; font-size: 68px; }
#stage[data-aspect-ratio="9:16"] .layout-media_left_choices_right .answer-card span { font-size: 40px; }
`
    : ""
}`,
} satisfies QuizLayoutRenderDefinition;
