import type { QuizLayoutRenderDefinition } from "../types.js";

/**
 * Portrait Stack List Layout (9:16 Vertical Video).
 *
 * Tailored specifically for 1080×1920 mobile portrait video (TikTok, YouTube Shorts, Instagram Reels).
 * Architectural upgrades:
 * 1. Question Box: Centered, max-width 820px, clearing the 194px hanging sign ropes (margin-top: 184px).
 * 2. Unified Co-Axial Centerline: Symmetric 820px content column guarantees >= 130-140px safe buffer
 *    on BOTH sides, unifying the vertical center axis at 540px and eliminating the 70px asymmetric axis shift.
 * 3. Corrected Multi-Phase Stagger: Choice entrance animations now sync with var(--choices-at)
 *    so the cascade waterfall plays visibly when narration completes:
 *    calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.06s * n) (cards 1..4).
 * 4. 4th Choice Token Support: Canonical purple/violet arcade palette tokens for Choice D.
 * 5. Adaptive Heights: Tailored min-heights and gaps for 2, 3, and 4 choices:
 *    - 2 choices: 156px cards, 32px gap
 *    - 3 choices: 132px cards, 22px gap
 *    - 4 choices: 114px cards, 16px gap
 * 6. Resilient Phase Region: Dynamic min-height ensures multi-line fact cards never clip.
 * 7. Mascot Safe Clearance: Enforces right: var(--safe-zone-right, 140px) on anchor-bottom_right;
 *    eliminates unnecessary font shrinkage penalty.
 */
export const portraitStackListLayout = {
  id: "portrait_stack_list",
  renderBody: (slots) =>
    `${slots.questionBoxHtml}${slots.choicesHtml}<div class="phase-region portrait-phase-embedded">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
/* === Portrait Stack List Layout (9:16 TikTok / Reels / Shorts) === */
.layout-portrait_stack_list .game-stage {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "title"
    "answers"
    "phase";
  justify-items: center;
  align-items: start;
  width: 100%;
  max-width: 820px;
  min-height: 0;
  margin: 184px auto 0;
  padding: 0 20px;
  box-sizing: border-box;
  row-gap: 24px;
}

/* Question Box: Centered, max-width 820px, ample padding for text clarity */
.layout-portrait_stack_list .question-title {
  grid-area: title;
  width: 100%;
  max-width: 820px;
  min-height: 140px;
  height: auto;
  margin: 0 auto;
  text-align: center;
  justify-self: center;
}
.layout-portrait_stack_list .question-card-inner {
  padding: 22px 34px;
  border-radius: 36px;
  box-sizing: border-box;
}

/* Answer List: Stacked full-width text choice pills in 820px symmetric content column */
.layout-portrait_stack_list .answer-grid {
  grid-area: answers;
  grid-template-columns: 1fr;
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding-right: 0; /* Co-axial centering with 820px max-width naturally provides (1080-820)/2 = 130-140px safe buffer */
  gap: 18px;
}

/* Adaptive vertical rhythm for 2, 3, and 4 choices */
.layout-portrait_stack_list .answer-grid.answer-count-2 {
  gap: 32px;
  padding-top: 12px;
  --choice-card-min-height: 156px;
  --choice-badge-size: 132px;
  --choice-badge-margin-left: -74px;
  --choice-badge-font-size: 72px;
  --choice-font-size-base: 44px;
  --choice-font-size-medium: 36px;
}

.layout-portrait_stack_list .answer-grid.answer-count-3 {
  gap: 22px;
  padding-top: 6px;
  --choice-card-min-height: 132px;
  --choice-badge-size: 122px;
  --choice-badge-margin-left: -70px;
  --choice-badge-font-size: 68px;
  --choice-font-size-base: 40px;
  --choice-font-size-medium: 32px;
}

.layout-portrait_stack_list .answer-grid.answer-count-4 {
  gap: 16px;
  padding-top: 0;
  --choice-card-min-height: 114px;
  --choice-badge-size: 114px;
  --choice-badge-margin-left: -66px;
  --choice-badge-font-size: 64px;
  --choice-font-size-base: 36px;
  --choice-font-size-medium: 30px;
}

/* Pill shape for text choice options */
.layout-portrait_stack_list .choice-card,
.layout-portrait_stack_list .choice-card-text,
.layout-portrait_stack_list .answer-card {
  border-radius: 9999px;
}

.layout-portrait_stack_list {
  --choice-card-min-height: 114px;
  --choice-card-height: auto;
  --choice-card-margin-left: 68px;
  --choice-card-padding: 14px 36px 14px 38px;
  --choice-text-padding-right: 44px;
  --choice-badge-size: 116px;
  --choice-badge-margin-left: -68px;
  --choice-badge-font-size: 64px;
  --choice-font-size-base: 38px;
  --choice-font-size-medium: 32px;
  --choice-font-size-long: 26px;
  --choice-font-size-very_long: 22px;
  --choice-font-size-overflow: 20px;
  --choice-fit-min: 20px;
  --choice-fit-max: 64px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.12;
  --choice-fit-multiline-gain: 4px;
}

/* 4th Choice (Choice D) Canonical Arcade Theme Palette Tokens */
.layout-portrait_stack_list .choice-card:nth-child(4),
.layout-portrait_stack_list .answer-card:nth-child(4) {
  --choice-stroke: #FFFFFF;
  --choice-stroke-shadow: #581C87;
  --choice-depth-shadow: #7E22CE;
  --choice-badge-grad: linear-gradient(180deg, #A855F7 0%, #7E22CE 100%);
  --choice-badge-border: #FFFFFF;
  --choice-bg-tint: linear-gradient(180deg, #F3E8FF 0%, #E9D5FF 100%);
  --choice-pattern: repeating-linear-gradient(45deg, transparent, transparent 14px, rgba(168,85,247,0.08) 14px, rgba(168,85,247,0.08) 28px);
  --choice-text-color: #3B0764;
  --choice-text-shadow: 0 1px 0 rgba(255,255,255,0.75);
}

/* Corrected Dynamic Staggered Waterfall Entrance Animations */
.layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(1) {
  animation: enter-from-left 0.48s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.06s) both;
}
.layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(2) {
  animation: enter-from-left 0.48s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.12s) both;
}
.layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(3) {
  animation: enter-from-left 0.48s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.18s) both;
}
.layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(4) {
  animation: enter-from-left 0.48s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.24s) both;
}

/* Embedded Phase Region: Placed directly below choices, flexible height for multi-line fact cards */
.layout-portrait_stack_list .phase-region {
  grid-area: phase;
  position: relative;
  z-index: 5;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  transform: none;
  width: 100%;
  max-width: 820px;
  min-height: 84px;
  height: auto;
  margin: 14px auto 0;
  box-sizing: border-box;
}
.layout-portrait_stack_list .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(720px, 100%);
  min-height: 72px;
}
.layout-portrait_stack_list .phase-region > .fact-card {
  position: relative;
  top: auto;
  bottom: auto;
  left: auto;
  transform: none;
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
  padding: 18px 30px;
  box-sizing: border-box;
}

/* Mascot Safe Positioning */
.has-mascot.layout-portrait_stack_list .candy-mascot-container,
.layout-portrait_stack_list.has-mascot .candy-mascot-container {
  bottom: 440px;
  left: 36px;
  right: auto;
}
.has-mascot.layout-portrait_stack_list .candy-mascot-container.anchor-bottom_right,
.layout-portrait_stack_list.has-mascot .candy-mascot-container.anchor-bottom_right {
  left: auto;
  right: var(--safe-zone-right, 140px);
  bottom: 440px;
}
.has-mascot.layout-portrait_stack_list .candy-mascot-container.anchor-bottom_left,
.layout-portrait_stack_list.has-mascot .candy-mascot-container.anchor-bottom_left {
  left: 36px;
  right: auto;
  bottom: 440px;
}

/* Specificity overrides for 9:16 stage canvas */
#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list .game-stage {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "title"
    "answers"
    "phase";
  width: calc(100% - 72px);
  max-width: 820px;
  min-height: 0;
  margin: 184px auto 0;
  padding-bottom: 0;
  margin-bottom: 440px; /* Guarantees at least 440px clean buffer from canvas bottom */
  row-gap: 24px;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list .question-title {
  width: 100%;
  max-width: 820px;
  min-height: 140px;
  height: auto;
  margin: 0 auto;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list .answer-grid {
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list .phase-region {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  transform: none;
  width: 100%;
  max-width: 820px;
  min-height: 84px;
  height: auto;
  margin: 14px auto 0;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(720px, 100%);
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list .phase-region > .fact-card {
  position: relative;
  top: auto;
  bottom: auto;
  left: auto;
  transform: none;
  width: 100%;
  max-width: 820px;
}

#stage[data-aspect-ratio="9:16"] .has-mascot.layout-portrait_stack_list .candy-mascot-container,
#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list.has-mascot .candy-mascot-container {
  bottom: 440px;
  left: 36px;
}
#stage[data-aspect-ratio="9:16"] .has-mascot.layout-portrait_stack_list .candy-mascot-container.anchor-bottom_right,
#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list.has-mascot .candy-mascot-container.anchor-bottom_right {
  left: auto;
  right: var(--safe-zone-right, 140px);
  bottom: 440px;
}
#stage[data-aspect-ratio="9:16"] .has-mascot.layout-portrait_stack_list .candy-mascot-container.anchor-bottom_left,
#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list.has-mascot .candy-mascot-container.anchor-bottom_left {
  left: 36px;
  right: auto;
  bottom: 440px;
}
`,
} satisfies QuizLayoutRenderDefinition;
