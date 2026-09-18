import type { MascotRenderAspectRatio } from "@studio/shared";

/**
 * Full Stack List Layout - Motion & Reveal Polish Styles.
 * Cascading pop-in entrances and winning card lift.
 */
export function fullStackListAnimationStyles(_aspectRatio?: MascotRenderAspectRatio): string {
  return `
/* === Full Stack List Layout: Motion & Reveal === */

/* Waterfall Stagger Entrances */
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(1),
.layout-full_stack_list.quiz-question-clip .answer-card:nth-child(1) {
  animation: choice-card-pop-in 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.00s) both,
             answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.54s) infinite alternate both;
  will-change: transform, opacity;
}
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(2),
.layout-full_stack_list.quiz-question-clip .answer-card:nth-child(2) {
  animation: choice-card-pop-in 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.14s) both,
             answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.68s) infinite alternate both;
  will-change: transform, opacity;
}
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(3),
.layout-full_stack_list.quiz-question-clip .answer-card:nth-child(3) {
  animation: choice-card-pop-in 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.28s) both,
             answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.82s) infinite alternate both;
  will-change: transform, opacity;
}
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(4),
.layout-full_stack_list.quiz-question-clip .answer-card:nth-child(4) {
  animation: choice-card-pop-in 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.42s) both,
             answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.96s) infinite alternate both;
  will-change: transform, opacity;
}

@keyframes choice-card-pop-in {
  0% {
    opacity: 0;
    transform: translateY(40px) scale(0.96);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Answer Reveal Polish: Emerald halo lift */
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct,
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(n).answer-correct,
.layout-full_stack_list.quiz-question-clip .answer-card:nth-child(n).answer-reveal-correct,
.layout-full_stack_list.quiz-question-clip .answer-card:nth-child(n).answer-correct,
.layout-full_stack_list.quiz-question-clip .choice-card-text:nth-child(n).answer-reveal-correct,
.layout-full_stack_list.quiz-question-clip .choice-card-text:nth-child(n).answer-correct,
.layout-full_stack_list.quiz-question-clip .choice-card.answer-reveal-correct,
.layout-full_stack_list.quiz-question-clip .choice-card.answer-correct,
.layout-full_stack_list.quiz-question-clip .answer-card.answer-reveal-correct,
.layout-full_stack_list.quiz-question-clip .answer-card.answer-correct,
.layout-full_stack_list.quiz-question-clip .choice-card-text.answer-reveal-correct,
.layout-full_stack_list.quiz-question-clip .choice-card-text.answer-correct,
.layout-full_stack_list .answer-card.answer-correct,
.layout-full_stack_list .choice-card-text.answer-correct,
.layout-full_stack_list .choice-card.answer-correct,
.layout-full_stack_list .answer-card.answer-reveal-correct,
.layout-full_stack_list .choice-card-text.answer-reveal-correct,
.layout-full_stack_list .choice-card.answer-reveal-correct {
  animation: full-stack-correct-reveal 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  z-index: 6;
}

/* Settle Contrast Hardening: WCAG AA compliance (opacity: 0.35, grayscale: 78%) */
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(n).answer-reveal-incorrect,
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(n).answer-incorrect,
.layout-full_stack_list.quiz-question-clip .answer-card:nth-child(n).answer-reveal-incorrect,
.layout-full_stack_list.quiz-question-clip .answer-card:nth-child(n).answer-incorrect,
.layout-full_stack_list.quiz-question-clip .choice-card-text:nth-child(n).answer-reveal-incorrect,
.layout-full_stack_list.quiz-question-clip .choice-card-text:nth-child(n).answer-incorrect,
.layout-full_stack_list.quiz-question-clip .answer-card.answer-incorrect,
.layout-full_stack_list.quiz-question-clip .choice-card-text.answer-incorrect,
.layout-full_stack_list.quiz-question-clip .choice-card.answer-incorrect,
.layout-full_stack_list.quiz-question-clip .answer-card.answer-reveal-incorrect,
.layout-full_stack_list.quiz-question-clip .choice-card-text.answer-reveal-incorrect,
.layout-full_stack_list.quiz-question-clip .choice-card.answer-reveal-incorrect,
.layout-full_stack_list .answer-card.answer-incorrect,
.layout-full_stack_list .choice-card-text.answer-incorrect,
.layout-full_stack_list .choice-card.answer-incorrect,
.layout-full_stack_list .answer-card.answer-reveal-incorrect,
.layout-full_stack_list .choice-card-text.answer-reveal-incorrect,
.layout-full_stack_list .choice-card.answer-reveal-incorrect {
  animation: incorrect-card-settle-full-stack 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  opacity: 0.35;
  filter: grayscale(78%) contrast(0.95);
}

@keyframes full-stack-correct-reveal {
  0% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-12px) scale(1.05);
  }
  100% {
    transform: translateY(-6px) scale(1.03);
  }
}

@keyframes incorrect-card-settle-full-stack {
  from {
    opacity: 1;
    transform: scale(1);
    filter: grayscale(0%);
  }
  to {
    opacity: 0.35;
    transform: scale(0.97);
    filter: grayscale(78%) contrast(0.95);
  }
}
`;
}
