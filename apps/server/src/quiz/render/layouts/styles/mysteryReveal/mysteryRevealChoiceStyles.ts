/**
 * Returns the answer card and grid system styles: Mode A riddle plates, Mode B
 * multi-choice grids, badges, choice text fitting, and reveal win/loss states
 * for the Mystery Reveal layout.
 */
export function mysteryRevealChoiceStyles(): string {
  return `
/* === Answer Card & Grid System (Mode A: Riddle vs Mode B: Multi-Choice - BUG-MR-03 Fix) === */
.candy-scene:not(.quiz-frame-unified).layout-mystery_reveal .mystery-stage-wrapper > .choice-group,
.candy-scene:not(.quiz-frame-unified).layout-mystery_reveal .mystery-stage-wrapper > .answer-grid {
  position: absolute;
  bottom: 28px;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
  width: calc(100% - 64px);
  z-index: 10;
  padding: 0;
  box-sizing: border-box;
}

/* Unified Arena Candidate Strip: top: 384px; height: 120px; */
.quiz-frame-unified.layout-mystery_reveal .choice-group,
.quiz-frame-unified.layout-mystery_reveal .answer-grid {
  position: absolute;
  top: 384px;
  height: 120px;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  z-index: 10;
}

.quiz-frame-unified.layout-mystery_reveal .choice-card {
  height: 120px;
  min-height: 120px;
  max-height: 120px;
  box-sizing: border-box;
  opacity: 1;
  transform: none;
}

.quiz-frame-unified.layout-mystery_reveal .answer-count-0,
.quiz-frame-unified.layout-mystery_reveal .answer-count-1 {
  left: 250px;
  width: 920px;
  max-width: 920px;
  display: flex;
  justify-content: center;
}
.quiz-frame-unified.layout-mystery_reveal .answer-count-0 .choice-card,
.quiz-frame-unified.layout-mystery_reveal .answer-count-1 .choice-card {
  width: 920px;
}

.quiz-frame-unified.layout-mystery_reveal .answer-count-2 {
  left: 90px;
  width: 1240px;
  max-width: 1240px;
  display: grid;
  grid-template-columns: 600px 600px;
  gap: 40px;
}
.quiz-frame-unified.layout-mystery_reveal .answer-count-2 .choice-card {
  width: 600px;
}

.quiz-frame-unified.layout-mystery_reveal .answer-count-3 {
  left: 0;
  width: 1420px;
  max-width: 1420px;
  display: grid;
  grid-template-columns: repeat(3, 452px);
  gap: 32px;
}
.quiz-frame-unified.layout-mystery_reveal .answer-count-3 .choice-card {
  width: 452px;
}

.quiz-frame-unified.layout-mystery_reveal .answer-count-2 .choice-badge,
.quiz-frame-unified.layout-mystery_reveal .answer-count-2 .choice-label,
.quiz-frame-unified.layout-mystery_reveal .answer-count-3 .choice-badge,
.quiz-frame-unified.layout-mystery_reveal .answer-count-3 .choice-label {
  width: 72px;
  height: 72px;
  min-width: 72px;
  font-size: 38px;
}

/* Mode A: Single Answer / Riddle Mode (count <= 1) */
.candy-scene:not(.quiz-frame-unified).layout-mystery_reveal .answer-count-0,
.candy-scene:not(.quiz-frame-unified).layout-mystery_reveal .answer-count-1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 840px;
}

.candy-scene:not(.quiz-frame-unified).layout-mystery_reveal .answer-count-0 .choice-card,
.candy-scene:not(.quiz-frame-unified).layout-mystery_reveal .answer-count-1 .choice-card {
  width: 100%;
  min-height: var(--choice-card-min-height, 84px);
  padding: var(--choice-card-padding, 14px 32px);
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 41, 59, 0.96) 100%);
  border: 3.5px solid #fbbf24;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 35px rgba(251, 191, 36, 0.45);
  backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  opacity: 0;
  transform: translateY(28px) scale(0.94);
  pointer-events: none;
}

.candy-scene:not(.quiz-frame-unified).layout-mystery_reveal .answer-count-0 .choice-badge,
.candy-scene:not(.quiz-frame-unified).layout-mystery_reveal .answer-count-0 .choice-label,
.candy-scene:not(.quiz-frame-unified).layout-mystery_reveal .answer-count-1 .choice-badge,
.candy-scene:not(.quiz-frame-unified).layout-mystery_reveal .answer-count-1 .choice-label {
  display: none !important;
}

.quiz-question-clip.layout-mystery_reveal .answer-count-0 .choice-card,
.quiz-question-clip.layout-mystery_reveal .answer-count-1 .choice-card {
  animation: mystery-answer-dock 0.65s cubic-bezier(0.18, 1.4, 0.3, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s) + 0.12s) both;
}

.layout-mystery_reveal[data-choice-phase="reveal"] .answer-count-0 .choice-card,
.layout-mystery_reveal[data-choice-phase="reveal"] .answer-count-1 .choice-card,
.layout-mystery_reveal[data-choice-phase="explain"] .answer-count-0 .choice-card,
.layout-mystery_reveal[data-choice-phase="explain"] .answer-count-1 .choice-card,
.layout-mystery_reveal.is-revealed .answer-count-0 .choice-card,
.layout-mystery_reveal.is-revealed .answer-count-1 .choice-card,
.layout-mystery_reveal .answer-count-0 .choice-card.answer-correct,
.layout-mystery_reveal .answer-count-1 .choice-card.answer-correct {
  opacity: 1;
  transform: translateY(0) scale(1);
  animation: mystery-answer-dock 0.65s cubic-bezier(0.18, 1.4, 0.3, 1) both;
}

/* Mode B: Multiple Choice Mode (count == 2 or 3) */
.candy-scene:not(.quiz-frame-unified).layout-mystery_reveal .answer-count-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  max-width: 960px;
}

.candy-scene:not(.quiz-frame-unified).layout-mystery_reveal .answer-count-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  max-width: 1060px;
}

.layout-mystery_reveal .answer-count-2 .choice-card,
.layout-mystery_reveal .answer-count-3 .choice-card {
  min-height: 76px;
  padding: 10px 20px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.94) 100%);
  border: 3px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  gap: 14px;
}

.layout-mystery_reveal .answer-count-2 .choice-badge,
.layout-mystery_reveal .answer-count-2 .choice-label,
.layout-mystery_reveal .answer-count-3 .choice-badge,
.layout-mystery_reveal .answer-count-3 .choice-label {
  display: grid !important;
  place-items: center;
  width: 52px;
  height: 52px;
  min-width: 52px;
  border-radius: 50%;
  font-size: 28px;
  font-weight: 900;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #1e1b4b;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.quiz-question-clip.layout-mystery_reveal .answer-count-2 .choice-card,
.quiz-question-clip.layout-mystery_reveal .answer-count-3 .choice-card {
  opacity: 0;
  animation: mystery-choice-stagger-in 0.5s cubic-bezier(0.18, 1.4, 0.3, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both;
}

.layout-mystery_reveal[data-choice-phase="choices"] .answer-count-2 .choice-card,
.layout-mystery_reveal[data-choice-phase="choices"] .answer-count-3 .choice-card,
.layout-mystery_reveal[data-choice-phase="thinking"] .answer-count-2 .choice-card,
.layout-mystery_reveal[data-choice-phase="thinking"] .answer-count-3 .choice-card {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* Reveal State in Multi-Choice: Win celebration & Loss dimming */
.quiz-question-clip.layout-mystery_reveal .choice-card.answer-reveal-correct,
.layout-mystery_reveal .choice-card.answer-correct {
  border-color: #22c55e !important;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.8), 0 0 32px rgba(34, 197, 94, 0.7) !important;
  transform: translateY(-4px) scale(1.03) !important;
}

.quiz-question-clip.layout-mystery_reveal .choice-card.answer-reveal-incorrect,
.layout-mystery_reveal .choice-card.answer-incorrect {
  opacity: 0.35 !important;
  transform: scale(0.96) !important;
  filter: grayscale(60%) !important;
}

/* Choice Text Fitting (BUG-MR-07 Multi-Line Text Wrapping Fix) */
.layout-mystery_reveal .choice-text {
  font-size: var(--choice-fitted-font-size, var(--choice-font-size-base, 48px));
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #ffffff;
  text-shadow: 0 3px 12px rgba(0, 0, 0, 0.9), 0 0 20px rgba(251, 191, 36, 0.5);
  text-align: center;
  width: 100%;
  white-space: normal;
  line-height: var(--choice-fit-leading, 1.12);
  text-wrap: balance;
}

.layout-mystery_reveal .answer-count-2 .choice-text,
.layout-mystery_reveal .answer-count-3 .choice-text {
  font-size: var(--choice-fitted-font-size, 32px);
  text-align: left;
}
`;
}
