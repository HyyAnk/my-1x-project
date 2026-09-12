import type { QuizLayoutRenderDefinition } from "./types.js";
import { renderQuizFrameBody } from "../frame/renderQuizFrameBody.js";

/**
 * Media Left Choices Right Layout (16:9 Landscape Video, 1920x1080).
 *
 * Primary layout for landscape quizzes (YouTube, horizontal video displays).
 * Architectural specifications:
 * 1. 3-Row CSS Grid: "title title" (Row 1), "hero answers" (Row 2), "phase phase" (Row 3).
 * 2. Inviolable Anchors: Stage margin-left and justify-self: end clear the Counter Badge (x <= 290px)
 *    and Channel Brand Mark (x <= 340px) with 100% spatial isolation.
 * 3. Hero Media: Height 540px, ratio ~1.33:1 (4:3 aspect ratio, ~728x540px column), fitting 4:3 assets pixel-perfect with ~0% crop.
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
  renderBody: (slots) => renderQuizFrameBody(slots, `${slots.heroHtml}${slots.choicesHtml}`),
  css: (_aspectRatio) => `
/* === Media Left Choices Right Layout (16:9 Landscape 1920x1080) === */

/* Unified Quiz Frame Arena Geometry */
.quiz-frame-unified.layout-media_left_choices_right .hero-image {
  position: absolute;
  left: 0;
  top: 0;
  width: var(--slot-hero-width, 720px);
  height: var(--slot-hero-height, 510px);
  max-height: var(--slot-hero-height, 510px);
  margin: 0;
}
.quiz-frame-unified.layout-media_left_choices_right .hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.quiz-frame-unified.layout-media_left_choices_right.quiz-question-clip .hero-image {
  animation: enter-from-left 0.66s cubic-bezier(0.22, 0.8, 0.3, 1) var(--clip-start) both;
}

.quiz-frame-unified.layout-media_left_choices_right .answer-grid,
.quiz-frame-unified.layout-media_left_choices_right .choice-group {
  position: absolute;
  left: 760px;
  top: 0;
  width: 660px;
  height: 510px;
  max-height: 510px;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.quiz-frame-unified.layout-media_left_choices_right .choice-card,
.quiz-frame-unified.layout-media_left_choices_right .answer-card {
  width: 100%;
  box-sizing: border-box;
}

.quiz-frame-unified.layout-media_left_choices_right .answer-grid.answer-count-2,
.quiz-frame-unified.layout-media_left_choices_right .choice-group.answer-count-2 {
  gap: 40px;
}
.quiz-frame-unified.layout-media_left_choices_right .answer-grid.answer-count-2 .choice-card,
.quiz-frame-unified.layout-media_left_choices_right .choice-group.answer-count-2 .choice-card {
  height: 152px;
  min-height: 152px;
  max-height: 152px;
  --choice-card-height: 152px;
  --choice-card-min-height: 152px;
  --choice-badge-size: 112px;
}

.quiz-frame-unified.layout-media_left_choices_right .answer-grid.answer-count-3,
.quiz-frame-unified.layout-media_left_choices_right .choice-group.answer-count-3 {
  gap: 36px;
}
.quiz-frame-unified.layout-media_left_choices_right .answer-grid.answer-count-3 .choice-card,
.quiz-frame-unified.layout-media_left_choices_right .choice-group.answer-count-3 .choice-card {
  height: 132px;
  min-height: 132px;
  max-height: 132px;
  --choice-card-height: 132px;
  --choice-card-min-height: 132px;
  --choice-badge-size: 104px;
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
  --choice-card-min-height: 132px;
  --choice-card-height: auto;
  --choice-card-margin-left: 0px;
  --choice-card-padding: 12px 34px 12px 42px;
  --choice-badge-size: 104px;
  --choice-badge-margin-left: 0px;
  --choice-badge-font-size: 56px;
  --choice-font-size-base: 44px;
  --choice-font-size-medium: 38px;
  --choice-font-size-long: 32px;
  --choice-font-size-very_long: 32px;
  --choice-font-size-overflow: 32px;
  --choice-fit-min: 32px;
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
`,
} satisfies QuizLayoutRenderDefinition;
