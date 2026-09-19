import type { MascotRenderAspectRatio } from "@studio/shared";

/**
 * Media Left Choices Right Layout - Motion & Reveal Polish Styles.
 * Ensures the whole assembly (badge + surface) animates without separation.
 */
export function mediaLeftChoicesRightAnimationStyles(_aspectRatio?: MascotRenderAspectRatio): string {
  return `
/* === Media Left Choices Right Layout: Motion & Reveal === */

.quiz-frame-unified.layout-media_left_choices_right.quiz-question-clip .hero-image,
.layout-media_left_choices_right.quiz-question-clip .hero-image {
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

/* Staggered Choice Entrance */
.layout-media_left_choices_right.quiz-question-clip .choice-card:nth-child(1),
.layout-media_left_choices_right.quiz-question-clip .answer-card:nth-child(1) {
  animation: choice-card-enter-right 0.50s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both,
             answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.50s) infinite alternate both;
  will-change: transform, opacity;
}
.layout-media_left_choices_right.quiz-question-clip .choice-card:nth-child(2),
.layout-media_left_choices_right.quiz-question-clip .answer-card:nth-child(2) {
  animation: choice-card-enter-right 0.50s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.12s) both,
             answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.62s) infinite alternate both;
  will-change: transform, opacity;
}
.layout-media_left_choices_right.quiz-question-clip .choice-card:nth-child(3),
.layout-media_left_choices_right.quiz-question-clip .answer-card:nth-child(3) {
  animation: choice-card-enter-right 0.50s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.24s) both,
             answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.74s) infinite alternate both;
  will-change: transform, opacity;
}
.layout-media_left_choices_right.quiz-question-clip .choice-card:nth-child(4),
.layout-media_left_choices_right.quiz-question-clip .answer-card:nth-child(4) {
  animation: choice-card-enter-right 0.50s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.36s) both,
             answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.86s) infinite alternate both;
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

/* Answer Reveal Polish: Winning card lifts with glowing emerald halo */
.layout-media_left_choices_right.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct,
.layout-media_left_choices_right.quiz-question-clip .choice-card:nth-child(n).answer-correct,
.layout-media_left_choices_right.quiz-question-clip .answer-card:nth-child(n).answer-reveal-correct,
.layout-media_left_choices_right.quiz-question-clip .answer-card:nth-child(n).answer-correct,
.layout-media_left_choices_right.quiz-question-clip .choice-card-text:nth-child(n).answer-reveal-correct,
.layout-media_left_choices_right.quiz-question-clip .choice-card-text:nth-child(n).answer-correct,
.layout-media_left_choices_right.quiz-question-clip .choice-card.answer-reveal-correct,
.layout-media_left_choices_right.quiz-question-clip .choice-card.answer-correct,
.layout-media_left_choices_right.quiz-question-clip .answer-card.answer-reveal-correct,
.layout-media_left_choices_right.quiz-question-clip .answer-card.answer-correct,
.layout-media_left_choices_right.quiz-question-clip .choice-card-text.answer-reveal-correct,
.layout-media_left_choices_right.quiz-question-clip .choice-card-text.answer-correct,
.layout-media_left_choices_right .answer-card.answer-correct,
.layout-media_left_choices_right .choice-card-text.answer-correct,
.layout-media_left_choices_right .choice-card.answer-correct,
.layout-media_left_choices_right .answer-card.answer-reveal-correct,
.layout-media_left_choices_right .choice-card-text.answer-reveal-correct,
.layout-media_left_choices_right .choice-card.answer-reveal-correct {
  animation: correct-card-reveal 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  z-index: 6;
}

/* Settle Contrast Hardening: WCAG AA compliance (opacity: 0.35, grayscale: 78%) */
.layout-media_left_choices_right.quiz-question-clip .choice-card:nth-child(n).answer-reveal-incorrect,
.layout-media_left_choices_right.quiz-question-clip .choice-card:nth-child(n).answer-incorrect,
.layout-media_left_choices_right.quiz-question-clip .answer-card:nth-child(n).answer-reveal-incorrect,
.layout-media_left_choices_right.quiz-question-clip .answer-card:nth-child(n).answer-incorrect,
.layout-media_left_choices_right.quiz-question-clip .choice-card-text:nth-child(n).answer-reveal-incorrect,
.layout-media_left_choices_right.quiz-question-clip .choice-card-text:nth-child(n).answer-incorrect,
.layout-media_left_choices_right.quiz-question-clip .answer-card.answer-incorrect,
.layout-media_left_choices_right.quiz-question-clip .choice-card-text.answer-incorrect,
.layout-media_left_choices_right.quiz-question-clip .choice-card.answer-incorrect,
.layout-media_left_choices_right.quiz-question-clip .answer-card.answer-reveal-incorrect,
.layout-media_left_choices_right.quiz-question-clip .choice-card-text.answer-reveal-incorrect,
.layout-media_left_choices_right.quiz-question-clip .choice-card.answer-reveal-incorrect,
.layout-media_left_choices_right .answer-card.answer-incorrect,
.layout-media_left_choices_right .choice-card-text.answer-incorrect,
.layout-media_left_choices_right .choice-card.answer-incorrect,
.layout-media_left_choices_right .answer-card.answer-reveal-incorrect,
.layout-media_left_choices_right .choice-card-text.answer-reveal-incorrect,
.layout-media_left_choices_right .choice-card.answer-reveal-incorrect {
  animation: incorrect-card-settle-media-left 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  opacity: 0.35;
  filter: grayscale(78%) contrast(0.95) brightness(0.92);
}

@keyframes incorrect-card-settle-media-left {
  from {
    opacity: 1;
    transform: scale(1);
    filter: grayscale(0%) contrast(1) brightness(1);
  }
  to {
    opacity: 0.35;
    transform: scale(0.94);
    filter: grayscale(78%) contrast(0.95) brightness(0.92);
  }
}
`;
}
