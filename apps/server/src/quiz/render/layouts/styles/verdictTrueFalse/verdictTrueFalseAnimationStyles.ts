/**
 * Kinetic staggered entrances, verdict reveal bloom, and settle contrast for Verdict True/False layout.
 */
export function verdictTrueFalseAnimationStyles(): string {
  return `
/* Hero Image Entrance & Floating Motion */
.quiz-frame-unified.layout-verdict_true_false.quiz-question-clip .hero-image,
.layout-verdict_true_false.quiz-question-clip .hero-image {
  animation: enter-from-left 0.66s cubic-bezier(0.22, 0.8, 0.3, 1) var(--clip-start) both,
             visual-card-float 3.8s ease-in-out calc(var(--clip-start, 0s) + 0.66s) infinite alternate both;
  will-change: transform;
}

@keyframes visual-card-float {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-6px);
  }
}

/* Phase 2: Kinetic Staggered Entrance (Tied to choices-at) */
.layout-verdict_true_false.quiz-question-clip .choice-card:nth-child(1) {
  animation: enter-from-right 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both,
             answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.54s) infinite alternate both;
}
.layout-verdict_true_false.quiz-question-clip .choice-card:nth-child(2) {
  animation: enter-from-right 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both,
             answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.68s) infinite alternate both;
}

/* Phase 4: Answer Reveal Polish & Resting Parity (Zero !important) */
.layout-verdict_true_false.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct,
.layout-verdict_true_false.quiz-question-clip .choice-card:nth-child(n).answer-correct,
.layout-verdict_true_false.quiz-question-clip .answer-card:nth-child(n).answer-reveal-correct,
.layout-verdict_true_false.quiz-question-clip .answer-card:nth-child(n).answer-correct,
.layout-verdict_true_false.quiz-question-clip .choice-card.answer-reveal-correct,
.layout-verdict_true_false.quiz-question-clip .choice-card.answer-correct,
.layout-verdict_true_false.quiz-question-clip .answer-card.answer-reveal-correct,
.layout-verdict_true_false.quiz-question-clip .answer-card.answer-correct,
.layout-verdict_true_false .choice-card.answer-reveal-correct,
.layout-verdict_true_false .choice-card.answer-correct,
.layout-verdict_true_false .answer-card.answer-reveal-correct,
.layout-verdict_true_false .answer-card.answer-correct {
  animation: verdict-correct-pop 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  background: transparent;
  border: 0;
  box-shadow: none;
  z-index: 6;
}

.layout-verdict_true_false .choice-card.answer-reveal-correct .choice-card-surface {
  animation: verdict-surface-pop 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: border-color, box-shadow;
}

.layout-verdict_true_false .choice-card.answer-correct .choice-card-surface {
  border-color: #22C55E;
  box-shadow:
    0 16px 0 #15803D,
    0 28px 52px rgba(34, 197, 94, 0.65),
    0 0 48px rgba(74, 222, 128, 0.85),
    inset 0 4px 8px rgba(255, 255, 255, 0.9);
}

.layout-verdict_true_false .choice-card.answer-correct .choice-text,
.layout-verdict_true_false .choice-card.answer-correct .ac-glossy-arcade .choice-text {
  color: #FFFFFF !important;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6), 0 0 16px rgba(255, 255, 255, 0.85) !important;
  animation: none !important;
}

.layout-verdict_true_false.quiz-question-clip .choice-card:nth-child(n).answer-reveal-incorrect,
.layout-verdict_true_false.quiz-question-clip .answer-card:nth-child(n).answer-reveal-incorrect,
.layout-verdict_true_false.quiz-question-clip .choice-card.answer-reveal-incorrect,
.layout-verdict_true_false.quiz-question-clip .answer-card.answer-reveal-incorrect,
.layout-verdict_true_false .choice-card.answer-reveal-incorrect,
.layout-verdict_true_false .answer-card.answer-reveal-incorrect {
  animation: verdict-incorrect-settle 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: opacity, filter, transform;
  background: transparent;
  border: 0;
  box-shadow: none;
  z-index: 2;
}

.layout-verdict_true_false.quiz-question-clip .choice-card:nth-child(n).answer-incorrect,
.layout-verdict_true_false.quiz-question-clip .choice-card:nth-child(n).answer-incorrect,
.layout-verdict_true_false.quiz-question-clip .answer-card:nth-child(n).answer-incorrect,
.layout-verdict_true_false.quiz-question-clip .choice-card.answer-incorrect,
.layout-verdict_true_false.quiz-question-clip .answer-card.answer-incorrect,
.layout-verdict_true_false .choice-card.answer-incorrect,
.layout-verdict_true_false .answer-card.answer-incorrect {
  opacity: 0.58;
  filter: grayscale(65%);
  background: transparent;
  border: 0;
  box-shadow: none;
  z-index: 2;
}

.layout-verdict_true_false .choice-card.answer-incorrect .choice-text,
.layout-verdict_true_false .choice-card.answer-incorrect .ac-glossy-arcade .choice-text {
  color: #FFFFFF !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7) !important;
}

.layout-verdict_true_false .choice-card.answer-reveal-incorrect .ac-glossy-arcade,
.layout-verdict_true_false .choice-card.answer-incorrect .ac-glossy-arcade {
  opacity: 1 !important;
  filter: none !important;
}

/* Minimalist Soft Card Reveal States */
.layout-verdict_true_false .choice-card.skin-minimal_soft.answer-reveal-correct .choice-card-surface,
.layout-verdict_true_false .skin-minimal_soft.answer-reveal-correct .choice-card-surface {
  animation: verdict-minimal-win 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.layout-verdict_true_false .choice-card.skin-minimal_soft.answer-correct .choice-card-surface,
.layout-verdict_true_false .skin-minimal_soft.answer-correct .choice-card-surface {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
  border-color: #FFFFFF !important;
  box-shadow:
    0 16px 36px rgba(16, 185, 129, 0.55),
    0 0 40px rgba(52, 211, 153, 0.70),
    inset 0 2px 4px rgba(255, 255, 255, 0.6) !important;
}

.layout-verdict_true_false .choice-card.skin-minimal_soft.answer-reveal-correct .choice-text,
.layout-verdict_true_false .skin-minimal_soft.answer-reveal-correct .choice-text {
  animation: verdict-minimal-text-win 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.layout-verdict_true_false .choice-card.skin-minimal_soft.answer-correct .choice-text,
.layout-verdict_true_false .skin-minimal_soft.answer-correct .choice-text {
  color: #FFFFFF !important;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5) !important;
}

.layout-verdict_true_false .choice-card.skin-minimal_soft.answer-reveal-incorrect .choice-text,
.layout-verdict_true_false .skin-minimal_soft.answer-reveal-incorrect .choice-text {
  animation: verdict-minimal-text-settle 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.layout-verdict_true_false .choice-card.skin-minimal_soft.answer-incorrect .choice-text,
.layout-verdict_true_false .skin-minimal_soft.answer-incorrect .choice-text {
  color: #64748B !important;
  text-shadow: none !important;
}


@keyframes verdict-correct-pop {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-12px) scale(1.06); filter: brightness(1.15); }
  100% {
    transform: translateY(-8px) scale(1.04);
  }
}

@keyframes verdict-surface-pop {
  0% {
    transform: scale(1);
  }
  50% {
    border-color: #4ADE80;
    box-shadow:
      0 18px 0 #15803D,
      0 32px 60px rgba(34, 197, 94, 0.75),
      0 0 56px rgba(74, 222, 128, 0.95),
      inset 0 4px 8px rgba(255, 255, 255, 0.9);
  }
  100% {
    border-color: #22C55E;
    box-shadow:
      0 16px 0 #15803D,
      0 28px 52px rgba(34, 197, 94, 0.65),
      0 0 48px rgba(74, 222, 128, 0.85),
      inset 0 4px 8px rgba(255, 255, 255, 0.9);
  }
}

@keyframes verdict-incorrect-settle {
  0% { transform: scale(1); opacity: 1; filter: grayscale(0%); }
  100% {
    transform: translateY(4px) scale(0.94);
    opacity: 0.58;
    filter: grayscale(65%);
    box-shadow: 0 2px 0 rgba(10, 25, 60, 0.12);
    border-color: rgba(255, 255, 255, 0.45);
  }
}

@keyframes verdict-minimal-win {
  0% { transform: scale(1); }
  100% {
    background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
    border-color: #FFFFFF !important;
    box-shadow:
      0 16px 36px rgba(16, 185, 129, 0.55),
      0 0 40px rgba(52, 211, 153, 0.70),
      inset 0 2px 4px rgba(255, 255, 255, 0.6) !important;
  }
}

@keyframes verdict-minimal-text-win {
  0% {}
  100% {
    color: #FFFFFF !important;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5) !important;
  }
}

@keyframes verdict-minimal-text-settle {
  0% {}
  100% {
    color: #64748B !important;
    text-shadow: none !important;
  }
}
`;
}
