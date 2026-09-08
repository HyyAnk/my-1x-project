/**
 * Returns the dossier header bar, clue step pips, and case status chip styles
 * for the Clue Deduction layout stage chrome.
 */
export function clueDeductionStageStyles(): string {
  return `
/* --- Dossier Header Bar (BUG-CD-05 & BUG-CD-08 Detective Theme) --- */
.layout-clue_deduction .clue-dossier-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 46px;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.75) 100%);
  border-bottom: 1.5px solid rgba(56, 189, 248, 0.25);
  backdrop-filter: blur(12px);
}

.layout-clue_deduction .dossier-case-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #38bdf8;
  text-shadow: 0 0 12px rgba(56, 189, 248, 0.6);
}

.layout-clue_deduction .dossier-icon {
  font-size: 18px;
  filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.8));
}

/* Clue Step Pips (Progressive Multi-Phase Timeline Indicators) */
.layout-clue_deduction .clue-steps-tracker {
  display: flex;
  align-items: center;
  gap: 12px;
}

.layout-clue_deduction .clue-step-pip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: rgba(148, 163, 184, 0.8);
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.2);
  transition: all 0.4s ease;
}

.layout-clue_deduction .clue-step-pip .pip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.6);
}

/* Clue 1 Active from Choices Start */
.layout-clue_deduction .clue-step-pip.step-1 {
  animation: clue-pip-activate 0.6s cubic-bezier(0.18, 1.4, 0.3, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both;
}

/* Clue 2 Activates 35% into Thinking Countdown */
.layout-clue_deduction .clue-step-pip.step-2 {
  animation: clue-pip-unmask-amber 0.6s cubic-bezier(0.18, 1.4, 0.3, 1) calc(var(--clip-start, 0s) + var(--thinking-at, 0s) + var(--timer-duration, 5s) * 0.35) both;
}

/* Clue 3 Activates 70% into Thinking Countdown (Decisive Clue) */
.layout-clue_deduction .clue-step-pip.step-3 {
  animation: clue-pip-unmask-gold 0.6s cubic-bezier(0.18, 1.4, 0.3, 1) calc(var(--clip-start, 0s) + var(--thinking-at, 0s) + var(--timer-duration, 5s) * 0.70) both;
}

/* Case Status Chip */
.layout-clue_deduction .dossier-status-chip {
  position: relative;
  display: flex;
  align-items: center;
  padding: 4px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.layout-clue_deduction .status-text.status-active {
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.4);
  padding: 3px 10px;
  border-radius: 6px;
  animation: clue-status-fade-out 0.1s steps(1, end) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.layout-clue_deduction .status-text.status-solved {
  position: absolute;
  top: 0;
  right: 0;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.18);
  border: 1px solid rgba(34, 197, 94, 0.5);
  padding: 3px 10px;
  border-radius: 6px;
  white-space: nowrap;
  opacity: 0;
  transform: scale(0.9);
  animation: clue-status-solved-in 0.5s cubic-bezier(0.18, 1.4, 0.3, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}
`;
}
