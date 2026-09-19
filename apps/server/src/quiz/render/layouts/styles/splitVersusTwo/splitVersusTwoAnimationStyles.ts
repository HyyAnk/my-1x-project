/**
 * Phase keyframes, entrances, winner reveal animations, and settle contrast for Split Versus Two layout.
 */
export function splitVersusTwoAnimationStyles(): string {
  return `
/* --- Phase 2: Challenger Entrance Animations --- */
.layout-split_versus_two.quiz-question-clip .choice-card:nth-child(1) {
  animation: split-versus-enter-left 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both,
             answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.54s) infinite alternate both;
}

.layout-split_versus_two.quiz-question-clip .choice-card:nth-child(2) {
  animation: split-versus-enter-right 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.14s) both,
             answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.68s) infinite alternate both;
}

.layout-split_versus_two.quiz-question-clip .answer-grid::after,
.layout-split_versus_two.quiz-question-clip .visual-answer-grid::after,
.layout-split_versus_two.quiz-question-clip .vs-badge {
  animation:
    split-versus-badge-slam 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.28s) both,
    split-versus-badge-pulse 2s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.82s) infinite alternate both;
}

@keyframes split-versus-enter-left {
  0% { opacity: 0; transform: translateX(-120px) scale(0.92) rotate(-3deg); }
  70% { transform: translateX(10px) scale(1.02) rotate(0.5deg); }
  100% { opacity: 1; transform: translateX(0) scale(1) rotate(0deg); }
}

@keyframes split-versus-enter-right {
  0% { opacity: 0; transform: translateX(120px) scale(0.92) rotate(3deg); }
  70% { transform: translateX(-10px) scale(1.02) rotate(-0.5deg); }
  100% { opacity: 1; transform: translateX(0) scale(1) rotate(0deg); }
}

@keyframes split-versus-badge-slam {
  0% { opacity: 0; transform: scale(2.8) rotate(-22deg); filter: brightness(2.2); }
  65% { transform: scale(0.92) rotate(5deg); }
  100% { opacity: 1; transform: scale(1) rotate(-4deg); filter: brightness(1); }
}

@keyframes split-versus-badge-pulse {
  0% { transform: scale(1) rotate(-4deg); }
  100% {
    transform: scale(1.1) rotate(3deg);
    box-shadow:
      0 12px 0 rgba(13, 35, 71, 0.4),
      0 0 44px rgba(255, 19, 97, 0.95),
      0 0 72px rgba(255, 221, 0, 0.85),
      inset 0 5px 10px rgba(255, 255, 255, 0.95);
  }
}

/* --- Phase 4: Answer Reveal Duel Climax (Chained with Entrances for Parity & Kinetic Integrity) --- */
.layout-split_versus_two.quiz-question-clip .choice-card:nth-child(1).answer-reveal-correct,
.layout-split_versus_two .choice-card:nth-child(1).answer-reveal-correct {
  animation:
    split-versus-enter-left 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both,
    answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.54s) infinite alternate both,
    split-versus-winner-coronation 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  background: transparent;
  border: 0;
  box-shadow: none;
  z-index: 8;
}

.layout-split_versus_two.quiz-question-clip .choice-card:nth-child(1).answer-reveal-incorrect,
.layout-split_versus_two .choice-card.answer-reveal-incorrect,
.layout-split_versus_two .choice-card:nth-child(1).answer-reveal-incorrect {
  animation:
    split-versus-enter-left 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both,
    answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.54s) infinite alternate both,
    split-versus-loser-defeat 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: opacity, filter;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.layout-split_versus_two.quiz-question-clip .choice-card:nth-child(2).answer-reveal-correct,
.layout-split_versus_two .choice-card:nth-child(2).answer-reveal-correct {
  animation:
    split-versus-enter-right 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.14s) both,
    answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.68s) infinite alternate both,
    split-versus-winner-coronation 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  background: transparent;
  border: 0;
  box-shadow: none;
  z-index: 8;
}

.layout-split_versus_two.quiz-question-clip .choice-card:nth-child(2).answer-reveal-incorrect,
.layout-split_versus_two .choice-card:nth-child(2).answer-reveal-incorrect {
  animation:
    split-versus-enter-right 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.14s) both,
    answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.68s) infinite alternate both,
    split-versus-loser-defeat 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: opacity, filter;
  background: transparent;
  border: 0;
  box-shadow: none;
}

/* Static snapshot classes (for non-scheduled snapshot mode) */
.layout-split_versus_two .choice-card.answer-correct,
.layout-split_versus_two .visual-answer-card.answer-correct,
.layout-split_versus_two .answer-card.answer-correct {
  transform: scale(1.035) translateY(-4px);
  background: transparent;
  border: 0;
  box-shadow: none;
  z-index: 8;
}

.layout-split_versus_two .choice-card.answer-incorrect,
.layout-split_versus_two .visual-answer-card.answer-incorrect,
.layout-split_versus_two .answer-card.answer-incorrect {
  opacity: 0.35;
  filter: grayscale(78%) contrast(0.95) brightness(0.92);
  background: transparent;
  border: 0;
  box-shadow: none;
}

.layout-split_versus_two .choice-card.answer-reveal-correct .choice-card-surface,
.layout-split_versus_two .choice-card.answer-reveal-correct .visual-answer-label,
.layout-split_versus_two .choice-card.answer-reveal-correct .option-image {
  animation: split-versus-surface-win 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: border-color, box-shadow;
}

.layout-split_versus_two .choice-card.answer-correct .choice-card-surface,
.layout-split_versus_two .choice-card.answer-correct .visual-answer-label,
.layout-split_versus_two .choice-card.answer-correct .option-image {
  border-color: #22C55E;
  box-shadow: 0 16px 0 #15803D, 0 0 50px rgba(74, 222, 128, 0.85), 0 20px 40px rgba(0, 0, 0, 0.3);
}

@keyframes split-versus-winner-coronation {
  0% { }
  45% {
    transform: scale(1.06) translateY(-8px);
  }
  100% {
    transform: scale(1.035) translateY(-4px);
  }
}

@keyframes split-versus-surface-win {
  0% { }
  45% {
    border-color: #4ADE80;
    box-shadow: 0 18px 0 #15803D, 0 0 70px rgba(74, 222, 128, 0.95), 0 24px 48px rgba(0, 0, 0, 0.35);
  }
  100% {
    border-color: #22C55E;
    box-shadow: 0 16px 0 #15803D, 0 0 50px rgba(74, 222, 128, 0.85), 0 20px 40px rgba(0, 0, 0, 0.3);
  }
}

@keyframes split-versus-loser-defeat {
  0% { opacity: 1; filter: grayscale(0%); }
  100% {
    opacity: 0.35;
    transform: scale(0.95) translateY(4px);
    filter: grayscale(78%) contrast(0.95) brightness(0.92);
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 2px 0 rgba(10, 25, 60, 0.08);
  }
}

/* VS Badge Victory Flare in Phase 4 */
.layout-split_versus_two .answer-grid:has(.answer-reveal-correct)::after,
.layout-split_versus_two .visual-answer-grid:has(.answer-reveal-correct)::after,
.layout-split_versus_two.quiz-question-clip .answer-grid:has(.answer-reveal-correct)::after,
.layout-split_versus_two.quiz-question-clip .visual-answer-grid:has(.answer-reveal-correct)::after {
  animation:
    split-versus-badge-slam 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.28s) both,
    split-versus-badge-pulse 2s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.82s) infinite alternate both,
    split-versus-badge-victory 0.6s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform, filter;
}

.layout-split_versus_two.quiz-question-clip .answer-grid:has(.answer-correct)::after,
.layout-split_versus_two.quiz-question-clip .visual-answer-grid:has(.answer-correct)::after,
.layout-split_versus_two .answer-grid:has(.answer-correct)::after,
.layout-split_versus_two .visual-answer-grid:has(.answer-correct)::after {
  background: linear-gradient(135deg, #FFD700 0%, #FF9100 100%);
  box-shadow: 0 0 60px rgba(255, 215, 0, 1), 0 10px 0 #B26A00;
}

@keyframes split-versus-badge-victory {
  0% { }
  50% { transform: scale(1.28) rotate(12deg); filter: brightness(1.6); }
  100% {
    transform: scale(1.15) rotate(-2deg);
    background: linear-gradient(135deg, #FFD700 0%, #FF9100 100%);
    box-shadow: 0 0 60px rgba(255, 215, 0, 1), 0 10px 0 #B26A00;
  }
}
`;
}
