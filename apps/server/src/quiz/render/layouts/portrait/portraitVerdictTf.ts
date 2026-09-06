import type { QuizLayoutRenderDefinition } from "../types.js";

/**
 * Portrait Verdict True/False Layout (9:16 Vertical Video).
 *
 * Tailored specifically for 1080×1920 mobile portrait video (TikTok, YouTube Shorts, Instagram Reels).
 * Architectural requirements:
 * 1. Question Box: Centered statement card style, max-width ~880px, clears the top counter badge (margin-top: 176px).
 * 2. Center Visual: Large prominent visual area (860px width × 540px height), rounded-3xl borders, glowing depth shadow.
 * 3. True / False Choice Buttons:
 *    - 2 oversized high-contrast 3D arcade pill buttons (width: 720px, height: 124px).
 *    - TRUE: Emerald Green styling (#10B981 / #059669 gradient) with 14px solid base lip (0 14px 0 #047857), bold text, and checkmark (✓).
 *    - FALSE: Rose Red styling (#F43F5E / #E11D48 gradient) with 14px solid base lip (0 14px 0 #9F1239), bold text, and cross (✕).
 *    - Safe-zone clearance: >= 140px right padding (padding-right: 140px) providing >= 250px right margin protecting choices from TikTok/Reels rail.
 * 4. Synchronized Multi-Phase Timeline:
 *    - Phase 2 entrance animations coupled to var(--choices-at) with spring overshoot: calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.06s) and + 0.16s.
 *    - Phase 4 reveal animations with high-specificity victory bloom (@keyframes verdict-correct-pop) and settlement (@keyframes verdict-incorrect-settle).
 * 5. Embedded Phase Region & Co-Axial Alignment:
 *    - Placed directly below choices, sharing the exact same vertical center line (x = 470px) as the buttons with >= 250px right clearance.
 *    - Elevated Thinking Bar and Fact Card sit at or above y = 1480px, guaranteeing >= 440px clean bottom buffer.
 *    - Fact Card constrained to 720px, preventing encroachment into the 140px right action rail.
 */
export const portraitVerdictTfLayout = {
  id: "portrait_verdict_tf",
  renderBody: (slots) =>
    `${slots.questionBoxHtml}${slots.heroHtml}${slots.choicesHtml}<div class="phase-region portrait-phase-embedded">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
/* === Portrait Verdict True/False Layout (9:16 TikTok / Reels / Shorts) === */
.layout-portrait_verdict_tf .game-stage {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "title"
    "hero"
    "answers"
    "phase";
  justify-items: center;
  align-items: start;
  width: 100%;
  max-width: 960px;
  min-height: 0;
  margin: 176px auto 0;
  padding: 0 24px;
  box-sizing: border-box;
  row-gap: 20px;
}

/* Question Statement Card: Centered, statement card style, max-width ~880px */
.layout-portrait_verdict_tf .question-title {
  grid-area: title;
  width: 100%;
  max-width: 880px;
  min-height: 140px;
  height: auto;
  margin: 0 auto;
  text-align: center;
  justify-self: center;
}
.layout-portrait_verdict_tf .question-card-inner {
  padding: 20px 32px;
  border-radius: 36px;
  box-sizing: border-box;
}

/* Center Visual: Large prominent visual area (860px width × 540px height), rounded-3xl borders, glowing depth shadow */
.layout-portrait_verdict_tf .game-stage > .hero-image {
  grid-area: hero;
  width: 860px;
  height: 540px;
  max-width: 860px;
  max-height: 540px;
  margin: 0 auto;
  border-radius: 32px;
  border: 10px solid #FFFFFF;
  box-shadow:
    0 16px 0 rgba(13, 35, 71, 0.22),
    0 24px 48px rgba(10, 25, 60, 0.28),
    0 0 32px rgba(255, 215, 0, 0.28),
    inset 0 4px 8px rgba(255, 255, 255, 0.5);
  overflow: hidden;
  box-sizing: border-box;
}
.layout-portrait_verdict_tf .hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 22px;
}
.layout-portrait_verdict_tf.quiz-question-clip .hero-image {
  animation: enter-from-left 0.62s cubic-bezier(0.22, 0.8, 0.3, 1) var(--clip-start) both,
    hero-float var(--scene-duration) ease-in-out calc(var(--clip-start) + 0.62s) 1 alternate both;
  will-change: transform;
}

/* Verdict Choices: 2 oversized high-contrast pill buttons with >= 140px safe-zone clearance */
.layout-portrait_verdict_tf .answer-grid {
  grid-area: answers;
  grid-template-columns: 1fr;
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-right: 140px; /* Safe-zone clearance >= 140px for TikTok/Reels action rail */
  gap: 20px;
}

.layout-portrait_verdict_tf {
  --choice-card-min-height: 124px;
  --choice-card-height: 124px;
  --choice-card-margin-left: 68px;
  --choice-card-padding: 14px 36px 14px 40px;
  --choice-badge-size: 120px;
  --choice-badge-margin-left: -68px;
  --choice-badge-font-size: 68px;
  --choice-font-size-base: 44px;
  --choice-font-size-medium: 38px;
  --choice-font-size-long: 30px;
  --choice-font-size-very_long: 24px;
  --choice-font-size-overflow: 22px;
  --choice-fit-min: 22px;
  --choice-fit-max: 72px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
}

.has-mascot.layout-portrait_verdict_tf {
  --choice-font-size-base: 38px;
  --choice-font-size-medium: 32px;
  --choice-font-size-long: 26px;
}

/* Oversized Pill Button Shape: 720px width bounded inside 860px grid */
.layout-portrait_verdict_tf .choice-card,
.layout-portrait_verdict_tf .choice-card-text,
.layout-portrait_verdict_tf .answer-card {
  width: 100%;
  max-width: 720px;
  border-radius: 9999px;
  box-sizing: border-box;
  transition: transform 0.2s cubic-bezier(0.22, 0.8, 0.3, 1), opacity 0.2s ease-out;
}

/* TRUE Button: Emerald Green styling (#10B981 / #059669 gradient) with 14px solid base lip and top highlight */
.layout-portrait_verdict_tf .choice-card:nth-child(1) .choice-card-surface,
.layout-portrait_verdict_tf .choice-card:nth-child(1).answer-card,
.layout-portrait_verdict_tf .choice-card:first-child .choice-card-surface,
.layout-portrait_verdict_tf .choice-card:first-child.answer-card,
.layout-portrait_verdict_tf .choice-card[data-choice-order="0"] .choice-card-surface,
.layout-portrait_verdict_tf .choice-card[data-choice-order="0"].answer-card,
.layout-portrait_verdict_tf .choice-true {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  border: 6px solid #FFFFFF;
  border-radius: 9999px;
  box-shadow:
    0 14px 0 #047857,
    0 22px 38px rgba(5, 150, 105, 0.35),
    0 0 28px rgba(16, 185, 129, 0.4),
    inset 0 4px 8px rgba(255, 255, 255, 0.6);
  color: #FFFFFF;
}

.layout-portrait_verdict_tf .choice-card:nth-child(1) .choice-label,
.layout-portrait_verdict_tf .choice-card:first-child .choice-label {
  background: linear-gradient(135deg, #34D399 0%, #059669 100%);
  border: 5px solid #FFFFFF;
  border-radius: 50%;
  box-shadow:
    0 6px 0 rgba(4, 120, 87, 0.4),
    0 0 16px rgba(16, 185, 129, 0.5),
    inset 0 2px 4px rgba(255, 255, 255, 0.7);
  color: #FFFFFF;
}

.layout-portrait_verdict_tf .choice-card:nth-child(1) .choice-text::after,
.layout-portrait_verdict_tf .choice-card:first-child .choice-text::after,
.layout-portrait_verdict_tf .choice-true .choice-text::after {
  content: " ✓";
  font-weight: 900;
  margin-left: 14px;
  font-size: 1.2em;
  color: #FFFFFF;
  text-shadow: 0 2px 4px rgba(4, 120, 87, 0.6);
}

/* FALSE Button: Rose Red styling (#F43F5E / #E11D48 gradient) with 14px solid base lip and top highlight */
.layout-portrait_verdict_tf .choice-card:nth-child(2) .choice-card-surface,
.layout-portrait_verdict_tf .choice-card:nth-child(2).answer-card,
.layout-portrait_verdict_tf .choice-card:last-child .choice-card-surface,
.layout-portrait_verdict_tf .choice-card:last-child.answer-card,
.layout-portrait_verdict_tf .choice-card[data-choice-order="1"] .choice-card-surface,
.layout-portrait_verdict_tf .choice-card[data-choice-order="1"].answer-card,
.layout-portrait_verdict_tf .choice-false {
  background: linear-gradient(135deg, #F43F5E 0%, #E11D48 100%);
  border: 6px solid #FFFFFF;
  border-radius: 9999px;
  box-shadow:
    0 14px 0 #9F1239,
    0 22px 38px rgba(225, 29, 72, 0.35),
    0 0 28px rgba(244, 63, 94, 0.4),
    inset 0 4px 8px rgba(255, 255, 255, 0.6);
  color: #FFFFFF;
}

.layout-portrait_verdict_tf .choice-card:nth-child(2) .choice-label,
.layout-portrait_verdict_tf .choice-card:last-child .choice-label {
  background: linear-gradient(135deg, #FB7185 0%, #E11D48 100%);
  border: 5px solid #FFFFFF;
  border-radius: 50%;
  box-shadow:
    0 6px 0 rgba(159, 18, 57, 0.4),
    0 0 16px rgba(244, 63, 94, 0.5),
    inset 0 2px 4px rgba(255, 255, 255, 0.7);
  color: #FFFFFF;
}

.layout-portrait_verdict_tf .choice-card:nth-child(2) .choice-text::after,
.layout-portrait_verdict_tf .choice-card:last-child .choice-text::after,
.layout-portrait_verdict_tf .choice-false .choice-text::after {
  content: " ✕";
  font-weight: 900;
  margin-left: 14px;
  font-size: 1.2em;
  color: #FFFFFF;
  text-shadow: 0 2px 4px rgba(159, 18, 57, 0.6);
}

/* Bold Choice Text */
.layout-portrait_verdict_tf .choice-card .choice-text,
.layout-portrait_verdict_tf .choice-card .answer-card span {
  font-weight: 900;
  letter-spacing: 0.5px;
  color: #FFFFFF;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* Phase 2: Dynamic Staggered Entrance Animations for Pill Buttons (Synchronized to choices-at) */
.layout-portrait_verdict_tf.quiz-question-clip .choice-card:nth-child(1) {
  animation: enter-from-left 0.52s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.06s) both;
}
.layout-portrait_verdict_tf.quiz-question-clip .choice-card:nth-child(2) {
  animation: enter-from-right 0.52s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.16s) both;
}

/* Phase 4: High-Specificity Victory Bloom & Settlement Reveal Keyframes */
.layout-portrait_verdict_tf.quiz-question-clip .choice-card.answer-reveal-correct,
.layout-portrait_verdict_tf.quiz-question-clip .choice-card.answer-correct {
  animation: verdict-correct-pop 0.65s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both !important;
  z-index: 6 !important;
}
.layout-portrait_verdict_tf.quiz-question-clip .choice-card.answer-reveal-incorrect,
.layout-portrait_verdict_tf.quiz-question-clip .choice-card.answer-incorrect {
  animation: verdict-incorrect-settle 0.42s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both !important;
  z-index: 2 !important;
}

@keyframes verdict-correct-pop {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-10px) scale(1.06); filter: brightness(1.15); }
  100% {
    transform: translateY(-6px) scale(1.05);
    box-shadow:
      0 16px 0 #047857,
      0 26px 48px rgba(16, 185, 129, 0.6),
      0 0 44px rgba(52, 211, 153, 0.8),
      inset 0 4px 8px rgba(255, 255, 255, 0.85);
  }
}

@keyframes verdict-incorrect-settle {
  0% { transform: scale(1); opacity: 1; filter: grayscale(0%); }
  100% {
    transform: translateY(4px) scale(0.94);
    opacity: 0.32;
    filter: grayscale(85%) contrast(0.9) brightness(0.85);
    box-shadow: 0 4px 0 rgba(13, 35, 71, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
  }
}

/* Embedded Phase Region: Placed directly below choices, centered along x = 470px with >= 250px right clearance */
.layout-portrait_verdict_tf .phase-region {
  grid-area: phase;
  position: relative;
  z-index: 5;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  transform: none;
  width: 100%;
  max-width: 860px;
  height: 90px;
  margin: 14px auto 0;
  padding-right: 140px; /* Safe-zone clearance >= 140px aligned with choice buttons */
  box-sizing: border-box;
}

/* Thinking Bar: Sits centered directly beneath the 720px pill stack */
.layout-portrait_verdict_tf .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: calc((100% - 140px) / 2);
  transform: translateX(-50%);
  width: min(720px, calc(100% - 140px));
  min-height: 72px;
}

/* Fact Card: Constrained to 720px max, guaranteeing >= 140px right safe-zone clearance */
.layout-portrait_verdict_tf .phase-region > .fact-card {
  position: absolute;
  top: 0;
  bottom: auto;
  left: calc((100% - 140px) / 2);
  transform: translateX(-50%);
  width: min(720px, calc(100% - 140px));
  margin-top: 0;
  padding: 16px 28px;
  border-radius: 32px;
  box-sizing: border-box;
  animation: verdict-fact-enter 0.42s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reward-at, 0s)) both;
}

@keyframes verdict-fact-enter {
  0% { opacity: 0; transform: translate(-50%, 16px) scale(0.92); }
  100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
}

/* Specificity overrides for 9:16 stage canvas */
#stage[data-aspect-ratio="9:16"] .layout-portrait_verdict_tf .game-stage {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "title"
    "hero"
    "answers"
    "phase";
  width: calc(100% - 72px);
  max-width: 960px;
  min-height: 0;
  margin: 176px auto 0;
  padding-bottom: 0;
  margin-bottom: 440px; /* Bottom safe-zone clearance: guarantees at least 440px clean buffer from the bottom */
  row-gap: 20px;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_verdict_tf .question-title {
  width: 100%;
  max-width: 880px;
  min-height: 140px;
  height: auto;
  margin: 0 auto;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_verdict_tf .game-stage > .hero-image {
  width: 860px;
  height: 540px;
  max-width: 860px;
  max-height: 540px;
  margin: 0 auto;
  border-radius: 32px;
  border: 10px solid #FFFFFF;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_verdict_tf .answer-grid {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding-right: 140px; /* Safe-zone clearance >= 140px for TikTok/Reels right action rail */
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_verdict_tf .phase-region {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  transform: none;
  width: 100%;
  max-width: 860px;
  height: 90px;
  margin: 14px auto 0;
  padding-right: 140px; /* Safe-zone clearance >= 140px */
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_verdict_tf .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: calc((100% - 140px) / 2);
  transform: translateX(-50%);
  width: min(720px, calc(100% - 140px));
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_verdict_tf .phase-region > .fact-card {
  position: absolute;
  top: 0;
  bottom: auto;
  left: calc((100% - 140px) / 2);
  transform: translateX(-50%);
  width: min(720px, calc(100% - 140px));
}
`,
} satisfies QuizLayoutRenderDefinition;
