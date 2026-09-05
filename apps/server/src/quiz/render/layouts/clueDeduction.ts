import type { QuizLayoutRenderDefinition } from "./types.js";

export const clueDeductionLayout = {
  id: "clue_deduction",
  renderBody: (slots) =>
    `${slots.questionBoxHtml}<div class="clue-deduction-stage-wrapper" data-layout-allow-overflow><div class="clue-stage-backdrop"></div><div class="clue-card-stage"><div class="clue-hero-frame">${slots.heroHtml}<div class="clue-glow-ring" data-layout-ignore aria-hidden="true"></div></div></div>${slots.choicesHtml}</div><div class="phase-region">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
/* === Clue Deduction: Pristine Clue Stage with Radiant Answer Reveal === */
.layout-clue_deduction {
  --clue-stage-width: 1240px;
}
.layout-clue_deduction .game-stage {
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "title" "stage";
  align-items: center;
  justify-items: center;
  row-gap: 24px;
  width: 100%;
}
.layout-clue_deduction .question-title {
  grid-area: title;
  width: 100%;
  max-width: 1440px;
  text-align: center;
  margin: 0 auto;
}
.layout-clue_deduction .clue-deduction-stage-wrapper {
  grid-area: stage;
  position: relative;
  width: 100%;
  max-width: var(--clue-stage-width, 1240px);
  height: 650px;
  border-radius: 32px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
  background: #0b1329;
}

/* Elegant Spotlight & Ambient Depth Backdrop */
.layout-clue_deduction .clue-stage-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  background: radial-gradient(circle at 50% 36%, rgba(30, 58, 138, 0.45) 0%, rgba(15, 23, 42, 0.85) 55%, #020617 100%);
  box-shadow: inset 0 -48px 72px rgba(0, 0, 0, 0.5);
}

/* Clue Exhibition Stage */
.layout-clue_deduction .clue-card-stage {
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

.layout-clue_deduction .clue-hero-frame {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: clue-gentle-breathe 4s ease-in-out infinite alternate;
}

.layout-clue_deduction .clue-hero-frame > .hero-image {
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

/* Clue Image A: Always 100% visible, sharp, clear, and prominent */
.layout-clue_deduction .clue-hero-frame > .hero-image img {
  width: 100%;
  height: 100%;
  max-width: 86%;
  max-height: 86%;
  object-fit: contain;
  filter: drop-shadow(0 20px 36px rgba(0, 0, 0, 0.55));
  transition: transform 0.6s cubic-bezier(0.22, 0.8, 0.3, 1), filter 0.6s ease;
}

/* Ambient Glow Ring behind Clue Image */
.layout-clue_deduction .clue-glow-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 480px;
  height: 480px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, rgba(56, 189, 248, 0) 70%);
  filter: blur(24px);
  pointer-events: none;
  z-index: -1;
}

/* === Reveal Phase Actions === */
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

/* Reveal Answer Banner Docked Over Foot of Stage */
.layout-clue_deduction .clue-deduction-stage-wrapper > .answer-grid {
  position: absolute;
  bottom: 28px;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
  width: calc(100% - 64px);
  max-width: 860px;
  z-index: 10;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* Hide non-correct choices in single answer mode */
.layout-clue_deduction .choice-card:not(.answer-correct):not(:only-child) {
  display: none !important;
}

/* Hide multiple-choice letter badges */
.layout-clue_deduction .choice-badge,
.layout-clue_deduction .choice-label {
  display: none !important;
}

/* Floating Answer Card Plate */
.layout-clue_deduction .choice-card {
  width: 100%;
  min-height: 84px;
  height: auto;
  margin: 0 auto;
  padding: 16px 36px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%);
  border: 3px solid #38bdf8;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 35px rgba(56, 189, 248, 0.4);
  backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.18, 1.4, 0.3, 1);
}

.layout-clue_deduction .choice-text {
  font-size: var(--choice-fitted-font-size, var(--choice-font-size-base, 50px));
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #ffffff;
  text-shadow: 0 3px 12px rgba(0, 0, 0, 0.9), 0 0 24px rgba(56, 189, 248, 0.6);
  text-align: center;
  width: 100%;
}

/* Hide answer text before reveal in question/thinking phase */
.layout-clue_deduction[data-choice-phase="choices"] .choice-card,
.layout-clue_deduction[data-choice-phase="thinking"] .choice-card {
  opacity: 0;
  transform: translateY(28px) scale(0.94);
  pointer-events: none;
}

/* Docked pop-in animation on reveal */
.layout-clue_deduction[data-choice-phase="reveal"] .choice-card,
.layout-clue_deduction[data-choice-phase="explain"] .choice-card,
.layout-clue_deduction.is-revealed .choice-card,
.layout-clue_deduction .choice-card.answer-correct {
  opacity: 1;
  transform: translateY(0) scale(1);
  border-color: #fbbf24;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 35px rgba(251, 191, 36, 0.45);
  animation: clue-answer-dock 0.65s cubic-bezier(0.18, 1.4, 0.3, 1) both;
}

.layout-clue_deduction .choice-card.answer-correct .choice-text {
  text-shadow: 0 3px 12px rgba(0, 0, 0, 0.9), 0 0 24px rgba(251, 191, 36, 0.65);
}

/* === Animations === */
@keyframes clue-gentle-breathe {
  0% {
    transform: scale(0.98);
  }
  100% {
    transform: scale(1.02);
  }
}

@keyframes clue-reveal-pulse {
  0% {
    transform: scale(1);
    filter: drop-shadow(0 20px 36px rgba(0, 0, 0, 0.55));
  }
  45% {
    transform: scale(1.05);
    filter: drop-shadow(0 24px 44px rgba(251, 191, 36, 0.45)) brightness(1.1);
  }
  100% {
    transform: scale(1.02);
    filter: drop-shadow(0 20px 36px rgba(0, 0, 0, 0.55)) brightness(1.02);
  }
}

@keyframes clue-answer-dock {
  0% {
    opacity: 0;
    transform: translateY(36px) scale(0.9);
  }
  70% {
    transform: translateY(-4px) scale(1.03);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.layout-clue_deduction {
  --choice-card-min-height: 84px;
  --choice-card-height: auto;
  --choice-card-margin-left: 0px;
  --choice-card-padding: 16px 36px;
  --choice-badge-size: 0px;
  --choice-badge-margin-left: 0px;
  --choice-badge-font-size: 0px;
  --choice-font-size-base: 50px;
  --choice-font-size-medium: 44px;
  --choice-font-size-long: 36px;
  --choice-font-size-very_long: 30px;
  --choice-font-size-overflow: 28px;
  --choice-fit-min: 24px;
  --choice-fit-max: 68px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
  --choice-fit-multiline-gain: 6px;
}

.has-mascot.layout-clue_deduction .clue-deduction-stage-wrapper {
  max-width: 1100px;
}

${
  aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .layout-clue_deduction .game-stage {
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "title" "stage";
  row-gap: 20px;
  width: 100%;
}
#stage[data-aspect-ratio="9:16"] .layout-clue_deduction .clue-deduction-stage-wrapper {
  width: 100%;
  max-width: 980px;
  height: 1100px;
  border-radius: 36px;
}
#stage[data-aspect-ratio="9:16"] .layout-clue_deduction .clue-deduction-stage-wrapper > .answer-grid {
  bottom: 32px;
  width: calc(100% - 40px);
  max-width: 760px;
}
#stage[data-aspect-ratio="9:16"] .layout-clue_deduction .choice-card {
  padding: 16px 28px;
  min-height: 80px;
  border-radius: 20px;
}
#stage[data-aspect-ratio="9:16"] .layout-clue_deduction .choice-text {
  font-size: var(--choice-fitted-font-size, var(--choice-font-size-base, 46px));
}
`
    : ""
}`,
} satisfies QuizLayoutRenderDefinition;
