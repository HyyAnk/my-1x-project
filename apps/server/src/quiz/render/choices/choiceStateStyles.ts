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
.choice-card-text.answer-correct {
  animation: correct-card-reveal .62s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s) + .14s) forwards;
  will-change: transform;
}

.answer-card.answer-correct > b,
.choice-card-text.answer-correct .choice-label {
  animation: correct-badge-reveal .62s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s) + .14s) forwards;
  will-change: transform;
}

.answer-card.answer-incorrect,
.choice-card-text.answer-incorrect {
  animation: incorrect-card-settle .38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) forwards;
  will-change: transform;
}

.visual-answer-card.answer-correct,
.choice-card-visual.answer-correct {
  animation: visual-correct-card-reveal .62s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s) + .14s) forwards;
  will-change: transform;
}

.visual-answer-card.answer-correct .visual-answer-label > b,
.choice-card-visual.answer-correct .choice-label {
  animation: correct-badge-reveal .62s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s) + .14s) forwards;
  will-change: transform;
}

.visual-answer-card.answer-incorrect,
.choice-card-visual.answer-incorrect {
  animation: incorrect-card-settle .38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) forwards;
  will-change: transform;
}
`;
}
