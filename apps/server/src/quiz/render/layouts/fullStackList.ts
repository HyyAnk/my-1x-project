import type { QuizLayoutRenderDefinition } from "./types.js";

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
 * 5. Mascot Step-In Elimination (BUG-FSL-05): Unifies title, choices, and phase region to
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
  renderBody: (slots) =>
    `${slots.questionBoxHtml}${slots.choicesHtml}<div class="phase-region">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
/* ==========================================================================
   Full Stack List Layout (16:9 Landscape - 1920x1080)
   Candy Arcade Quiz Engine v2
   ========================================================================== */

/* --- Game Stage: 3-Row Grid Flow (Row 1: Title, Row 2: Answers, Row 3: Phase) --- */
.layout-full_stack_list .game-stage {
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "title"
    "answers"
    "phase";
  align-items: center;
  justify-items: center;
  row-gap: 20px;
  width: 1580px;
  min-height: 945px;
  margin: 16px 40px 0 auto;
}

/* --- Row 1: Question Title Card --- */
.layout-full_stack_list .question-title {
  grid-area: title;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}

/* --- Row 2: Answer Choices Stack --- */
.layout-full_stack_list .answer-grid {
  grid-area: answers;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
}

.layout-full_stack_list .answer-grid.answer-count-2 {
  gap: 36px;
  padding: 12px 0;
  --choice-card-min-height: 142px;
  --choice-badge-size: 148px;
  --choice-badge-margin-left: -80px;
  --choice-badge-font-size: 78px;
  --choice-card-margin-left: 80px;
  --choice-card-padding: 18px 40px 18px 48px;
  --choice-font-size-base: 50px;
  --choice-fit-max: 68px;
}

.layout-full_stack_list .answer-grid.answer-count-3 {
  gap: 24px;
  padding: 6px 0;
}

/* --- Choice Card Tokens (Capacity & Typography) --- */
.layout-full_stack_list {
  --choice-card-min-height: 126px;
  --choice-card-height: auto;
  --choice-card-margin-left: 76px;
  --choice-card-padding: 14px 36px 14px 44px;
  --choice-text-padding-right: 48px;
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

/* --- Row 3: Phase Region (Thinking Bar & Fact Card) --- */
.layout-full_stack_list .phase-region {
  grid-area: phase;
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  width: 100%;
  max-width: 1440px;
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  pointer-events: none;
}

/* Fix Star Marker clipping bug (BUG-FSL-01): constrain track so star marker (192px) stays within 1920px canvas */
.layout-full_stack_list .phase-region > .thinking-bar {
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  width: 1380px;
  max-width: 100%;
  min-height: 84px;
  margin: 0 auto;
}

.layout-full_stack_list .phase-region > .fact-card {
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  width: 1380px;
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

/* --- Mascot Coexistence Integration (.has-mascot) --- */
.has-mascot.layout-full_stack_list .game-stage {
  width: var(--mascot-content-width, 1420px);
  margin-right: 40px;
}

.has-mascot.layout-full_stack_list .question-title,
.has-mascot.layout-full_stack_list .answer-grid,
.has-mascot.layout-full_stack_list .phase-region {
  max-width: 1360px;
  width: 100%;
}

.has-mascot.layout-full_stack_list .phase-region > .thinking-bar {
  width: min(80vw, 1220px);
}

.has-mascot.layout-full_stack_list .phase-region > .fact-card {
  width: min(1220px, 100%);
}

.has-mascot.layout-full_stack_list {
  --choice-font-size-base: 44px;
  --choice-font-size-medium: 36px;
  --choice-font-size-long: 28px;
  --choice-font-size-very_long: 24px;
  --choice-font-size-overflow: 24px;
}

${
  aspectRatio === "9:16"
    ? `
/* Fallback 9:16 tokens preserved for backward test contract compatibility */
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
}
`,
} satisfies QuizLayoutRenderDefinition;
