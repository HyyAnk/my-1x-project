import type { QuizLayoutRenderDefinition } from "./types.js";

export const clueDeductionLayout = {
  id: "clue_deduction",
  renderBody: (slots) =>
    `${slots.questionBoxHtml}` +
    `<div class="clue-deduction-stage-wrapper" data-layout-allow-overflow>` +
      `<div class="clue-stage-backdrop"></div>` +
      `<div class="clue-dossier-bar">` +
        `<div class="dossier-case-badge"><span class="dossier-icon" aria-hidden="true">🔍</span> EVIDENCE DOSSIER</div>` +
        `<div class="clue-steps-tracker" aria-label="Progressive Clues">` +
          `<span class="clue-step-pip step-1 active"><i class="pip-dot"></i> CLUE 1</span>` +
          `<span class="clue-step-pip step-2"><i class="pip-dot"></i> CLUE 2</span>` +
          `<span class="clue-step-pip step-3"><i class="pip-dot"></i> CLUE 3</span>` +
        `</div>` +
        `<div class="dossier-status-chip">` +
          `<span class="status-text status-active">INVESTIGATING</span>` +
          `<span class="status-text status-solved">CASE SOLVED</span>` +
        `</div>` +
      `</div>` +
      `<div class="clue-card-stage">` +
        `<div class="clue-hero-frame">` +
          `<span class="evidence-bracket bracket-tl" aria-hidden="true"></span>` +
          `<span class="evidence-bracket bracket-tr" aria-hidden="true"></span>` +
          `<span class="evidence-bracket bracket-bl" aria-hidden="true"></span>` +
          `<span class="evidence-bracket bracket-br" aria-hidden="true"></span>` +
          `<div class="clue-loupe-reticle" data-layout-ignore aria-hidden="true">` +
            `<div class="loupe-ring"></div>` +
            `<div class="loupe-crosshair"></div>` +
            `<div class="loupe-beam"></div>` +
          `</div>` +
          `${slots.heroHtml}` +
          `<div class="clue-glow-ring" data-layout-ignore aria-hidden="true"></div>` +
        `</div>` +
      `</div>` +
      `${slots.choicesHtml}` +
    `</div>` +
    `<div class="phase-region">${slots.phaseHtml}</div>`,

  css: (aspectRatio) => `
/* ==========================================================================
   Clue Deduction Layout: High-Stakes Detective Stage (Candy Arcade v2)
   16:9 Landscape Optimized (1920x1080)
   ========================================================================== */

.layout-clue_deduction {
  --clue-stage-width: 1240px;
  --clue-stage-height: 560px;
  --choice-card-min-height: 76px;
  --choice-card-height: 76px;
  --choice-card-margin-left: 0px;
  --choice-card-padding: 10px 24px;
  --choice-badge-size: 48px;
  --choice-badge-margin-left: 0px;
  --choice-badge-font-size: 26px;
  --choice-font-size-base: 36px;
  --choice-font-size-medium: 32px;
  --choice-font-size-long: 28px;
  --choice-font-size-very_long: 24px;
  --choice-font-size-overflow: 22px;
  --choice-fit-min: 20px;
  --choice-fit-max: 44px;
  --choice-fit-max-lines: 1;
  --choice-fit-leading: 1.1;
  --choice-fit-multiline-gain: 0px;
}

/* --- 3-Row Native CSS Grid Architecture (BUG-CD-03, BUG-CD-07 Fix) --- */
.layout-clue_deduction .game-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto auto;
  grid-template-areas:
    "title"
    "stage"
    "phase";
  align-items: center;
  justify-items: center;
  row-gap: 20px;
  width: 1580px;
  margin: 16px 40px 0 auto;
  min-height: 0;
}

/* --- Row 1: Question Title Card --- */
.layout-clue_deduction .question-title {
  grid-area: title;
  width: 100%;
  max-width: 1440px;
  justify-self: end;
  margin-left: auto;
  text-align: center;
}

/* --- Row 2: Clue Deduction Stage Wrapper --- */
.layout-clue_deduction .clue-deduction-stage-wrapper {
  grid-area: stage;
  position: relative;
  width: 100%;
  max-width: var(--clue-stage-width, 1240px);
  height: var(--clue-stage-height, 560px);
  border-radius: 32px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65), 0 0 0 3.5px rgba(56, 189, 248, 0.28), inset 0 2px 4px rgba(255, 255, 255, 0.15);
  background: #080e1e;
  animation: clue-stage-enter 0.65s cubic-bezier(0.18, 1.4, 0.3, 1) var(--clip-start, 0s) both;
}

/* Detective Stage Backdrop: Vignette & Cyber Grid (BUG-CD-08) */
.layout-clue_deduction .clue-stage-backdrop {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(circle at 50% 40%, rgba(30, 58, 138, 0.42) 0%, rgba(15, 23, 42, 0.88) 60%, #020617 100%),
    repeating-linear-gradient(0deg, rgba(56, 189, 248, 0.02) 0px, rgba(56, 189, 248, 0.02) 1px, transparent 1px, transparent 40px),
    repeating-linear-gradient(90deg, rgba(56, 189, 248, 0.02) 0px, rgba(56, 189, 248, 0.02) 1px, transparent 1px, transparent 40px);
  box-shadow: inset 0 -36px 60px rgba(0, 0, 0, 0.6);
}

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

/* --- Evidence Exhibition Stage --- */
.layout-clue_deduction .clue-card-stage {
  position: absolute;
  top: 46px;
  left: 0;
  right: 0;
  bottom: 96px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layout-clue_deduction .clue-hero-frame {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 90%;
  max-height: 92%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Brass Forensic Corner Brackets */
.layout-clue_deduction .evidence-bracket {
  position: absolute;
  width: 22px;
  height: 22px;
  pointer-events: none;
  z-index: 5;
  border: 3px solid rgba(251, 191, 36, 0.7);
}
.layout-clue_deduction .bracket-tl { top: 6px; left: 6px; border-right: none; border-bottom: none; }
.layout-clue_deduction .bracket-tr { top: 6px; right: 6px; border-left: none; border-bottom: none; }
.layout-clue_deduction .bracket-bl { bottom: 6px; left: 6px; border-right: none; border-top: none; }
.layout-clue_deduction .bracket-br { bottom: 6px; right: 6px; border-left: none; border-top: none; }

/* Magnifying Loupe Scanner Reticle */
.layout-clue_deduction .clue-loupe-reticle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 180px;
  height: 180px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 6;
  opacity: 0;
  animation: clue-loupe-sweep var(--timer-duration, 5s) ease-in-out calc(var(--clip-start, 0s) + var(--thinking-at, 0s)) both;
}

.layout-clue_deduction .loupe-ring {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px dashed rgba(56, 189, 248, 0.55);
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.3), inset 0 0 15px rgba(56, 189, 248, 0.15);
}

.layout-clue_deduction .loupe-crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14px;
  height: 14px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: rgba(251, 191, 36, 0.85);
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.9);
}

/* Clue Image A: Sharp, Contained, and Prominent */
.layout-clue_deduction .clue-hero-frame > .hero-image {
  position: relative;
  width: 100%;
  height: 100%;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layout-clue_deduction .clue-hero-frame > .hero-image img {
  width: 100%;
  height: 100%;
  max-width: 84%;
  max-height: 84%;
  object-fit: contain;
  filter: drop-shadow(0 18px 32px rgba(0, 0, 0, 0.65));
  transition: transform 0.6s cubic-bezier(0.22, 0.8, 0.3, 1), filter 0.6s ease;
}

/* Ambient Radial Glow Ring */
.layout-clue_deduction .clue-glow-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 440px;
  height: 440px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, rgba(56, 189, 248, 0) 70%);
  filter: blur(28px);
  pointer-events: none;
  z-index: -1;
}

.quiz-question-clip.layout-clue_deduction .clue-glow-ring {
  animation: clue-glow-reveal 0.8s cubic-bezier(0.18, 1.4, 0.3, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) forwards;
}

/* Clue Image Animations (Gentle Float + Reveal Pulse - BUG-CD-01 Fix) */
.quiz-question-clip.layout-clue_deduction .clue-hero-frame > .hero-image img {
  animation:
    clue-hero-gentle-float 4.8s ease-in-out calc(var(--clip-start, 0s) + 0.5s) infinite alternate,
    clue-reveal-pulse 0.75s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

/* Fallbacks for Interactive Sandbox Preview Scrubbers */
.layout-clue_deduction[data-choice-phase="reveal"] .clue-hero-frame > .hero-image img,
.layout-clue_deduction[data-choice-phase="explain"] .clue-hero-frame > .hero-image img,
.layout-clue_deduction.is-revealed .clue-hero-frame > .hero-image img {
  animation: clue-reveal-pulse 0.75s cubic-bezier(0.22, 0.8, 0.3, 1) forwards;
}

.layout-clue_deduction[data-choice-phase="reveal"] .clue-glow-ring,
.layout-clue_deduction[data-choice-phase="explain"] .clue-glow-ring,
.layout-clue_deduction.is-revealed .clue-glow-ring {
  background: radial-gradient(circle, rgba(251, 191, 36, 0.32) 0%, rgba(251, 191, 36, 0) 72%);
  filter: blur(32px);
  transform: translate(-50%, -50%) scale(1.25);
  transition: all 0.6s ease;
}

/* --- Suspect Lineup / Answer Grid (Docked at Foot of Stage - BUG-CD-02 & BUG-CD-06 Fix) --- */
.layout-clue_deduction .clue-deduction-stage-wrapper > .choice-group,
.layout-clue_deduction .clue-deduction-stage-wrapper > .answer-grid {
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

/* 0 & 1 Choice Mode: Centered Verdict Plate */
.layout-clue_deduction .answer-count-0,
.layout-clue_deduction .answer-count-1 {
  width: calc(100% - 48px);
  max-width: 720px;
}

/* 2-Choice Mode: Horizontal Suspect Lineup */
.layout-clue_deduction .answer-count-2 {
  display: flex !important;
  flex-direction: row !important;
  gap: 24px;
  width: calc(100% - 48px);
  max-width: 900px;
}

.layout-clue_deduction .answer-count-2 .choice-card {
  flex: 1 1 0;
  max-width: 440px;
}

/* 3-Choice Mode: 3-Column Suspect Lineup */
.layout-clue_deduction .answer-count-3 {
  display: flex !important;
  flex-direction: row !important;
  gap: 16px;
  width: calc(100% - 48px);
  max-width: 960px;
}

.layout-clue_deduction .answer-count-3 .choice-card {
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

/* --- Row 3: Dedicated Phase Region (BUG-CD-03 & BUG-CD-04 Fix) --- */
.layout-clue_deduction .phase-region {
  grid-area: phase;
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  width: 100%;
  max-width: 1440px;
  min-height: 96px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

/* Thinking Bar: Sized to 1340px to eliminate Star Marker Overflow (BUG-CD-04 Fix) */
.layout-clue_deduction .phase-region > .thinking-bar {
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  width: min(82vw, 1340px);
  min-height: 84px;
  margin: 0 auto;
}

/* Fact Card: Dedicated Row 3 containment with ZERO stage overlap */
.layout-clue_deduction .phase-region > .fact-card {
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  width: min(1200px, 100%);
  max-width: 1200px;
  margin: 0 auto;
}

/* --- Keyframe Animations --- */
@keyframes clue-stage-enter {
  0% {
    opacity: 0;
    transform: translateY(28px) scale(0.96);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes clue-pip-activate {
  0% {
    color: rgba(148, 163, 184, 0.8);
    background: rgba(30, 41, 59, 0.6);
    transform: scale(0.9);
  }
  50% {
    color: #ffffff;
    background: rgba(56, 189, 248, 0.4);
    border-color: #38bdf8;
    transform: scale(1.1);
    box-shadow: 0 0 16px rgba(56, 189, 248, 0.8);
  }
  100% {
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.18);
    border-color: rgba(56, 189, 248, 0.6);
    transform: scale(1);
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
  }
}

@keyframes clue-pip-unmask-amber {
  0% {
    color: rgba(148, 163, 184, 0.8);
    background: rgba(30, 41, 59, 0.6);
  }
  50% {
    color: #ffffff;
    background: rgba(245, 158, 11, 0.45);
    border-color: #f59e0b;
    transform: scale(1.12);
    box-shadow: 0 0 18px rgba(245, 158, 11, 0.8);
  }
  100% {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.18);
    border-color: rgba(245, 158, 11, 0.6);
    transform: scale(1);
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
  }
}

@keyframes clue-pip-unmask-gold {
  0% {
    color: rgba(148, 163, 184, 0.8);
    background: rgba(30, 41, 59, 0.6);
  }
  50% {
    color: #ffffff;
    background: rgba(251, 191, 36, 0.5);
    border-color: #fbbf24;
    transform: scale(1.15);
    box-shadow: 0 0 22px rgba(251, 191, 36, 0.9);
  }
  100% {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.2);
    border-color: rgba(251, 191, 36, 0.7);
    transform: scale(1);
    box-shadow: 0 0 12px rgba(251, 191, 36, 0.5);
  }
}

@keyframes clue-status-fade-out {
  to {
    opacity: 0;
    pointer-events: none;
  }
}

@keyframes clue-status-solved-in {
  0% {
    opacity: 0;
    transform: scale(0.7) rotate(-4deg);
  }
  60% {
    opacity: 1;
    transform: scale(1.1) rotate(1deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes clue-loupe-sweep {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.85);
  }
  15% {
    opacity: 0.9;
    transform: translate(-65%, -55%) scale(1);
  }
  50% {
    opacity: 0.9;
    transform: translate(-35%, -45%) scale(1.05);
  }
  85% {
    opacity: 0.9;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.15);
  }
}

@keyframes clue-hero-gentle-float {
  0% { transform: translateY(0) scale(1); }
  100% { transform: translateY(-6px) scale(1.018); }
}

@keyframes clue-reveal-pulse {
  0% {
    transform: scale(1);
    filter: drop-shadow(0 18px 32px rgba(0, 0, 0, 0.65));
  }
  45% {
    transform: scale(1.055);
    filter: drop-shadow(0 24px 44px rgba(251, 191, 36, 0.5)) brightness(1.12);
  }
  100% {
    transform: scale(1.025);
    filter: drop-shadow(0 20px 36px rgba(0, 0, 0, 0.65)) brightness(1.03);
  }
}

@keyframes clue-glow-reveal {
  0% {
    background: radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, rgba(56, 189, 248, 0) 70%);
    filter: blur(28px);
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    background: radial-gradient(circle, rgba(251, 191, 36, 0.38) 0%, rgba(251, 191, 36, 0) 72%);
    filter: blur(34px);
    transform: translate(-50%, -50%) scale(1.28);
  }
}

@keyframes clue-suspect-enter {
  0% {
    opacity: 0;
    transform: translateY(24px) scale(0.92);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes clue-answer-dock {
  0% {
    opacity: 0;
    transform: translateY(32px) scale(0.9);
  }
  70% {
    transform: translateY(-4px) scale(1.03);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes clue-correct-dock {
  0% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-8px) scale(1.045);
  }
  100% {
    transform: translateY(-4px) scale(1.025);
  }
}

/* --- Mascot Coexistence Adjustments (BUG-CD-09 Fix) --- */
.has-mascot.layout-clue_deduction .game-stage {
  width: var(--mascot-content-width, 1420px);
  margin-right: 40px;
}

.has-mascot.layout-clue_deduction .clue-deduction-stage-wrapper {
  max-width: 1180px;
}

.has-mascot.layout-clue_deduction .phase-region > .thinking-bar {
  width: min(72vw, 1180px);
  margin: 0 auto;
}

.has-mascot.layout-clue_deduction .phase-region > .fact-card {
  max-width: 1180px;
}

/* --- Portrait 9:16 Fallback Guardrail (BUG-CD-10) --- */
${
  aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .layout-clue_deduction .game-stage {
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "title" "stage" "phase";
  row-gap: 20px;
  width: calc(100% - 72px);
  margin: 184px auto 0;
}
#stage[data-aspect-ratio="9:16"] .layout-clue_deduction .clue-deduction-stage-wrapper {
  width: 100%;
  max-width: 980px;
  height: 1100px;
  border-radius: 36px;
}
#stage[data-aspect-ratio="9:16"] .layout-clue_deduction .clue-deduction-stage-wrapper > .choice-group,
#stage[data-aspect-ratio="9:16"] .layout-clue_deduction .clue-deduction-stage-wrapper > .answer-grid {
  bottom: 32px;
  width: calc(100% - 40px);
  max-width: 760px;
}
#stage[data-aspect-ratio="9:16"] .layout-clue_deduction .choice-card {
  padding: 16px 28px;
  min-height: 80px;
  height: 80px;
  border-radius: 20px;
}
#stage[data-aspect-ratio="9:16"] .layout-clue_deduction .choice-text {
  font-size: var(--choice-fitted-font-size, var(--choice-font-size-base, 46px));
}
`
    : ""
}`,
} satisfies QuizLayoutRenderDefinition;
