import type { QuizLayoutRenderDefinition } from "../types.js";

/**
 * Portrait Hero Choices Layout (9:16 Vertical Video).
 *
 * Tailored specifically for 1080x1920 mobile portrait video (TikTok, YouTube Shorts, Instagram Reels).
 * Architectural requirements:
 * 1. Top Safe-Zone: Stage starts at margin-top: 196px, clearing the inviolable Counter Badge (y <= 194px).
 * 2. Question Box: Centered, max-width 800px, 2-line balanced typography clamp.
 * 3. Hero Media: Exact 16:9 ratio (800x450px), rounded-3xl border with glowing candy arcade styling.
 * 4. Choice Group: Symmetrically centered 800px stack with >= 140px safe-zone clearance on BOTH sides.
 *    Staggered entrance animations for choices 1, 2, and 3.
 * 5. Elevated Thinking Bar: Width 660px, ensuring the 192px countdown star marker never exceeds x = 940px.
 * 6. Fact Card: Width 800px (or 680px with mascot), ending at y = 1348px (132px above bottom safe line).
 * 7. Bottom Safe-Zone: Guaranteed >= 440px clean buffer from canvas bottom (y <= 1480px).
 */
export const portraitHeroChoicesLayout = {
  id: "portrait_hero_choices",
  renderBody: (slots) =>
    `${slots.questionBoxHtml}${slots.heroHtml}${slots.choicesHtml}<div class="phase-region portrait-phase-embedded">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
/* === Portrait Hero Choices Layout (9:16 TikTok / Reels / Shorts) === */
.layout-portrait_hero_choices .game-stage {
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
  max-width: 800px;
  min-height: 0;
  margin: 196px auto 0;
  padding: 0;
  box-sizing: border-box;
  row-gap: 16px;
}

/* Question Box: Centered, max-width 800px, clearing counter badge */
.layout-portrait_hero_choices .question-title {
  grid-area: title;
  width: 100%;
  max-width: 800px;
  min-height: 154px;
  max-height: 174px;
  height: auto;
  margin: 0 auto;
  text-align: center;
  justify-self: center;
}
.layout-portrait_hero_choices .question-card-inner {
  padding: 18px 28px;
  border-radius: 32px;
  box-sizing: border-box;
}

/* Hero Image: Exact 16:9 Aspect Ratio (800x450px), candy-arcade white frame */
.layout-portrait_hero_choices .game-stage > .hero-image {
  grid-area: hero;
  width: 800px;
  height: 450px;
  max-width: 800px;
  max-height: 450px;
  margin: 0 auto;
  border-radius: 28px;
  border: 8px solid #FFFFFF;
  box-shadow:
    0 14px 0 rgba(13, 35, 71, 0.22),
    0 22px 40px rgba(10, 25, 60, 0.26),
    0 0 28px rgba(255, 215, 0, 0.24),
    inset 0 4px 6px rgba(255, 255, 255, 0.55);
  overflow: hidden;
  box-sizing: border-box;
}
.layout-portrait_hero_choices .hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 20px;
}
.layout-portrait_hero_choices.quiz-question-clip .hero-image {
  animation: enter-from-left 0.58s cubic-bezier(0.22, 0.8, 0.3, 1) var(--clip-start) both,
    hero-float var(--scene-duration) ease-in-out calc(var(--clip-start) + 0.58s) 1 alternate both;
  will-change: transform;
}

/* Choice Group: Symmetrically centered 800px column (140px safe clearance on both sides) */
.layout-portrait_hero_choices .answer-grid {
  grid-area: answers;
  grid-template-columns: 1fr;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 0;
  gap: 14px;
}
.layout-portrait_hero_choices .answer-grid.answer-count-2 {
  gap: 20px;
}
.layout-portrait_hero_choices .answer-grid.answer-count-3 {
  gap: 14px;
}

/* Staggered Entrance Animations for Choice Cards */
.layout-portrait_hero_choices.quiz-question-clip .choice-card:nth-child(1) {
  animation: choice-card-enter 0.46s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both;
  will-change: transform, opacity;
}
.layout-portrait_hero_choices.quiz-question-clip .choice-card:nth-child(2) {
  animation: choice-card-enter 0.46s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.12s) both;
  will-change: transform, opacity;
}
.layout-portrait_hero_choices.quiz-question-clip .choice-card:nth-child(3) {
  animation: choice-card-enter 0.46s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.24s) both;
  will-change: transform, opacity;
}

@keyframes choice-card-enter {
  0% {
    opacity: 0;
    transform: translateY(28px) scale(0.94);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Design Tokens for Choice Cards */
.layout-portrait_hero_choices {
  --choice-card-min-height: 92px;
  --choice-card-height: auto;
  --choice-card-margin-left: 52px;
  --choice-card-padding: 12px 24px 12px 28px;
  --choice-badge-size: 104px;
  --choice-badge-margin-left: -52px;
  --choice-badge-font-size: 56px;
  --choice-font-size-base: 36px;
  --choice-font-size-medium: 30px;
  --choice-font-size-long: 25px;
  --choice-font-size-very_long: 21px;
  --choice-font-size-overflow: 19px;
  --choice-fit-min: 19px;
  --choice-fit-max: 56px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
  --choice-fit-multiline-gain: 4px;
}

/* 2-Choice Expansion Tokens */
.layout-portrait_hero_choices .answer-grid.answer-count-2 .choice-card-text {
  --choice-card-min-height: 112px;
  --choice-badge-size: 114px;
  --choice-badge-margin-left: -57px;
  --choice-card-margin-left: 57px;
  --choice-font-size-base: 42px;
  --choice-font-size-medium: 34px;
}

/* Mascot Occupancy Adaptation */
.has-mascot.layout-portrait_hero_choices {
  --choice-font-size-base: 34px;
  --choice-font-size-medium: 28px;
  --choice-font-size-long: 22px;
}

/* Embedded Phase Region: Centered directly below choices, above y = 1480px */
.layout-portrait_hero_choices .phase-region {
  grid-area: phase;
  position: relative;
  z-index: 5;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  transform: none;
  width: 100%;
  max-width: 800px;
  height: 88px;
  margin: 12px auto 0;
  padding: 0;
  box-sizing: border-box;
}

/* Thinking Bar: Width 660px ensuring marker star stays <= x: 940px */
.layout-portrait_hero_choices .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(660px, 100%);
  min-height: 68px;
}

/* Fact Card: Width 800px, ends safely above y: 1480px */
.layout-portrait_hero_choices .phase-region > .fact-card {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(800px, 100%);
  max-height: 184px;
  margin-top: 0;
  padding: 16px 24px;
  border-radius: 28px;
  box-sizing: border-box;
}

.layout-portrait_hero_choices .phase-region > .fact-card p {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Mascot Coexistence: Shift Fact Card to clear bottom-left mascot anchor */
.has-mascot.layout-portrait_hero_choices .phase-region > .fact-card {
  max-width: 680px;
  left: auto;
  right: 0;
  transform: none;
}

/* Specificity overrides for 9:16 stage canvas */
#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .game-stage {
  width: 800px;
  max-width: 800px;
  min-height: 0;
  margin: 196px auto 0;
  padding: 0;
  margin-bottom: 0;
  row-gap: 16px;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .question-title {
  width: 100%;
  max-width: 800px;
  min-height: 154px;
  max-height: 174px;
  height: auto;
  margin: 0 auto;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .game-stage > .hero-image {
  width: 800px;
  height: 450px;
  max-width: 800px;
  max-height: 450px;
  margin: 0 auto;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .answer-grid {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 0;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .phase-region {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  transform: none;
  width: 100%;
  max-width: 800px;
  height: 88px;
  margin: 12px auto 0;
  padding: 0;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(660px, 100%);
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .phase-region > .fact-card {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(800px, 100%);
}

#stage[data-aspect-ratio="9:16"] .has-mascot.layout-portrait_hero_choices .phase-region > .fact-card {
  max-width: 680px;
  left: auto;
  right: 0;
  transform: none;
}
`,
} satisfies QuizLayoutRenderDefinition;
