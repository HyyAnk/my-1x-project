/**
 * Kinetic stagger entrance, victory celebration bloom, and loser settle contrast for Visual Choices Three Pure layout.
 */
export function visualChoicesThreePureAnimationStyles(): string {
  return `
/* ==========================================================================
   PHASE 2: DYNAMIC STAGGERED ENTRANCE ANIMATIONS
   ========================================================================== */
@keyframes visual-pure-card-enter {
  0% {
    opacity: 0;
    transform: translateY(48px) scale(0.86);
  }
  65% {
    opacity: 1;
    transform: translateY(-8px) scale(1.025);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(1) {
  animation: visual-pure-card-enter 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both,
             visual-choice-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.54s) infinite alternate both;
}
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(2) {
  animation: visual-pure-card-enter 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.12s) both,
             visual-choice-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.66s) infinite alternate both;
}
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(3) {
  animation: visual-pure-card-enter 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.24s) both,
             visual-choice-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.78s) infinite alternate both;
}

/* ==========================================================================
   PHASE 4: ANSWER REVEAL & CELEBRATION
   ========================================================================== */
@keyframes visual-pure-correct-celebrate {
  0% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-14px) scale(1.04);
    box-shadow:
      0 0 44px rgba(74, 222, 128, 0.9),
      0 0 88px rgba(74, 222, 128, 0.5),
      0 22px 0 #15803D;
    border-color: #22C55E;
  }
  100% {
    transform: translateY(-6px) scale(1.025);
    box-shadow:
      0 0 36px rgba(74, 222, 128, 0.85),
      0 0 68px rgba(74, 222, 128, 0.4),
      0 20px 0 #15803D;
    border-color: #22C55E;
  }
}
@keyframes visual-pure-correct-badge {
  0% {
    transform: translateX(-50%) scale(1);
  }
  55% {
    transform: translateX(-50%) scale(1.14);
    border-color: #22C55E;
    box-shadow: 0 0 28px rgba(74, 222, 128, 0.95), 0 10px 0 #15803D;
  }
  100% {
    transform: translateX(-50%) scale(1.06);
    border-color: #22C55E;
    box-shadow: 0 0 24px rgba(74, 222, 128, 0.9), 0 8px 0 #15803D;
  }
}

.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(n).answer-reveal-correct,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(n).answer-correct,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual:nth-child(n).answer-reveal-correct,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual:nth-child(n).answer-correct,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(n).answer-correct,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-reveal-correct,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-correct,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual.answer-reveal-correct,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual.answer-correct,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card.answer-reveal-correct,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card.answer-correct,
.layout-visual_choices_three_pure .visual-answer-card.answer-correct,
.layout-visual_choices_three_pure .choice-card-visual.answer-correct,
.layout-visual_choices_three_pure .choice-card.answer-correct,
.layout-visual_choices_three_pure .visual-answer-card.answer-reveal-correct,
.layout-visual_choices_three_pure .choice-card-visual.answer-reveal-correct,
.layout-visual_choices_three_pure .choice-card.answer-reveal-correct {
  animation: visual-correct-card-reveal 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  z-index: 6;
}

/* Image Slot Reveal Animation - scheduled (no static green leak) */
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(n).answer-reveal-correct .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual:nth-child(n).answer-reveal-correct .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-reveal-correct .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual.answer-reveal-correct .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card.answer-reveal-correct .option-image,
.layout-visual_choices_three_pure .visual-answer-card.answer-reveal-correct .option-image,
.layout-visual_choices_three_pure .choice-card-visual.answer-reveal-correct .option-image,
.layout-visual_choices_three_pure .choice-card.answer-reveal-correct .option-image {
  animation: visual-pure-correct-celebrate 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform, border-color, box-shadow;
}

/* Image Slot Settled State - snapshot preview (static green) */
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(n).answer-correct .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual:nth-child(n).answer-correct .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(n).answer-correct .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-correct .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual.answer-correct .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card.answer-correct .option-image,
.layout-visual_choices_three_pure .visual-answer-card.answer-correct .option-image,
.layout-visual_choices_three_pure .choice-card-visual.answer-correct .option-image,
.layout-visual_choices_three_pure .choice-card.answer-correct .option-image {
  border-color: #22C55E;
  box-shadow: 0 0 36px rgba(74, 222, 128, 0.85), 0 0 68px rgba(74, 222, 128, 0.4), 0 20px 0 #15803D;
  transform: translateY(-6px) scale(1.025);
}

/* Pure Visual Badge Reveal Animation - scheduled (preserves translateX(-50%), no static green leak) */
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(n).answer-reveal-correct .choice-badge-pure,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(n).answer-reveal-correct .choice-label,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual:nth-child(n).answer-reveal-correct .choice-badge-pure,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual:nth-child(n).answer-reveal-correct .choice-label,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct .choice-badge-pure,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct .choice-label,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-reveal-correct .choice-badge-pure,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-reveal-correct .choice-label,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual.answer-reveal-correct .choice-badge-pure,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual.answer-reveal-correct .choice-label,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card.answer-reveal-correct .choice-badge-pure,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card.answer-reveal-correct .choice-label,
.layout-visual_choices_three_pure .visual-answer-card.answer-reveal-correct .choice-badge-pure,
.layout-visual_choices_three_pure .visual-answer-card.answer-reveal-correct .choice-label,
.layout-visual_choices_three_pure .choice-card-visual.answer-reveal-correct .choice-badge-pure,
.layout-visual_choices_three_pure .choice-card-visual.answer-reveal-correct .choice-label,
.layout-visual_choices_three_pure .choice-card.answer-reveal-correct .choice-badge-pure,
.layout-visual_choices_three_pure .choice-card.answer-reveal-correct .choice-label {
  animation: visual-pure-correct-badge 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform, border-color, box-shadow;
}

/* Pure Visual Badge Settled State - snapshot preview (static green, preserves translateX(-50%)) */
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(n).answer-correct .choice-badge-pure,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(n).answer-correct .choice-label,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual:nth-child(n).answer-correct .choice-badge-pure,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual:nth-child(n).answer-correct .choice-label,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(n).answer-correct .choice-badge-pure,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(n).answer-correct .choice-label,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-correct .choice-badge-pure,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-correct .choice-label,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual.answer-correct .choice-badge-pure,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual.answer-correct .choice-label,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card.answer-correct .choice-badge-pure,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card.answer-correct .choice-label,
.layout-visual_choices_three_pure .visual-answer-card.answer-correct .choice-badge-pure,
.layout-visual_choices_three_pure .visual-answer-card.answer-correct .choice-label,
.layout-visual_choices_three_pure .choice-card-visual.answer-correct .choice-badge-pure,
.layout-visual_choices_three_pure .choice-card-visual.answer-correct .choice-label,
.layout-visual_choices_three_pure .choice-card.answer-correct .choice-badge-pure,
.layout-visual_choices_three_pure .choice-card.answer-correct .choice-label {
  transform: translateX(-50%) scale(1.06);
  border-color: #22C55E;
  box-shadow: 0 0 24px rgba(74, 222, 128, 0.9), 0 8px 0 #15803D;
}

.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(n).answer-reveal-incorrect,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual:nth-child(n).answer-reveal-incorrect,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(n).answer-reveal-incorrect,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-reveal-incorrect,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual.answer-reveal-incorrect,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card.answer-reveal-incorrect,
.layout-visual_choices_three_pure .visual-answer-card.answer-reveal-incorrect,
.layout-visual_choices_three_pure .choice-card-visual.answer-reveal-incorrect,
.layout-visual_choices_three_pure .choice-card.answer-reveal-incorrect {
  animation: incorrect-card-settle-vcp 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(n).answer-incorrect,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual:nth-child(n).answer-incorrect,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(n).answer-incorrect,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-incorrect,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual.answer-incorrect,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card.answer-incorrect,
.layout-visual_choices_three_pure .visual-answer-card.answer-incorrect,
.layout-visual_choices_three_pure .choice-card-visual.answer-incorrect,
.layout-visual_choices_three_pure .choice-card.answer-incorrect {
  opacity: 0.35;
  filter: grayscale(78%) contrast(0.95) brightness(0.92);
}

.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(n).answer-reveal-incorrect .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(n).answer-incorrect .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual:nth-child(n).answer-reveal-incorrect .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card-visual:nth-child(n).answer-incorrect .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(n).answer-reveal-incorrect .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(n).answer-incorrect .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-reveal-incorrect .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-incorrect .option-image {
  animation: incorrect-card-settle-vcp 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

@keyframes incorrect-card-settle-vcp {
  from {
    opacity: 1;
    transform: scale(1);
    filter: grayscale(0%) contrast(1);
  }
  to {
    opacity: 0.35;
    transform: scale(0.96);
    filter: grayscale(78%) contrast(0.95) brightness(0.92);
  }
}
`;
}
