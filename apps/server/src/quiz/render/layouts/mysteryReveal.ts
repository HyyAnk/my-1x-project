import type { QuizLayoutRenderDefinition } from "./types.js";

export const mysteryRevealLayout = {
  id: "mystery_reveal",
  renderBody: (slots) =>
    `${slots.questionBoxHtml}` +
    `<div class="mystery-stage-wrapper" data-layout-allow-overflow>` +
      `<div class="mystery-stage-backdrop"></div>` +
      `<div class="mystery-hero-stage">` +
        `<div class="mystery-layer mystery-mosaic-layer">${slots.heroHtml}</div>` +
        `<div class="mystery-layer mystery-revealed-layer">` +
          `<div class="mystery-revealed-inner">${slots.heroHtml}</div>` +
        `</div>` +
        `<div class="mystery-scanner-bar" data-layout-ignore aria-hidden="true">` +
          `<div class="scanner-beam"></div>` +
          `<div class="scanner-flare"></div>` +
        `</div>` +
      `</div>` +
      `${slots.choicesHtml}` +
      `<svg class="mystery-svg-filters" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;" aria-hidden="true">` +
        `<defs>` +
          `<filter id="mystery-mosaic-filter" x="0%" y="0%" width="100%" height="100%">` +
            `<feFlood x="2" y="2" height="2" width="2"/>` +
            `<feComposite width="22" height="22"/>` +
            `<feTile result="tile"/>` +
            `<feComposite in="SourceGraphic" in2="tile" operator="in"/>` +
            `<feMorphology operator="dilate" radius="11"/>` +
          `</filter>` +
        `</defs>` +
      `</svg>` +
    `</div>` +
    `<div class="phase-region">${slots.phaseHtml}</div>`,

  css: (aspectRatio) => `
/* ==========================================================================
   Mystery Reveal: Studio Stage with Dual-State Mosaic & Scanner Reveal
   16:9 Landscape Optimized (1920x1080) - Candy Arcade v2
   ========================================================================== */

.layout-mystery_reveal {
  --mystery-stage-width: 1240px;
  --mystery-stage-height: 590px;
  --choice-card-min-height: 84px;
  --choice-card-height: auto;
  --choice-card-margin-left: 0px;
  --choice-card-padding: 14px 32px;
  --choice-badge-size: 0px;
  --choice-badge-margin-left: 0px;
  --choice-badge-font-size: 0px;
  --choice-font-size-base: 48px;
  --choice-font-size-medium: 42px;
  --choice-font-size-long: 34px;
  --choice-font-size-very_long: 28px;
  --choice-font-size-overflow: 26px;
  --choice-fit-min: 24px;
  --choice-fit-max: 64px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.12;
  --choice-fit-multiline-gain: 4px;
}

/* --- 3-Row Explicit CSS Grid (Eliminates Phase 5 Fact Card Overlap - BUG-MR-02) --- */
.layout-mystery_reveal .game-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto auto;
  grid-template-areas:
    "title"
    "stage"
    "phase";
  align-items: center;
  justify-items: center;
  row-gap: 16px;
  width: 1580px;
  min-height: 945px;
  margin: 12px 40px 0 auto;
}

.has-mascot.layout-mystery_reveal .game-stage {
  width: 1420px;
  margin-right: 40px;
}

.layout-mystery_reveal .question-title {
  grid-area: title;
  width: 100%;
  max-width: 1440px;
  text-align: center;
  margin: 0 auto;
}

/* --- Mystery Stage Viewport --- */
.layout-mystery_reveal .mystery-stage-wrapper {
  grid-area: stage;
  position: relative;
  width: 100%;
  max-width: var(--mystery-stage-width, 1240px);
  height: var(--mystery-stage-height, 590px);
  border-radius: 32px;
  overflow: hidden;
  border: 5px solid rgba(251, 191, 36, 0.4);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55), 0 0 40px rgba(56, 189, 248, 0.18), inset 0 2px 4px rgba(255, 255, 255, 0.2);
  background: #090d1a;
  contain: layout paint;
}

/* Cosmic Arcade Mystery Stage Backdrop (BUG-MR-10 Upgrade) */
.layout-mystery_reveal .mystery-stage-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  background: radial-gradient(circle at 50% 42%, #1e1b4b 0%, #0f172a 62%, #020617 100%);
  box-shadow: inset 0 -48px 72px rgba(0, 0, 0, 0.6), inset 0 0 60px rgba(56, 189, 248, 0.12);
}

.layout-mystery_reveal .mystery-stage-backdrop::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
  background-size: 28px 28px;
  opacity: 0.35;
  pointer-events: none;
}

/* Dual-State Hero Stage */
.layout-mystery_reveal .mystery-hero-stage {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layout-mystery_reveal .mystery-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layout-mystery_reveal .mystery-layer .hero-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  border-radius: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layout-mystery_reveal .mystery-layer .hero-image img {
  width: 100%;
  height: 100%;
  max-width: 85%;
  max-height: 76%;
  object-fit: contain;
}

/* State A: Mosaic / Silhouette Mask Layer (BUG-MR-06 Bulletproof Fallback) */
.layout-mystery_reveal .mystery-mosaic-layer {
  z-index: 2;
  opacity: 1;
  transition: opacity 0.4s ease;
}

.layout-mystery_reveal .mystery-mosaic-layer img {
  filter: blur(20px) contrast(180%) brightness(0.82) drop-shadow(0 20px 32px rgba(0, 0, 0, 0.6));
  animation: mystery-hero-shimmer 3.2s ease-in-out infinite alternate;
  will-change: filter, transform;
}

@supports (filter: url('#mystery-mosaic-filter')) {
  .layout-mystery_reveal .mystery-mosaic-layer img {
    filter: url(#mystery-mosaic-filter) blur(4px) contrast(140%) brightness(0.85) drop-shadow(0 20px 32px rgba(0, 0, 0, 0.6));
  }
}

.layout-mystery_reveal.is-silhouette .mystery-mosaic-layer img {
  filter: brightness(0) drop-shadow(0 16px 36px rgba(0, 0, 0, 0.75));
}

/* State B: Pristine Revealed Layer (Curtain Stencil Wiped from Left to Right - BUG-MR-04 Alignment Fix) */
.layout-mystery_reveal .mystery-revealed-layer {
  z-index: 3;
  width: 0%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.layout-mystery_reveal .mystery-revealed-inner {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--mystery-stage-width, 1240px);
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layout-mystery_reveal .mystery-revealed-layer img {
  filter: drop-shadow(0 24px 44px rgba(0, 0, 0, 0.55));
}

/* Scanner Bar: High-Voltage Neon Laser Line */
.layout-mystery_reveal .mystery-scanner-bar {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 6px;
  z-index: 6;
  opacity: 0;
  pointer-events: none;
}

.layout-mystery_reveal .scanner-beam {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, rgba(56, 189, 248, 0) 0%, #38bdf8 20%, #ffffff 50%, #38bdf8 80%, rgba(56, 189, 248, 0) 100%);
  box-shadow: 0 0 16px #38bdf8, 0 0 36px #0284c7, 0 0 60px rgba(56, 189, 248, 0.7);
}

.layout-mystery_reveal .scanner-flare {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 240px;
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.95) 0%, rgba(56, 189, 248, 0.7) 45%, transparent 75%);
  filter: blur(4px);
}

/* === Scheduled Timeline Animations (Production-Ready - BUG-MR-01 Fix) === */
.quiz-question-clip.layout-mystery_reveal .mystery-scanner-bar {
  animation: mystery-scanner-sweep 0.85s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.quiz-question-clip.layout-mystery_reveal .mystery-revealed-layer {
  pointer-events: auto;
  animation: mystery-reveal-wipe 0.85s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.quiz-question-clip.layout-mystery_reveal .mystery-mosaic-layer {
  animation: mystery-mosaic-vanish 0.85s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

/* Backward-compatibility selectors for sandbox snapshot preview */
.layout-mystery_reveal[data-choice-phase="reveal"] .mystery-scanner-bar,
.layout-mystery_reveal[data-choice-phase="explain"] .mystery-scanner-bar,
.layout-mystery_reveal.is-revealed .mystery-scanner-bar {
  animation: mystery-scanner-sweep 0.85s cubic-bezier(0.22, 0.8, 0.3, 1) forwards;
}

.layout-mystery_reveal[data-choice-phase="reveal"] .mystery-revealed-layer,
.layout-mystery_reveal[data-choice-phase="explain"] .mystery-revealed-layer,
.layout-mystery_reveal.is-revealed .mystery-revealed-layer {
  pointer-events: auto;
  animation: mystery-reveal-wipe 0.85s cubic-bezier(0.22, 0.8, 0.3, 1) forwards;
}

.layout-mystery_reveal[data-choice-phase="reveal"] .mystery-mosaic-layer,
.layout-mystery_reveal[data-choice-phase="explain"] .mystery-mosaic-layer,
.layout-mystery_reveal.is-revealed .mystery-mosaic-layer {
  animation: mystery-mosaic-vanish 0.85s cubic-bezier(0.22, 0.8, 0.3, 1) forwards;
}

/* === Answer Card & Grid System (Mode A: Riddle vs Mode B: Multi-Choice - BUG-MR-03 Fix) === */
.layout-mystery_reveal .mystery-stage-wrapper > .choice-group,
.layout-mystery_reveal .mystery-stage-wrapper > .answer-grid {
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

/* Mode A: Single Answer / Riddle Mode (count <= 1) */
.layout-mystery_reveal .answer-count-0,
.layout-mystery_reveal .answer-count-1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 840px;
}

.layout-mystery_reveal .answer-count-0 .choice-card,
.layout-mystery_reveal .answer-count-1 .choice-card {
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

.layout-mystery_reveal .answer-count-0 .choice-badge,
.layout-mystery_reveal .answer-count-0 .choice-label,
.layout-mystery_reveal .answer-count-1 .choice-badge,
.layout-mystery_reveal .answer-count-1 .choice-label {
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
.layout-mystery_reveal .answer-count-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  max-width: 960px;
}

.layout-mystery_reveal .answer-count-3 {
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

/* === Row 3: Phase Region (Integrated CSS Grid Flow - ZERO OVERLAP - BUG-MR-02 & BUG-MR-05 Fix) === */
.layout-mystery_reveal .phase-region {
  grid-area: phase;
  position: relative;
  left: auto;
  bottom: auto;
  width: 100%;
  max-width: 1440px;
  min-height: 96px;
  height: 110px;
  transform: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.layout-mystery_reveal .phase-region > .thinking-bar {
  position: relative;
  bottom: auto;
  left: auto;
  transform: none;
  width: min(82vw, 1320px);
  min-height: 84px;
  margin: 0 auto;
}

.has-mascot.layout-mystery_reveal .phase-region > .thinking-bar {
  width: min(75vw, 1100px);
}

.layout-mystery_reveal .phase-region > .fact-card {
  position: relative;
  bottom: auto;
  left: auto;
  transform: none;
  width: min(1200px, 100%);
  margin: 0 auto;
}

.has-mascot.layout-mystery_reveal .phase-region > .fact-card {
  width: min(1080px, 100%);
}

/* === Mascot Adaptive Width Tokens (BUG-MR-04 70px Image Wipe Fix) === */
.has-mascot.layout-mystery_reveal {
  --mystery-stage-width: 1100px;
}

.has-mascot.layout-mystery_reveal .mystery-stage-wrapper {
  max-width: var(--mystery-stage-width, 1100px);
  width: 100%;
}

.has-mascot.layout-mystery_reveal .mystery-revealed-inner {
  width: var(--mystery-stage-width, 1100px);
}

/* === Keyframe Animations === */
@keyframes mystery-scanner-sweep {
  0% {
    left: 0%;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    left: 100%;
    opacity: 0;
  }
}

@keyframes mystery-reveal-wipe {
  0% {
    width: 0%;
  }
  100% {
    width: 100%;
  }
}

@keyframes mystery-mosaic-vanish {
  0% {
    opacity: 1;
  }
  85% {
    opacity: 0.6;
  }
  100% {
    opacity: 0;
  }
}

@keyframes mystery-answer-dock {
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

@keyframes mystery-choice-stagger-in {
  0% {
    opacity: 0;
    transform: translateY(24px) scale(0.92);
  }
  70% {
    transform: translateY(-3px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes mystery-hero-shimmer {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.025);
  }
}

/* --- Portrait 9:16 Fallback Guardrail (BUG-MR-09) --- */
${
  aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .layout-mystery_reveal .game-stage {
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "title" "stage" "phase";
  row-gap: 20px;
  width: 100%;
}
#stage[data-aspect-ratio="9:16"] .layout-mystery_reveal .mystery-stage-wrapper {
  width: 100%;
  max-width: 980px;
  height: 1100px;
  border-radius: 36px;
}
#stage[data-aspect-ratio="9:16"] .layout-mystery_reveal .mystery-stage-wrapper > .answer-grid,
#stage[data-aspect-ratio="9:16"] .layout-mystery_reveal .mystery-stage-wrapper > .choice-group {
  bottom: 32px;
  width: calc(100% - 40px);
  max-width: 760px;
}
#stage[data-aspect-ratio="9:16"] .layout-mystery_reveal .choice-card {
  padding: 16px 28px;
  min-height: 80px;
  border-radius: 20px;
}
#stage[data-aspect-ratio="9:16"] .layout-mystery_reveal .choice-text {
  font-size: var(--choice-fitted-font-size, var(--choice-font-size-base, 46px));
}
`
    : ""
}`,
} satisfies QuizLayoutRenderDefinition;
