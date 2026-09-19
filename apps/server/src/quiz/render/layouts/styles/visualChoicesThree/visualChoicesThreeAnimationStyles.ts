import type { MascotRenderAspectRatio } from "@studio/shared";

/**
 * Visual Choices Three Layout - Motion & Reveal Polish Styles.
 */
export function visualChoicesThreeAnimationStyles(_aspectRatio?: MascotRenderAspectRatio): string {
  return `
/* === Visual Choices Three Layout: Motion & Reveal === */

/* Staggered Cascading Entrances & Organic Floating Sway */
.layout-visual_choices_three.quiz-question-clip .choice-card:nth-child(1),
.layout-visual_choices_three.quiz-question-clip .visual-answer-card:nth-child(1) {
  animation: visual-choice-pop-in 0.52s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both,
             visual-card-float-1 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.52s) infinite alternate both;
  will-change: transform, opacity;
}
.layout-visual_choices_three.quiz-question-clip .choice-card:nth-child(2),
.layout-visual_choices_three.quiz-question-clip .visual-answer-card:nth-child(2) {
  animation: visual-choice-pop-in 0.52s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.14s) both,
             visual-card-float-2 4.0s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.66s) infinite alternate both;
  will-change: transform, opacity;
}
.layout-visual_choices_three.quiz-question-clip .choice-card:nth-child(3),
.layout-visual_choices_three.quiz-question-clip .visual-answer-card:nth-child(3) {
  animation: visual-choice-pop-in 0.52s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.28s) both,
             visual-card-float-3 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.80s) infinite alternate both;
  will-change: transform, opacity;
}

@keyframes visual-choice-pop-in {
  0% {
    opacity: 0;
    transform: translateY(40px) scale(0.94);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes visual-card-float {
  0% {
    transform: translateY(0) rotate(-1deg);
  }
  100% {
    transform: translateY(-10px) rotate(1deg);
  }
}

@keyframes visual-card-float-1 {
  0% {
    transform: translateY(0) rotate(-1.2deg);
  }
  100% {
    transform: translateY(-10px) rotate(1deg);
  }
}

@keyframes visual-card-float-2 {
  0% {
    transform: translateY(0) rotate(1.2deg);
  }
  100% {
    transform: translateY(-11px) rotate(-1deg);
  }
}

@keyframes visual-card-float-3 {
  0% {
    transform: translateY(0) rotate(-0.8deg);
  }
  100% {
    transform: translateY(-10px) rotate(1.2deg);
  }
}

/* Answer Reveal Bloom */
.layout-visual_choices_three.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct,
.layout-visual_choices_three.quiz-question-clip .choice-card:nth-child(n).answer-correct,
.layout-visual_choices_three.quiz-question-clip .visual-answer-card:nth-child(n).answer-reveal-correct,
.layout-visual_choices_three.quiz-question-clip .visual-answer-card:nth-child(n).answer-correct,
.layout-visual_choices_three.quiz-question-clip .choice-card.answer-reveal-correct,
.layout-visual_choices_three.quiz-question-clip .choice-card.answer-correct,
.layout-visual_choices_three.quiz-question-clip .visual-answer-card.answer-reveal-correct,
.layout-visual_choices_three.quiz-question-clip .visual-answer-card.answer-correct,
.layout-visual_choices_three .visual-answer-card.answer-correct,
.layout-visual_choices_three .visual-answer-card.answer-reveal-correct {
  animation: visual-correct-card-reveal 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  z-index: 6;
}

/* Settle Contrast Hardening (opacity: 0.35, grayscale: 78%) */
.layout-visual_choices_three.quiz-question-clip .choice-card:nth-child(n).answer-reveal-incorrect,
.layout-visual_choices_three.quiz-question-clip .visual-answer-card:nth-child(n).answer-reveal-incorrect,
.layout-visual_choices_three.quiz-question-clip .choice-card.answer-reveal-incorrect,
.layout-visual_choices_three.quiz-question-clip .visual-answer-card.answer-reveal-incorrect,
.layout-visual_choices_three .visual-answer-card.answer-reveal-incorrect {
  animation: incorrect-card-settle-visual-three 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.layout-visual_choices_three.quiz-question-clip .choice-card:nth-child(n).answer-incorrect,
.layout-visual_choices_three.quiz-question-clip .visual-answer-card:nth-child(n).answer-incorrect,
.layout-visual_choices_three.quiz-question-clip .choice-card.answer-incorrect,
.layout-visual_choices_three.quiz-question-clip .visual-answer-card.answer-incorrect,
.layout-visual_choices_three .visual-answer-card.answer-incorrect {
  opacity: 0.35;
  filter: grayscale(78%) contrast(0.95) brightness(0.92);
}

@keyframes incorrect-card-settle-visual-three {
  from {
    opacity: 1;
    transform: scale(1);
    filter: grayscale(0%) contrast(1) brightness(1);
  }
  to {
    opacity: 0.35;
    transform: scale(0.95);
    filter: grayscale(78%) contrast(0.95) brightness(0.92);
  }
}
`;
}
