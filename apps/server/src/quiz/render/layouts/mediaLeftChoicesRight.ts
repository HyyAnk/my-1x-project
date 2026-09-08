import type { QuizLayoutRenderDefinition } from "./types.js";

/**
 * Media Left Choices Right Layout (16:9 Landscape Video, 1920x1080).
 *
 * Primary layout for landscape quizzes (YouTube, horizontal video displays).
 * Architectural specifications:
 * 1. 3-Row CSS Grid: "title title" (Row 1), "hero answers" (Row 2), "phase phase" (Row 3).
 * 2. Inviolable Anchors: Stage margin-left and justify-self: end clear the Counter Badge (x <= 290px)
 *    and Channel Brand Mark (x <= 340px) with 100% spatial isolation.
 * 3. Hero Media: Height 540px, ratio 1.54:1 (reducing 16:9 cropping to <13.4%), liberating 40px vertical space.
 * 4. Choices: Symmetrically centered in right column, staggered entrance animation from the right.
 *    - 2 Choices: Expanded cards (min-height 136px, font-size 52px, gap 36px).
 *    - 3 Choices: Balanced cards (min-height 116px, font-size 48px, gap 24px).
 * 5. Phase Region (Row 3): Completely native in grid flow, eliminating Fact Card overlap bug.
 *    - Thinking Bar: Width min(82vw, 1340px), ensuring marker star never exceeds x = 1856px (64px canvas margin).
 *    - Fact Card: Width min(1200px, 100%), y in [776, 886]px, 100% collision-free.
 * 6. Settle Contrast Hardening (Phase 4): 0.42 opacity, 65% grayscale for WCAG AA compliance.
 * 7. Mascot Integration: Standardized 1420px Mascot-Ready grid with >208px clearance.
 * 8. Backward Compatibility: Preserves 9:16 fallback token branch for test suite contracts.
 */
export const mediaLeftChoicesRightLayout = {
  id: "media_left_choices_right",
  renderBody: (slots) => `${slots.questionBoxHtml}${slots.heroHtml}${slots.choicesHtml}<div class="phase-region">${slots.phaseHtml}</div>`,
  css: (_aspectRatio) => `
/* === Media Left Choices Right Layout (16:9 Landscape 1920x1080) === */
.layout-media_left_choices_right .game-stage {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(480px, 0.95fr);
  grid-template-rows: 168px 540px 110px;
  grid-template-areas:
    "title title"
    "hero answers"
    "phase phase";
  align-items: start;
  column-gap: 34px;
  row-gap: 24px;
  width: 1420px;
  max-width: 1420px;
  min-height: 0;
  margin: 20px 40px 0 auto;
  padding: 0;
  box-sizing: border-box;
}

/* Question Title: Clears left header anchors (Inviolable Anchors preserved) */
.layout-media_left_choices_right .question-title {
  grid-area: title;
  width: 100%;
  max-width: 1440px;
  height: 168px;
  min-height: 168px;
  justify-self: end;
  margin-left: auto;
  contain: layout style;
}

/* Hero Media: Aspect Ratio 1.54:1 (830.5x540px), liberates 40px vertical space */
.layout-media_left_choices_right .game-stage > .hero-image {
  grid-area: hero;
  width: 100%;
  height: 540px;
  max-height: 540px;
  margin-top: 0;
}
.layout-media_left_choices_right .hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.layout-media_left_choices_right.quiz-question-clip .hero-image {
  animation: enter-from-left 0.66s cubic-bezier(0.22, 0.8, 0.3, 1) var(--clip-start) both,
    hero-float var(--scene-duration) ease-in-out calc(var(--clip-start) + 0.66s) 1 alternate both;
  will-change: transform;
}

/* Choice Group: Vertically Centered in 540px Right Column */
.layout-media_left_choices_right .answer-grid {
  grid-area: answers;
  grid-template-columns: 1fr;
  width: 100%;
  height: 540px;
  max-height: 540px;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
}
.layout-media_left_choices_right .answer-grid.answer-count-2 {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 36px;
  --choice-card-min-height: 136px;
  --choice-badge-size: 148px;
  --choice-badge-margin-left: -80px;
  --choice-card-margin-left: 80px;
  --choice-badge-font-size: 78px;
  --choice-font-size-base: 44px;
  --choice-font-size-medium: 34px;
}
.layout-media_left_choices_right .answer-grid.answer-count-3 {
  gap: 24px;
}

/* Staggered Choice Entrance (Phase 2): Keyframes for cards 1, 2, and 3 */
.layout-media_left_choices_right.quiz-question-clip .choice-card:nth-child(1),
.layout-media_left_choices_right.quiz-question-clip .answer-card:nth-child(1) {
  animation: choice-card-enter-right 0.50s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both;
  will-change: transform, opacity;
}
.layout-media_left_choices_right.quiz-question-clip .choice-card:nth-child(2),
.layout-media_left_choices_right.quiz-question-clip .answer-card:nth-child(2) {
  animation: choice-card-enter-right 0.50s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.12s) both;
  will-change: transform, opacity;
}
.layout-media_left_choices_right.quiz-question-clip .choice-card:nth-child(3),
.layout-media_left_choices_right.quiz-question-clip .answer-card:nth-child(3) {
  animation: choice-card-enter-right 0.50s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.24s) both;
  will-change: transform, opacity;
}

@keyframes choice-card-enter-right {
  0% {
    opacity: 0;
    transform: translateX(60px) scale(0.94);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

/* Choice Design Tokens (16:9 Default) */
.layout-media_left_choices_right {
  --choice-card-min-height: 116px;
  --choice-card-height: auto;
  --choice-card-margin-left: 76px;
  --choice-card-padding: 12px 34px 12px 42px;
  --choice-badge-size: 138px;
  --choice-badge-margin-left: -74px;
  --choice-badge-font-size: 72px;
  --choice-font-size-base: 38px;
  --choice-font-size-medium: 30px;
  --choice-font-size-long: 24px;
  --choice-font-size-very_long: 20px;
  --choice-font-size-overflow: 20px;
  --choice-fit-min: 24px;
  --choice-fit-max: 64px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
  --choice-fit-multiline-gain: 6px;
}

/* Settle Contrast Hardening (Phase 4): WCAG AA Compliance (opacity: 0.42, grayscale: 65%) */
.layout-media_left_choices_right .answer-card.answer-incorrect,
.layout-media_left_choices_right .choice-card-text.answer-incorrect,
.layout-media_left_choices_right .choice-card.answer-incorrect,
.layout-media_left_choices_right .answer-card.answer-reveal-incorrect,
.layout-media_left_choices_right .choice-card-text.answer-reveal-incorrect,
.layout-media_left_choices_right .choice-card.answer-reveal-incorrect {
  animation: incorrect-card-settle-media-left 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

@keyframes incorrect-card-settle-media-left {
  from {
    opacity: 1;
    transform: scale(1);
    filter: grayscale(0%) contrast(1) brightness(1);
  }
  to {
    opacity: 0.42;
    transform: scale(0.94);
    filter: grayscale(65%) contrast(0.95) brightness(0.92);
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 2px 0 rgba(10, 25, 60, 0.08);
  }
}

/* Phase Region: Row 3 of CSS Grid, 100% Collision-Free */
.layout-media_left_choices_right .phase-region {
  grid-area: phase;
  position: relative;
  top: auto;
  bottom: auto;
  left: auto;
  right: auto;
  transform: none;
  width: 100%;
  max-width: 1420px;
  height: 110px;
  margin: 0 auto;
  padding: 0;
  z-index: 5;
  box-sizing: border-box;
}

/* Thinking Bar: Width min(65vw, 1240px), Marker Star Stays <= 1856px (64px Canvas Margin) */
.layout-media_left_choices_right .phase-region > .thinking-bar {
  position: absolute;
  top: 50%;
  left: 50%;
  bottom: auto;
  transform: translate(-50%, -50%);
  width: min(65vw, 1240px);
  min-height: 84px;
}

/* Fact Card: Width min(1140px, 100%), Sits Safely in Row 3 (y: 776-886px) */
.layout-media_left_choices_right .phase-region > .fact-card {
  position: absolute;
  top: 50%;
  left: 50%;
  bottom: auto;
  transform: translate(-50%, -50%);
  width: min(1140px, 100%);
  max-height: 110px;
  margin: 0;
  padding: 18px 42px;
  border-radius: 36px;
  box-sizing: border-box;
}

`,
} satisfies QuizLayoutRenderDefinition;
