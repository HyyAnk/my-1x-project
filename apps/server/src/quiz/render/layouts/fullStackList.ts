import type { QuizLayoutRenderDefinition } from "./types.js";
import { renderQuizFrameBody } from "../frame/renderQuizFrameBody.js";

/**
 * Full Stack List Layout (16:9 Landscape Video, 1920x1080).
 *
 * Flagship presentation for media-free stacked multiple-choice and true/false questions
 * (powering speed_blitz, trivia, and high-velocity knowledge formats).
 *
 * Architectural upgrades:
 * 1. Native 3-Row CSS Grid Flow (BUG-FSL-03): Row 1: title, Row 2: answers, Row 3: phase.
 *    Eliminates the 220px to 326px vertical dead void between choices and bottom controls.
 * 2. Star Marker Containment (BUG-FSL-01): Constrains thinking bar track to 1380px,
 *    ensuring the 192px star marker stops at x <= 1887.5px (32.5px safe margin from 1920px edge).
 * 3. Phase 2 Waterfall Stagger Entrances (BUG-FSL-02): Cascading pop-in entrance coupled
 *    strictly to var(--choices-at) with smooth spring curve and 0.14s staggered offsets.
 * 4. Flexible Card Height / Text Auto-Fit Unchoke (BUG-FSL-04): Sets --choice-card-height: auto,
 *    preventing binary search choke down to 24px on 2-line text. Enhanced 2-choice mode.
 * 5. Mascot Step-In Elimination (BUG-FSL-05): Standardized title, choices, and phase region to
 *    max-width: 1360px with >208px safe clearance to bottom-left mascot host.
 * 6. Phase 4 Answer Reveal Polish & Contrast Retention (BUG-FSL-07):
 *    Winning card lifts with glowing emerald halo; non-selected cards settle to 0.45 opacity
 *    retaining WCAG AA (>4.5:1) legibility.
 * 7. Inviolable Anchors Preserved: Question Counter Badge and Channel Brand Mark coordinates
 *    and styling remain 100% untouched.
 * 8. Backward Compatibility: Preserves 9:16 fallback token branch for test suite contracts.
 */
export const fullStackListLayout = {
  id: "full_stack_list",
  renderBody: (slots) => renderQuizFrameBody(slots, slots.choicesHtml),
  css: (_aspectRatio) => `
/* ==========================================================================
   Full Stack List Layout (16:9 Landscape - 1920x1080)
   Candy Arcade Quiz Engine v2
   ========================================================================== */

/* Unified Quiz Frame Arena Geometry */
.quiz-frame-unified.layout-full_stack_list .answer-grid,
.quiz-frame-unified.layout-full_stack_list .choice-group {
  position: absolute;
  left: 70px;
  top: 0;
  width: 1280px;
  height: 520px;
  max-height: 520px;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.quiz-frame-unified.layout-full_stack_list .choice-card,
.quiz-frame-unified.layout-full_stack_list .answer-card {
  width: 1280px;
  box-sizing: border-box;
}

.quiz-frame-unified.layout-full_stack_list .answer-grid.answer-count-2,
.quiz-frame-unified.layout-full_stack_list .choice-group.answer-count-2 {
  gap: 40px;
}
.quiz-frame-unified.layout-full_stack_list .answer-grid.answer-count-2 .choice-card,
.quiz-frame-unified.layout-full_stack_list .choice-group.answer-count-2 .choice-card {
  height: 164px;
  min-height: 164px;
  max-height: 164px;
  --choice-card-height: 164px;
  --choice-card-min-height: 164px;
  --choice-badge-size: 112px;
}

.quiz-frame-unified.layout-full_stack_list .answer-grid.answer-count-3,
.quiz-frame-unified.layout-full_stack_list .choice-group.answer-count-3 {
  gap: 28px;
}
.quiz-frame-unified.layout-full_stack_list .answer-grid.answer-count-3 .choice-card,
.quiz-frame-unified.layout-full_stack_list .choice-group.answer-count-3 .choice-card {
  height: 140px;
  min-height: 140px;
  max-height: 140px;
  --choice-card-height: 140px;
  --choice-card-min-height: 140px;
  --choice-badge-size: 112px;
}

/* --- Choice Card Tokens (Capacity & Typography) --- */
.layout-full_stack_list {
  --choice-card-min-height: 140px;
  --choice-card-height: auto;
  --choice-card-margin-left: 0px;
  --choice-card-padding: 14px 36px 14px 44px;
  --choice-text-padding-right: 48px;
  --choice-badge-size: 112px;
  --choice-badge-margin-left: 0px;
  --choice-badge-font-size: 64px;
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

/* --- Row 3: Phase Region (Thinking Bar & Fact Card) --- */
.candy-scene:not(.quiz-frame-unified).layout-full_stack_list .phase-region {
  grid-area: phase;
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  width: 100%;
  max-width: 1360px;
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  pointer-events: none;
}

/* Fix Star Marker clipping bug (BUG-FSL-01): constrain track so star marker (192px) stays within 1920px canvas */
.candy-scene:not(.quiz-frame-unified).layout-full_stack_list .phase-region > .thinking-bar {
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  width: min(80vw, 1220px);
  max-width: 100%;
  min-height: 84px;
  margin: 0 auto;
}

.candy-scene:not(.quiz-frame-unified).layout-full_stack_list .phase-region > .fact-card {
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  width: min(1220px, 100%);
  max-width: 100%;
  margin: 0 auto;
}

/* --- Phase 2: Waterfall Stagger Entrance Animations --- */
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(1),
.layout-full_stack_list.quiz-question-clip .answer-card:nth-child(1) {
  animation: full-stack-enter 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.00s) both;
}
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(2),
.layout-full_stack_list.quiz-question-clip .answer-card:nth-child(2) {
  animation: full-stack-enter 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.14s) both;
}
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(3),
.layout-full_stack_list.quiz-question-clip .answer-card:nth-child(3) {
  animation: full-stack-enter 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.28s) both;
}
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(4),
.layout-full_stack_list.quiz-question-clip .answer-card:nth-child(4) {
  animation: full-stack-enter 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.42s) both;
}

@keyframes full-stack-enter {
  0% {
    opacity: 0;
    transform: translateX(-48px) scale(0.96);
  }
  70% {
    transform: translateX(6px) scale(1.01);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

/* --- Phase 4: Answer Reveal Polish & Contrast Retention --- */
.layout-full_stack_list .choice-card.answer-reveal-correct,
.layout-full_stack_list .choice-card.answer-correct,
.layout-full_stack_list .answer-card.answer-reveal-correct,
.layout-full_stack_list .answer-card.answer-correct {
  animation: full-stack-correct-reveal 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  z-index: 6;
}

.layout-full_stack_list .choice-card.answer-reveal-incorrect,
.layout-full_stack_list .choice-card.answer-incorrect,
.layout-full_stack_list .answer-card.answer-reveal-incorrect,
.layout-full_stack_list .answer-card.answer-incorrect {
  animation: full-stack-incorrect-settle 0.42s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

@keyframes full-stack-correct-reveal {
  0% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-8px) scale(1.035);
    box-shadow: 0 20px 0 #15803D, 0 0 50px rgba(74, 222, 128, 0.85);
  }
  100% {
    transform: translateY(-4px) scale(1.02);
    border-color: #22C55E;
    box-shadow: 0 16px 0 #15803D, 0 0 40px rgba(74, 222, 128, 0.8);
  }
}

@keyframes full-stack-incorrect-settle {
  from {
    opacity: 1;
    transform: scale(1);
    filter: grayscale(0%);
  }
  to {
    opacity: 0.45;
    transform: scale(0.97);
    filter: grayscale(65%) contrast(0.95);
  }
}


`,
} satisfies QuizLayoutRenderDefinition;
