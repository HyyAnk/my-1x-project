import type { QuizLayoutRenderDefinition } from "../types.js";

/**
 * Portrait Split Versus Layout (9:16 Vertical Video).
 *
 * Tailored specifically for 1080×1920 mobile portrait video (TikTok, YouTube Shorts, Instagram Reels).
 * Architectural requirements:
 * 1. Question Box: Centered at top, compact height (~140px-180px), max-width ~880px.
 * 2. Versus Comparison Stage: 2 vertically stacked cards (Card A on top, Card B on bottom).
 * 3. High-impact glowing "VS" badge between the two cards with pulsing neon/candy gradient.
 * 4. Each card height: ~340px-360px, rounded-3xl borders, glowing border/shadows.
 * 5. Right safe-zone clearance: >= 140px (padding-right: 140px) preventing clash with
 *    the TikTok/Reels action rail (Like, Comment, Share, Bookmark).
 * 6. Embedded Phase Region: Placed directly below the versus cards in natural document flow (NOT pinned to bottom).
 * 7. Elevated Thinking Bar / Timer: Positioned right under Card B at or above y = 1480px,
 *    guaranteeing at least 440px clean buffer from the canvas bottom for TikTok/Reels captions and audio marquee.
 */
export const portraitSplitVersusLayout = {
  id: "portrait_split_versus",
  renderBody: (slots) =>
    `${slots.questionBoxHtml}${slots.choicesHtml}<div class="phase-region portrait-phase-embedded">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
/* === Portrait Split Versus Layout (9:16 TikTok / Reels / Shorts) === */
.layout-portrait_split_versus .game-stage {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "title"
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

/* Question Box: Centered, compact height (~140px-180px), max-width ~880px */
.layout-portrait_split_versus .question-title {
  grid-area: title;
  width: 100%;
  max-width: 880px;
  min-height: 140px;
  max-height: 180px;
  height: auto;
  margin: 0 auto;
  text-align: center;
  justify-self: center;
}
.layout-portrait_split_versus .question-card-inner {
  padding: 18px 30px;
  border-radius: 36px;
  box-sizing: border-box;
}

/* Versus Comparison Stage: 2 vertically stacked cards (Card A top, Card B bottom) */
.layout-portrait_split_versus .answer-grid,
.layout-portrait_split_versus .visual-answer-grid {
  grid-area: answers;
  display: flex;
  flex-direction: column;
  grid-template-columns: 1fr;
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  box-sizing: border-box;
  padding-right: 140px; /* Safe-zone clearance >= 140px for TikTok/Reels right action rail */
  gap: 40px;
  position: relative;
}

/* Card sizing, rounded-3xl borders, glowing border/shadows (~340px-360px height) */
.layout-portrait_split_versus {
  --choice-card-min-height: 340px;
  --choice-card-height: 350px;
  --choice-media-height: 250px;
  --choice-card-margin-left: 0;
  --choice-badge-size: 110px;
  --choice-badge-margin-left: -40px;
  --choice-badge-font-size: 60px;
  --choice-font-size-base: 36px;
  --choice-font-size-medium: 30px;
  --choice-font-size-long: 24px;
  --choice-font-size-very_long: 20px;
  --choice-font-size-overflow: 18px;
  --choice-fit-min: 20px;
  --choice-fit-max: 56px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
}

.has-mascot.layout-portrait_split_versus {
  --choice-font-size-base: 32px;
  --choice-font-size-medium: 26px;
  --choice-font-size-long: 22px;
}

.layout-portrait_split_versus .choice-card,
.layout-portrait_split_versus .choice-card-text,
.layout-portrait_split_versus .answer-card,
.layout-portrait_split_versus .choice-card-visual,
.layout-portrait_split_versus .visual-answer-card {
  border-radius: 32px; /* rounded-3xl borders */
}

.layout-portrait_split_versus .choice-card-text,
.layout-portrait_split_versus .answer-card {
  min-height: 340px;
  height: 350px;
  border-radius: 32px;
  border: 6px solid #FFFFFF;
  box-shadow:
    0 14px 0 rgba(13, 35, 71, 0.22),
    0 20px 40px rgba(10, 25, 60, 0.25),
    0 0 28px rgba(255, 215, 0, 0.25),
    inset 0 4px 6px rgba(255, 255, 255, 0.6);
  box-sizing: border-box;
  padding: 24px 32px;
}

.layout-portrait_split_versus .choice-card-visual,
.layout-portrait_split_versus .visual-answer-card {
  min-height: 340px;
  height: 350px;
  border-radius: 32px;
  border: 6px solid #FFFFFF;
  box-shadow:
    0 14px 0 rgba(13, 35, 71, 0.22),
    0 20px 40px rgba(10, 25, 60, 0.25),
    0 0 28px rgba(255, 215, 0, 0.25),
    inset 0 4px 6px rgba(255, 255, 255, 0.6);
  box-sizing: border-box;
  overflow: hidden;
}

.layout-portrait_split_versus .choice-media,
.layout-portrait_split_versus .option-image {
  height: 250px;
  border-radius: 26px 26px 0 0;
}

.layout-portrait_split_versus .visual-answer-label {
  border-radius: 0 0 26px 26px;
  min-height: 88px;
}

/* Dynamic entrance animations for versus cards */
.layout-portrait_split_versus.quiz-question-clip .choice-card:nth-child(1) {
  animation: enter-from-left 0.58s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start) + 0.1s) both;
}
.layout-portrait_split_versus.quiz-question-clip .choice-card:nth-child(2) {
  animation: enter-from-right 0.58s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start) + 0.22s) both;
}

/* High-impact glowing "VS" badge between the two cards (styled with pulsing neon/candy gradient) */
.layout-portrait_split_versus .answer-grid::after,
.layout-portrait_split_versus .visual-answer-grid::after,
.layout-portrait_split_versus .vs-badge {
  content: "VS";
  position: absolute;
  top: 50%;
  left: calc(50% - 70px); /* Centered horizontally in the card area accounting for 140px right clearance */
  transform: translate(-50%, -50%);
  width: 92px;
  height: 92px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display, "Titan One", "Fredoka", cursive, sans-serif);
  font-size: 40px;
  font-weight: 900;
  color: #FFFFFF;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #FF1361 0%, #FFF800 100%);
  border: 5px solid #FFFFFF;
  box-shadow:
    0 8px 0 rgba(13, 35, 71, 0.3),
    0 0 24px rgba(255, 19, 97, 0.75),
    0 0 48px rgba(255, 248, 0, 0.6),
    inset 0 3px 6px rgba(255, 255, 255, 0.8);
  text-shadow:
    0 3px 0 #9E0038,
    0 0 12px rgba(255, 255, 255, 0.8);
  z-index: 10;
  pointer-events: none;
  animation: vs-badge-pulse 1.8s ease-in-out infinite alternate;
}

@keyframes vs-badge-pulse {
  0% {
    transform: translate(-50%, -50%) scale(1) rotate(-3deg);
    box-shadow:
      0 8px 0 rgba(13, 35, 71, 0.3),
      0 0 20px rgba(255, 19, 97, 0.7),
      0 0 36px rgba(255, 248, 0, 0.5),
      inset 0 3px 6px rgba(255, 255, 255, 0.8);
  }
  100% {
    transform: translate(-50%, -50%) scale(1.12) rotate(3deg);
    box-shadow:
      0 10px 0 rgba(13, 35, 71, 0.35),
      0 0 32px rgba(255, 19, 97, 0.95),
      0 0 56px rgba(255, 248, 0, 0.8),
      inset 0 4px 8px rgba(255, 255, 255, 0.95);
  }
}

/* Embedded Phase Region: Placed directly below the versus cards, NOT pinned to screen bottom */
/* Elevated Thinking Bar / Timer at or above y = 1480px, guaranteeing >= 440px clean bottom buffer */
.layout-portrait_split_versus .phase-region {
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
  margin: 16px auto 0;
  padding-right: 140px; /* Safe-zone clearance >= 140px aligned with cards */
  box-sizing: border-box;
}
.layout-portrait_split_versus .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(720px, 100%);
  min-height: 72px;
}
.layout-portrait_split_versus .phase-region > .fact-card {
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
#stage[data-aspect-ratio="9:16"] .layout-portrait_split_versus .game-stage {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "title"
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

#stage[data-aspect-ratio="9:16"] .layout-portrait_split_versus .question-title {
  width: 100%;
  max-width: 880px;
  min-height: 140px;
  max-height: 180px;
  height: auto;
  margin: 0 auto;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_split_versus .answer-grid,
#stage[data-aspect-ratio="9:16"] .layout-portrait_split_versus .visual-answer-grid {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding-right: 140px; /* Safe-zone clearance >= 140px for TikTok/Reels right action rail */
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_split_versus .phase-region {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  transform: none;
  width: 100%;
  max-width: 860px;
  height: 90px;
  margin: 16px auto 0;
  padding-right: 140px; /* Safe-zone clearance >= 140px */
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_split_versus .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(720px, 100%);
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_split_versus .phase-region > .fact-card {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(860px, 100%);
}
`,
} satisfies QuizLayoutRenderDefinition;
