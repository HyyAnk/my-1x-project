import type { QuizLayoutRenderDefinition } from "../types.js";

/**
 * Portrait Hero Choices Layout (9:16 Vertical Video).
 *
 * Tailored specifically for 1080×1920 mobile portrait video (TikTok, YouTube Shorts, Instagram Reels).
 * Architectural requirements:
 * 1. Question Box: Centered at top, max-width ~880px.
 * 2. Hero Image: Prominent 860×500px (16:9 / 4:3), rounded-3xl border with glowing candy arcade styling.
 * 3. Choice Group: 2 or 3 vertical text pills with >= 140px right safe-zone clearance so options
 *    never clash with the TikTok/Reels action rail (Like, Comment, Share, Bookmark).
 * 4. Embedded Phase Region: Placed directly below choices in natural document flow (NOT pinned to the screen bottom!).
 * 5. Elevated Thinking Bar / Timer: Placed right under choices at or above y = 1480px,
 *    guaranteeing at least 440px clean buffer from the bottom for TikTok/Reels creator handle, caption, and audio marquee.
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
  max-width: 960px;
  min-height: 0;
  margin: 140px auto 0;
  padding: 0 24px;
  box-sizing: border-box;
  row-gap: 20px;
}

/* Question Box: Centered, max-width ~880px */
.layout-portrait_hero_choices .question-title {
  grid-area: title;
  width: 100%;
  max-width: 880px;
  min-height: 140px;
  height: auto;
  margin: 0 auto;
  text-align: center;
  justify-self: center;
}
.layout-portrait_hero_choices .question-card-inner {
  padding: 20px 32px;
  border-radius: 36px;
  box-sizing: border-box;
}

/* Hero Image: Prominent 860px width × 500px height (16:9 / 4:3), rounded-3xl border with glowing candy arcade styling */
.layout-portrait_hero_choices .game-stage > .hero-image {
  grid-area: hero;
  width: 860px;
  height: 500px;
  max-width: 860px;
  max-height: 500px;
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
.layout-portrait_hero_choices .hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 22px;
}
.layout-portrait_hero_choices.quiz-question-clip .hero-image {
  animation: enter-from-left 0.62s cubic-bezier(0.22, 0.8, 0.3, 1) var(--clip-start) both,
    hero-float var(--scene-duration) ease-in-out calc(var(--clip-start) + 0.62s) 1 alternate both;
  will-change: transform;
}

/* Choice Group: 2 or 3 text pills with >= 140px right safe-zone clearance for TikTok/Reels right action rail */
.layout-portrait_hero_choices .answer-grid {
  grid-area: answers;
  grid-template-columns: 1fr;
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding-right: 140px; /* Safe-zone clearance >= 140px for TikTok/Reels action rail */
  gap: 16px;
}
.layout-portrait_hero_choices .answer-grid.answer-count-2 {
  gap: 20px;
}
.layout-portrait_hero_choices .answer-grid.answer-count-3 {
  gap: 14px;
}

.layout-portrait_hero_choices {
  --choice-card-min-height: 96px;
  --choice-card-height: auto;
  --choice-card-margin-left: 64px;
  --choice-card-padding: 12px 28px 12px 32px;
  --choice-badge-size: 110px;
  --choice-badge-margin-left: -64px;
  --choice-badge-font-size: 60px;
  --choice-font-size-base: 38px;
  --choice-font-size-medium: 32px;
  --choice-font-size-long: 26px;
  --choice-font-size-very_long: 22px;
  --choice-font-size-overflow: 20px;
  --choice-fit-min: 20px;
  --choice-fit-max: 60px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
  --choice-fit-multiline-gain: 4px;
}

.has-mascot.layout-portrait_hero_choices {
  --choice-font-size-base: 34px;
  --choice-font-size-medium: 28px;
  --choice-font-size-long: 22px;
}

/* Embedded Phase Region: Placed directly below choices, NOT pinned to the screen bottom! */
/* Elevated Thinking Bar / Timer at or above y = 1480px, guaranteeing >= 440px clean bottom buffer */
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
  max-width: 860px;
  height: 90px;
  margin: 12px auto 0;
  padding-right: 140px; /* Safe-zone clearance >= 140px aligned with choice pills */
  box-sizing: border-box;
}
.layout-portrait_hero_choices .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(720px, 100%);
  min-height: 72px;
}
.layout-portrait_hero_choices .phase-region > .fact-card {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(860px, 100%);
  margin-top: 0;
  padding: 16px 28px;
}

/* Specificity overrides for 9:16 stage canvas */
#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .game-stage {
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
  margin: 140px auto 0;
  padding-bottom: 0;
  margin-bottom: 440px; /* Bottom safe-zone clearance: guarantees at least 440px clean buffer from the bottom */
  row-gap: 20px;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .question-title {
  width: 100%;
  max-width: 880px;
  min-height: 140px;
  height: auto;
  margin: 0 auto;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .game-stage > .hero-image {
  width: 860px;
  height: 500px;
  max-width: 860px;
  max-height: 500px;
  margin: 0 auto;
  border-radius: 32px;
  border: 10px solid #FFFFFF;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .answer-grid {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding-right: 140px; /* Safe-zone clearance >= 140px for TikTok/Reels right action rail */
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .phase-region {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  transform: none;
  width: 100%;
  max-width: 860px;
  height: 90px;
  margin: 12px auto 0;
  padding-right: 140px; /* Safe-zone clearance >= 140px */
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(720px, 100%);
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .phase-region > .fact-card {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(860px, 100%);
}
`,
} satisfies QuizLayoutRenderDefinition;
