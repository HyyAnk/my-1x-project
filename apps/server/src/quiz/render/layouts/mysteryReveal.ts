import type { QuizLayoutRenderDefinition } from "./types.js";

export const mysteryRevealLayout = {
  id: "mystery_reveal",
  renderBody: (slots) =>
    `${slots.questionBoxHtml}<div class="mystery-stage-wrapper" data-layout-allow-overflow><div class="mystery-stage-backdrop"></div><div class="mystery-hero-stage"><div class="mystery-layer mystery-mosaic-layer">${slots.heroHtml}</div><div class="mystery-layer mystery-revealed-layer"><div class="mystery-revealed-inner">${slots.heroHtml}</div></div><div class="mystery-scanner-bar" data-layout-ignore aria-hidden="true"><div class="scanner-beam"></div><div class="scanner-flare"></div></div></div>${slots.choicesHtml}<svg class="mystery-svg-filters" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;" aria-hidden="true"><defs><filter id="mystery-mosaic-filter" x="0%" y="0%" width="100%" height="100%"><feFlood x="2" y="2" height="2" width="2"/><feComposite width="22" height="22"/><feTile result="tile"/><feComposite in="SourceGraphic" in2="tile" operator="in"/><feMorphology operator="dilate" radius="11"/></filter></defs></svg></div><div class="phase-region">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
/* === Mystery Reveal: Studio Stage with Dual-State Mosaic & Scanner Reveal === */
.layout-mystery_reveal {
  --mystery-stage-width: 1240px;
}
.layout-mystery_reveal .game-stage {
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "title" "stage";
  align-items: center;
  justify-items: center;
  row-gap: 24px;
  width: 100%;
}
.layout-mystery_reveal .question-title {
  grid-area: title;
  width: 100%;
  max-width: 1440px;
  text-align: center;
  margin: 0 auto;
}
.layout-mystery_reveal .mystery-stage-wrapper {
  grid-area: stage;
  position: relative;
  width: 100%;
  max-width: var(--mystery-stage-width, 1240px);
  height: 650px;
  border-radius: 32px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
  background: #0f172a;
}

/* Studio Clean White / Soft Pedestal Backdrop */
.layout-mystery_reveal .mystery-stage-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  background: radial-gradient(circle at 50% 42%, #ffffff 0%, #f8fafc 52%, #e2e8f0 100%);
  box-shadow: inset 0 -48px 72px rgba(15, 23, 42, 0.12);
}

/* Dual-State Hero Container */
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
  max-width: 86%;
  max-height: 86%;
  object-fit: contain;
  transition: transform 0.6s cubic-bezier(0.22, 0.8, 0.3, 1);
}

/* State A: Pixelate Mosaic / Silhouette Layer (Visible in Question & Thinking) */
.layout-mystery_reveal .mystery-mosaic-layer {
  z-index: 2;
  opacity: 1;
  transition: opacity 0.4s ease;
}

.layout-mystery_reveal .mystery-mosaic-layer img {
  filter: url(#mystery-mosaic-filter) brightness(0.92) contrast(1.2) saturate(1.15) drop-shadow(0 20px 32px rgba(15, 23, 42, 0.3));
}

/* Fallback if SVG filter is unsupported or purely silhouette style */
.layout-mystery_reveal.is-silhouette .mystery-mosaic-layer img {
  filter: brightness(0) drop-shadow(0 16px 36px rgba(15, 23, 42, 0.45));
}

/* State B: Pristine Revealed Layer (Wiped open from left to right via overflow: hidden) */
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
  filter: drop-shadow(0 24px 44px rgba(15, 23, 42, 0.28));
}

/* Scanner Bar: Glowing Neon Laser Line */
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
  box-shadow: 0 0 16px #38bdf8, 0 0 36px #0284c7, 0 0 60px rgba(56, 189, 248, 0.6);
}

.layout-mystery_reveal .scanner-flare {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 32px;
  height: 220px;
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.95) 0%, rgba(56, 189, 248, 0.65) 45%, transparent 75%);
  filter: blur(4px);
}

/* === Reveal Phase Actions === */
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

/* Reveal Answer Banner Docked Over the Foot of the Stage */
.layout-mystery_reveal .mystery-stage-wrapper > .answer-grid {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 64px);
  max-width: 860px;
  z-index: 10;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* Hide non-correct choices: Mystery Reveal shows ONLY the single true answer */
.layout-mystery_reveal .choice-card:not(.answer-correct):not(:only-child) {
  display: none !important;
}

/* Hide multiple-choice letter badges (A, B, C) */
.layout-mystery_reveal .choice-badge,
.layout-mystery_reveal .choice-label {
  display: none !important;
}

/* Style the single floating answer plate */
.layout-mystery_reveal .choice-card {
  width: 100%;
  min-height: 84px;
  height: auto;
  margin: 0 auto;
  padding: 16px 36px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 41, 59, 0.96) 100%);
  border: 3px solid #fbbf24;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 35px rgba(251, 191, 36, 0.4);
  backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.18, 1.4, 0.3, 1);
}

.layout-mystery_reveal .choice-text {
  font-size: var(--choice-fit-size, 50px);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #ffffff;
  text-shadow: 0 3px 12px rgba(0, 0, 0, 0.9), 0 0 24px rgba(251, 191, 36, 0.6);
  text-align: center;
  width: 100%;
}

/* Hide answer text before reveal in question/thinking phase */
.layout-mystery_reveal[data-choice-phase="choices"] .choice-card,
.layout-mystery_reveal[data-choice-phase="thinking"] .choice-card {
  opacity: 0;
  transform: translateY(28px) scale(0.94);
  pointer-events: none;
}

/* Docked pop-in animation on reveal */
.layout-mystery_reveal[data-choice-phase="reveal"] .choice-card,
.layout-mystery_reveal[data-choice-phase="explain"] .choice-card,
.layout-mystery_reveal.is-revealed .choice-card,
.layout-mystery_reveal .choice-card.answer-correct {
  opacity: 1;
  transform: translateY(0) scale(1);
  animation: mystery-answer-dock 0.65s cubic-bezier(0.18, 1.4, 0.3, 1) both;
}

/* === Scanner and Reveal Animations === */
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
  90% {
    opacity: 0.8;
  }
  100% {
    opacity: 0;
  }
}

@keyframes mystery-answer-dock {
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

.layout-mystery_reveal {
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

.has-mascot.layout-mystery_reveal .mystery-stage-wrapper {
  max-width: 1100px;
}

${
  aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .layout-mystery_reveal .game-stage {
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "title" "stage";
  row-gap: 20px;
  width: 100%;
}
#stage[data-aspect-ratio="9:16"] .layout-mystery_reveal .mystery-stage-wrapper {
  width: 100%;
  max-width: 980px;
  height: 1100px;
  border-radius: 36px;
}
#stage[data-aspect-ratio="9:16"] .layout-mystery_reveal .mystery-stage-wrapper > .answer-grid {
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
  font-size: var(--choice-fit-size, 46px);
}
`
    : ""
}`,
} satisfies QuizLayoutRenderDefinition;
