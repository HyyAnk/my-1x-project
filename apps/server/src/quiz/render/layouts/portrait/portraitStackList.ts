import type { QuizLayoutRenderDefinition } from "../types.js";

/**
 * Portrait Stack List Layout (9:16 Vertical Video).
 *
 * Tailored specifically for 1080×1920 mobile portrait video (TikTok, YouTube Shorts, Instagram Reels).
 * Architectural requirements:
 * 1. Question Box: Centered at top, max-width ~880px, ample padding for text clarity.
 * 2. Answer List:
 *    - Full-width stacked text option pills (typically 3 or 4 choices, also supports 2).
 *    - High legibility, responsive font sizing for long text options.
 *    - Safe-zone clearance: >= 140px right padding (padding-right: 140px) protecting choices
 *      from TikTok/Reels right action rail (Like, Comment, Share, Bookmark).
 * 3. Embedded Phase Region / Thinking Bar:
 *    - Positioned cleanly right below the choices in natural document flow (NOT pinned to screen bottom!).
 *    - At or above y = 1480px, maintaining clean hierarchy.
 * 4. Mascot Safe Positioning:
 *    - When mascot is enabled (.has-mascot), anchors the mascot container safely above the 400px
 *      bottom safe zone (bottom: 440px; left: 36px;), ensuring Tino's sprite never collides with
 *      or gets obscured by the TikTok creator handle or multi-line caption.
 * 5. Bottom Clearance:
 *    - Guarantees at least 440px clean buffer from the bottom of the canvas for TikTok/Reels
 *      creator handle, caption, and audio marquee (margin-bottom: 440px).
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
  max-width: 960px;
  min-height: 0;
  margin: 140px auto 0;
  padding: 0 24px;
  box-sizing: border-box;
  row-gap: 28px;
}

/* Question Box: Centered, max-width ~880px, ample padding for text clarity */
.layout-portrait_stack_list .question-title {
  grid-area: title;
  width: 100%;
  max-width: 880px;
  min-height: 140px;
  height: auto;
  margin: 0 auto;
  text-align: center;
  justify-self: center;
}
.layout-portrait_stack_list .question-card-inner {
  padding: 24px 36px;
  border-radius: 36px;
  box-sizing: border-box;
}

/* Answer List: 3 to 4 horizontal text choice pills with >= 140px right safe-zone clearance */
.layout-portrait_stack_list .answer-grid {
  grid-area: answers;
  grid-template-columns: 1fr;
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding-right: 140px; /* Safe-zone clearance >= 140px for TikTok/Reels right action rail */
  gap: 20px;
}

.layout-portrait_stack_list .answer-grid.answer-count-2 {
  gap: 28px;
  padding-top: 16px;
}

.layout-portrait_stack_list .answer-grid.answer-count-3 {
  gap: 22px;
  padding-top: 8px;
}

.layout-portrait_stack_list .answer-grid.answer-count-4 {
  gap: 16px;
  padding-top: 0;
}

/* Pill shape for text choice options */
.layout-portrait_stack_list .choice-card,
.layout-portrait_stack_list .choice-card-text,
.layout-portrait_stack_list .answer-card {
  border-radius: 9999px;
}

.layout-portrait_stack_list {
  --choice-card-min-height: 110px;
  --choice-card-height: auto;
  --choice-card-margin-left: 68px;
  --choice-card-padding: 14px 32px 14px 36px;
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
  --choice-fit-leading: 1.1;
  --choice-fit-multiline-gain: 4px;
}

/* When mascot is present, adjust choice card typography to maintain legibility */
.has-mascot.layout-portrait_stack_list {
  --choice-font-size-base: 34px;
  --choice-font-size-medium: 28px;
  --choice-font-size-long: 24px;
  --choice-font-size-very_long: 20px;
}

/* Dynamic staggered entrance animations for choice cards */
.layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(1) {
  animation: enter-from-left 0.52s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start) + 0.10s) both;
}
.layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(2) {
  animation: enter-from-left 0.52s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start) + 0.18s) both;
}
.layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(3) {
  animation: enter-from-left 0.52s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start) + 0.26s) both;
}
.layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(4) {
  animation: enter-from-left 0.52s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start) + 0.34s) both;
}

/* Embedded Phase Region: Placed directly below choices in natural flow, at or above y = 1480px */
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
  max-width: 880px;
  height: 90px;
  margin: 16px auto 0;
  padding-right: 140px; /* Safe-zone clearance >= 140px aligned with choice pills */
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
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(880px, 100%);
  margin-top: 0;
  padding: 16px 28px;
}

/* Mascot Safe Positioning:
 * When mascot is enabled (.has-mascot), anchor safely above the 400px bottom safe zone
 * (bottom: 440px; left: 36px;) ensuring Tino's sprite never collides with or gets obscured
 * by the TikTok/Reels creator handle, caption, or audio marquee!
 */
.has-mascot.layout-portrait_stack_list .candy-mascot-container,
.layout-portrait_stack_list.has-mascot .candy-mascot-container {
  bottom: 440px;
  left: 36px;
  right: auto;
}
.has-mascot.layout-portrait_stack_list .candy-mascot-container.anchor-bottom_right,
.layout-portrait_stack_list.has-mascot .candy-mascot-container.anchor-bottom_right {
  left: auto;
  right: 36px;
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
  max-width: 960px;
  min-height: 0;
  margin: 140px auto 0;
  padding-bottom: 0;
  margin-bottom: 440px; /* Bottom safe-zone clearance: guarantees at least 440px clean buffer from bottom */
  row-gap: 28px;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list .question-title {
  width: 100%;
  max-width: 880px;
  min-height: 140px;
  height: auto;
  margin: 0 auto;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list .answer-grid {
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
  padding-right: 140px; /* Safe-zone clearance >= 140px for TikTok/Reels right action rail */
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list .phase-region {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  transform: none;
  width: 100%;
  max-width: 880px;
  height: 90px;
  margin: 16px auto 0;
  padding-right: 140px; /* Safe-zone clearance >= 140px */
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
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(880px, 100%);
}

#stage[data-aspect-ratio="9:16"] .has-mascot.layout-portrait_stack_list .candy-mascot-container,
#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list.has-mascot .candy-mascot-container {
  bottom: 440px;
  left: 36px;
}
#stage[data-aspect-ratio="9:16"] .has-mascot.layout-portrait_stack_list .candy-mascot-container.anchor-bottom_right,
#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list.has-mascot .candy-mascot-container.anchor-bottom_right {
  left: auto;
  right: 36px;
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
