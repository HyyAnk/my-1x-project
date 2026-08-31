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

.answer-check,
.answer-cross {
  position: absolute;
  z-index: 6;
  top: 14px;
  right: 20px;
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border: 4px solid #FFFFFF;
  border-radius: 50%;
  background: var(--correct, #27B96C);
  color: #FFFFFF;
  box-shadow: 0 6px 0 rgba(13,35,71,.22), 0 4px 12px rgba(0,0,0,0.18);
  font-size: 34px;
  font-weight: 900;
  font-style: normal;
  opacity: 0;
  animation: status-pop .38s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s) + .16s) both;
  will-change: transform, opacity;
}

.answer-cross {
  background: var(--incorrect, #7B8DA1);
}
`;
}
