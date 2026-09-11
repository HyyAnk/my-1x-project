/**
 * Returns the suspect lineup / answer grid, choice card plates, detective
 * evidence pin badges, choice text, and reveal climax state styles for the
 * Clue Deduction layout.
 */
export function clueDeductionChoiceStyles(): string {
  return `
/* --- Suspect Lineup / Answer Grid (Docked at Foot of Stage - BUG-CD-02 & BUG-CD-06 Fix) --- */
.candy-scene:not(.quiz-frame-unified).layout-clue_deduction .clue-deduction-stage-wrapper > .choice-group,
.candy-scene:not(.quiz-frame-unified).layout-clue_deduction .clue-deduction-stage-wrapper > .answer-grid {
  position: absolute;
  bottom: 28px;
  left: 0;
  right: 0;
  margin: 0 auto;
  z-index: 10;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Unified Candidate Column: left: 876px; width: 524px; */
.quiz-frame-unified.layout-clue_deduction .choice-group,
.quiz-frame-unified.layout-clue_deduction .answer-grid {
  position: absolute;
  left: 876px;
  width: 524px;
  max-width: 524px;
  margin: 0;
  padding: 0;
  z-index: 10;
  display: flex !important;
  flex-direction: column !important;
  box-sizing: border-box;
}

.quiz-frame-unified.layout-clue_deduction .choice-card {
  width: 524px;
  max-width: 524px;
  box-sizing: border-box;
  opacity: 1;
  transform: none;
}

.quiz-frame-unified.layout-clue_deduction .answer-count-0,
.quiz-frame-unified.layout-clue_deduction .answer-count-1 {
  top: 209px;
  height: 144px;
  justify-content: center;
}
.quiz-frame-unified.layout-clue_deduction .answer-count-0 .choice-card,
.quiz-frame-unified.layout-clue_deduction .answer-count-1 .choice-card {
  height: 144px;
  min-height: 144px;
  max-height: 144px;
}

.quiz-frame-unified.layout-clue_deduction .answer-count-2 {
  top: 123px;
  height: 316px;
  gap: 28px !important;
}
.quiz-frame-unified.layout-clue_deduction .answer-count-2 .choice-card {
  height: 144px;
  min-height: 144px;
  max-height: 144px;
  flex: none !important;
}

.quiz-frame-unified.layout-clue_deduction .answer-count-3 {
  top: 87px;
  height: 388px;
  gap: 20px !important;
}
.quiz-frame-unified.layout-clue_deduction .answer-count-3 .choice-card {
  height: 116px;
  min-height: 116px;
  max-height: 116px;
  flex: none !important;
}

.quiz-frame-unified.layout-clue_deduction .choice-badge,
.quiz-frame-unified.layout-clue_deduction .choice-label {
  width: 72px;
  height: 72px;
  min-width: 72px;
  font-size: 38px;
}

/* 0 & 1 Choice Mode: Centered Verdict Plate */
.candy-scene:not(.quiz-frame-unified).layout-clue_deduction .answer-count-0,
.candy-scene:not(.quiz-frame-unified).layout-clue_deduction .answer-count-1 {
  width: calc(100% - 48px);
  max-width: 720px;
}

/* 2-Choice Mode: Horizontal Suspect Lineup */
.candy-scene:not(.quiz-frame-unified).layout-clue_deduction .answer-count-2 {
  display: flex !important;
  flex-direction: row !important;
  gap: 24px;
  width: calc(100% - 48px);
  max-width: 900px;
}

.candy-scene:not(.quiz-frame-unified).layout-clue_deduction .answer-count-2 .choice-card {
  flex: 1 1 0;
  max-width: 440px;
}

/* 3-Choice Mode: 3-Column Suspect Lineup */
.candy-scene:not(.quiz-frame-unified).layout-clue_deduction .answer-count-3 {
  display: flex !important;
  flex-direction: row !important;
  gap: 16px;
  width: calc(100% - 48px);
  max-width: 960px;
}

.candy-scene:not(.quiz-frame-unified).layout-clue_deduction .answer-count-3 .choice-card {
  flex: 1 1 0;
  max-width: 310px;
}

/* Base Choice Card Plate */
.layout-clue_deduction .choice-card {
  width: 100%;
  min-height: var(--choice-card-min-height, 76px);
  height: var(--choice-card-height, 76px);
  margin: 0 auto;
  padding: var(--choice-card-padding, 10px 24px);
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.98) 100%);
  border: 3px solid #38bdf8;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.75), 0 0 24px rgba(56, 189, 248, 0.35);
  backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

/* Multi-choice suspect entrance */
.quiz-question-clip.layout-clue_deduction .answer-count-2 .choice-card,
.quiz-question-clip.layout-clue_deduction .answer-count-3 .choice-card {
  animation: clue-suspect-enter 0.55s cubic-bezier(0.18, 1.4, 0.3, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both;
}

/* Single Answer Mode: Docked on reveal */
.quiz-question-clip.layout-clue_deduction .answer-count-0 .choice-card,
.quiz-question-clip.layout-clue_deduction .answer-count-1 .choice-card {
  animation: clue-answer-dock 0.65s cubic-bezier(0.18, 1.4, 0.3, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

/* Interactive Sandbox Preview Scrubbers Fallbacks */
.layout-clue_deduction[data-choice-phase="choices"] .answer-count-2 .choice-card,
.layout-clue_deduction[data-choice-phase="choices"] .answer-count-3 .choice-card,
.layout-clue_deduction[data-choice-phase="thinking"] .answer-count-2 .choice-card,
.layout-clue_deduction[data-choice-phase="thinking"] .answer-count-3 .choice-card {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.layout-clue_deduction[data-choice-phase="reveal"] .choice-card,
.layout-clue_deduction[data-choice-phase="explain"] .choice-card,
.layout-clue_deduction.is-revealed .choice-card {
  opacity: 1;
  transform: translateY(0) scale(1);
  animation: clue-answer-dock 0.65s cubic-bezier(0.18, 1.4, 0.3, 1) both;
}

/* Choice Badges: Luminous Detective Evidence Pins */
.layout-clue_deduction .choice-badge,
.layout-clue_deduction .choice-label {
  display: flex !important;
  align-items: center;
  justify-content: center;
  width: var(--choice-badge-size, 48px);
  height: var(--choice-badge-size, 48px);
  min-width: var(--choice-badge-size, 48px);
  border-radius: 50%;
  background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
  color: #ffffff;
  font-size: var(--choice-badge-font-size, 26px);
  font-weight: 900;
  margin-right: 14px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.6);
}

.layout-clue_deduction .answer-count-0 .choice-badge,
.layout-clue_deduction .answer-count-0 .choice-label,
.layout-clue_deduction .answer-count-1 .choice-badge,
.layout-clue_deduction .answer-count-1 .choice-label {
  display: none !important;
}

/* Choice Text */
.layout-clue_deduction .choice-text {
  font-size: var(--choice-fitted-font-size, var(--choice-font-size-base, 36px));
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #ffffff;
  text-shadow: 0 3px 10px rgba(0, 0, 0, 0.9), 0 0 20px rgba(56, 189, 248, 0.5);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Reveal Climax State Animations */
.quiz-question-clip.layout-clue_deduction .choice-card.answer-reveal-correct,
.layout-clue_deduction .choice-card.answer-correct {
  opacity: 1;
  border-color: #fbbf24 !important;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 36px rgba(251, 191, 36, 0.55) !important;
  animation: clue-correct-dock 0.65s cubic-bezier(0.18, 1.4, 0.3, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.quiz-question-clip.layout-clue_deduction .choice-card.answer-reveal-correct .choice-text,
.layout-clue_deduction .choice-card.answer-correct .choice-text {
  text-shadow: 0 3px 10px rgba(0, 0, 0, 0.9), 0 0 24px rgba(251, 191, 36, 0.7);
}

.quiz-question-clip.layout-clue_deduction .choice-card.answer-reveal-correct .choice-badge,
.layout-clue_deduction .choice-card.answer-correct .choice-badge,
.quiz-question-clip.layout-clue_deduction .choice-card.answer-reveal-correct .choice-label,
.layout-clue_deduction .choice-card.answer-correct .choice-label {
  background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
}

.quiz-question-clip.layout-clue_deduction .choice-card.answer-reveal-incorrect,
.layout-clue_deduction .choice-card.answer-incorrect {
  animation: incorrect-card-settle 0.45s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}
`;
}
