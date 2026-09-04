import type { QuizLayoutRenderDefinition } from "./types.js";

export const mysteryRevealLayout = {
  id: "mystery_reveal",
  renderBody: (slots) =>
    `${slots.questionBoxHtml}<div class="mystery-stage-wrapper" data-layout-allow-overflow>${slots.heroHtml}${slots.choicesHtml}</div><div class="phase-region">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
/* === Mystery Reveal: Giant Focal Hero with Docked Foot Answer Overlay === */
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
  max-width: 1240px;
  height: 650px;
  border-radius: 32px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
  background: rgba(0, 0, 0, 0.22);
}
.layout-mystery_reveal .mystery-stage-wrapper > .hero-image {
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
.layout-mystery_reveal .mystery-stage-wrapper > .hero-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: filter 0.6s ease, transform 0.6s cubic-bezier(0.22, 0.8, 0.3, 1);
}

/* Question & Thinking Phase: Silhouette Shadow Mode */
.layout-mystery_reveal.is-silhouette .hero-image img,
.layout-mystery_reveal[data-choice-phase="choices"] .hero-image img,
.layout-mystery_reveal[data-choice-phase="thinking"] .hero-image img {
  filter: brightness(0) drop-shadow(0 16px 36px rgba(0, 0, 0, 0.75));
}

/* Reveal Phase: Transition A -> B with Radiant Burst */
.layout-mystery_reveal.is-revealed .hero-image img,
.layout-mystery_reveal[data-choice-phase="reveal"] .hero-image img,
.layout-mystery_reveal[data-choice-phase="explain"] .hero-image img {
  animation: silhouette-burst 0.85s cubic-bezier(0.22, 0.8, 0.3, 1) both;
}

/* Reveal Answer Banner Docked Over the Foot of the Image */
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

@keyframes silhouette-burst {
  0% {
    filter: brightness(0);
    transform: scale(0.97);
  }
  45% {
    filter: brightness(2.6) contrast(1.6);
    transform: scale(1.03);
  }
  100% {
    filter: brightness(1);
    transform: scale(1);
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
