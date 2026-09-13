/**
 * ADR-003 Shared State CSS for Quiz Choices.
 *
 * Owns correct, incorrect, pending, and reveal lifecycle semantics and status indicators
 * shared across skins.
 */
export function choiceStateStyles(): string {
  return `
/* === Shared Choice States (ADR-003) === */
.answer-card.answer-correct,
.choice-card-text.answer-correct,
.answer-card.answer-reveal-correct,
.choice-card-text.answer-reveal-correct,
.quiz-question-clip .choice-card:nth-child(n).answer-correct,
.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct,
.quiz-question-clip .answer-card:nth-child(n).answer-correct,
.quiz-question-clip .answer-card:nth-child(n).answer-reveal-correct,
.quiz-question-clip .choice-card-text:nth-child(n).answer-correct,
.quiz-question-clip .choice-card-text:nth-child(n).answer-reveal-correct,
.quiz-question-clip .choice-card.answer-correct,
.quiz-question-clip .choice-card.answer-reveal-correct,
.quiz-question-clip .answer-card.answer-correct,
.quiz-question-clip .answer-card.answer-reveal-correct,
.quiz-question-clip .choice-card-text.answer-correct,
.quiz-question-clip .choice-card-text.answer-reveal-correct {
  animation: correct-card-reveal .62s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
  z-index: 6;
}

.answer-card.answer-correct > b,
.choice-card-text.answer-correct .choice-label,
.answer-card.answer-reveal-correct > b,
.choice-card-text.answer-reveal-correct .choice-label,
.quiz-question-clip .choice-card:nth-child(n).answer-correct .choice-label,
.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct .choice-label,
.quiz-question-clip .answer-card:nth-child(n).answer-correct > b,
.quiz-question-clip .answer-card:nth-child(n).answer-reveal-correct > b {
  animation: correct-badge-reveal .62s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
}

.answer-card.answer-incorrect,
.choice-card-text.answer-incorrect,
.answer-card.answer-reveal-incorrect,
.choice-card-text.answer-reveal-incorrect,
.quiz-question-clip .choice-card:nth-child(n).answer-incorrect,
.quiz-question-clip .choice-card:nth-child(n).answer-reveal-incorrect,
.quiz-question-clip .answer-card:nth-child(n).answer-incorrect,
.quiz-question-clip .answer-card:nth-child(n).answer-reveal-incorrect,
.quiz-question-clip .choice-card-text:nth-child(n).answer-incorrect,
.quiz-question-clip .choice-card-text:nth-child(n).answer-reveal-incorrect,
.quiz-question-clip .choice-card.answer-incorrect,
.quiz-question-clip .choice-card.answer-reveal-incorrect,
.quiz-question-clip .answer-card.answer-incorrect,
.quiz-question-clip .answer-card.answer-reveal-incorrect,
.quiz-question-clip .choice-card-text.answer-incorrect,
.quiz-question-clip .choice-card-text.answer-reveal-incorrect {
  animation: incorrect-card-settle .38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
}

.visual-answer-card.answer-correct,
.choice-card-visual.answer-correct,
.visual-answer-card.answer-reveal-correct,
.choice-card-visual.answer-reveal-correct,
.quiz-question-clip .choice-card:nth-child(n).answer-correct,
.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct,
.quiz-question-clip .visual-answer-card:nth-child(n).answer-correct,
.quiz-question-clip .visual-answer-card:nth-child(n).answer-reveal-correct,
.quiz-question-clip .choice-card-visual:nth-child(n).answer-correct,
.quiz-question-clip .choice-card-visual:nth-child(n).answer-reveal-correct,
.quiz-question-clip .choice-card.answer-correct,
.quiz-question-clip .choice-card.answer-reveal-correct,
.quiz-question-clip .visual-answer-card.answer-correct,
.quiz-question-clip .visual-answer-card.answer-reveal-correct,
.quiz-question-clip .choice-card-visual.answer-correct,
.quiz-question-clip .choice-card-visual.answer-reveal-correct {
  animation: visual-correct-card-reveal .62s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
  z-index: 6;
}

.visual-answer-card.answer-correct .visual-answer-label > b,
.choice-card-visual.answer-correct .choice-label,
.visual-answer-card.answer-reveal-correct .visual-answer-label > b,
.choice-card-visual.answer-reveal-correct .choice-label,
.quiz-question-clip .choice-card:nth-child(n).answer-correct .choice-label,
.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct .choice-label,
.quiz-question-clip .visual-answer-card:nth-child(n).answer-correct .visual-answer-label > b,
.quiz-question-clip .visual-answer-card:nth-child(n).answer-reveal-correct .visual-answer-label > b,
.quiz-question-clip .choice-card-visual:nth-child(n).answer-correct .choice-label,
.quiz-question-clip .choice-card-visual:nth-child(n).answer-reveal-correct .choice-label {
  animation: correct-badge-reveal .62s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
}

.visual-answer-card.answer-correct .option-image,
.choice-card-visual.answer-correct .option-image,
.visual-answer-card.answer-reveal-correct .option-image,
.choice-card-visual.answer-reveal-correct .option-image,
.quiz-question-clip .choice-card:nth-child(n).answer-correct .option-image,
.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct .option-image,
.quiz-question-clip .visual-answer-card:nth-child(n).answer-correct .option-image,
.quiz-question-clip .visual-answer-card:nth-child(n).answer-reveal-correct .option-image,
.quiz-question-clip .choice-card-visual:nth-child(n).answer-correct .option-image,
.quiz-question-clip .choice-card-visual:nth-child(n).answer-reveal-correct .option-image {
  animation: visual-correct-border .62s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: border-color, box-shadow;
}

.visual-answer-card.answer-correct .visual-answer-label,
.choice-card-visual.answer-correct .visual-answer-label,
.visual-answer-card.answer-reveal-correct .visual-answer-label,
.choice-card-visual.answer-reveal-correct .visual-answer-label,
.quiz-question-clip .choice-card:nth-child(n).answer-correct .visual-answer-label,
.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct .visual-answer-label,
.quiz-question-clip .visual-answer-card:nth-child(n).answer-correct .visual-answer-label,
.quiz-question-clip .visual-answer-card:nth-child(n).answer-reveal-correct .visual-answer-label,
.quiz-question-clip .choice-card-visual:nth-child(n).answer-correct .visual-answer-label,
.quiz-question-clip .choice-card-visual:nth-child(n).answer-reveal-correct .visual-answer-label {
  animation: visual-correct-label-reveal .62s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: border-color, box-shadow;
}

.visual-answer-card.answer-incorrect,
.choice-card-visual.answer-incorrect,
.visual-answer-card.answer-reveal-incorrect,
.choice-card-visual.answer-reveal-incorrect,
.quiz-question-clip .choice-card:nth-child(n).answer-incorrect,
.quiz-question-clip .choice-card:nth-child(n).answer-reveal-incorrect,
.quiz-question-clip .visual-answer-card:nth-child(n).answer-incorrect,
.quiz-question-clip .visual-answer-card:nth-child(n).answer-reveal-incorrect,
.quiz-question-clip .choice-card-visual:nth-child(n).answer-incorrect,
.quiz-question-clip .choice-card-visual:nth-child(n).answer-reveal-incorrect,
.quiz-question-clip .choice-card.answer-incorrect,
.quiz-question-clip .choice-card.answer-reveal-incorrect,
.quiz-question-clip .visual-answer-card.answer-incorrect,
.quiz-question-clip .visual-answer-card.answer-reveal-incorrect,
.quiz-question-clip .choice-card-visual.answer-incorrect,
.quiz-question-clip .choice-card-visual.answer-reveal-incorrect {
  animation: incorrect-card-settle .38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
}

`;
}
