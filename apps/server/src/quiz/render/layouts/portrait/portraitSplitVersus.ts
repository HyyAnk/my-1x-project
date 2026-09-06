import type { QuizLayoutRenderDefinition } from "../types.js";

/**
 * Portrait Split Versus Layout (9:16 Vertical Video).
 *
 * Tailored specifically for 1080×1920 mobile portrait video (TikTok, YouTube Shorts, Instagram Reels).
 * Architectural highlights:
 * 1. Safe-Zone Guarantee: Content column width 860px (x: 56px -> 916px) guaranteeing >= 164px
 *    clearance from the right canvas edge (protecting from TikTok Like/Comment/Share action rail).
 * 2. Inviolable Anchor Clearance: Stage margin-top: 184px strictly clears the top counter badge.
 * 3. Elevated Stage Floor: Stage ends at y <= 1260px, guaranteeing > 220px clean buffer above
 *    the mandatory 440px bottom overlay zone (total clean bottom margin > 660px).
 * 4. Harmonized Center Axis: Question card, Card A, VS Badge, Card B, and Phase Region all share
 *    the identical horizontal center axis (x = 486px).
 * 5. Multi-Phase Stagger Fix: Choice entrance animations properly incorporate var(--choices-at).
 * 6. Dual-Rival Candy Styling: Card A (Strawberry Coral) vs Card B (Electric Azure) with glowing VS badge.
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
  max-width: 860px;
  min-height: 0;
  margin: 184px auto 0 56px; /* 56px left margin + 860px width = 916px right edge (164px clear rail margin!) */
  padding: 0;
  box-sizing: border-box;
  row-gap: 18px;
}

/* Question Box: Centered within unified column, max-width 860px */
.layout-portrait_split_versus .question-title {
  grid-area: title;
  width: 100%;
  max-width: 860px;
  min-height: 140px;
  max-height: 165px;
  height: auto;
  margin: 0 auto;
  text-align: center;
  justify-self: center;
}
.layout-portrait_split_versus .question-card-inner {
  padding: 18px 32px;
  border-radius: 36px;
  box-sizing: border-box;
}

/* Versus Comparison Stage: 2 vertically stacked cards */
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
  padding: 0; /* Unified stage provides the safe zone margin */
  gap: 64px; /* 64px gap allows 96px VS badge to sit with clean 16px border overlap */
  position: relative;
}

/* Tokens for Versus Cards */
.layout-portrait_split_versus {
  --choice-card-min-height: 350px;
  --choice-card-height: 358px;
  --choice-media-height: 260px;
  --choice-card-margin-left: 0;
  --choice-badge-size: 110px;
  --choice-badge-margin-left: -32px;
  --choice-badge-font-size: 62px;
  --choice-font-size-base: 36px;
  --choice-font-size-medium: 30px;
  --choice-font-size-long: 24px;
  --choice-font-size-very_long: 20px;
  --choice-font-size-overflow: 18px;
  --choice-fit-min: 20px;
  --choice-fit-max: 54px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.1;
}

/* Compact Text-Only Presentation Support */
.layout-portrait_split_versus .choice-group-text .choice-card,
.layout-portrait_split_versus .choice-group-text .choice-card-text,
.layout-portrait_split_versus .choice-group-text .answer-card {
  min-height: 220px;
  height: 220px;
  padding: 24px 36px;
}

.has-mascot.layout-portrait_split_versus {
  --choice-font-size-base: 32px;
  --choice-font-size-medium: 26px;
  --choice-font-size-long: 22px;
}

/* Common Card Base Styling */
.layout-portrait_split_versus .choice-card,
.layout-portrait_split_versus .choice-card-text,
.layout-portrait_split_versus .answer-card,
.layout-portrait_split_versus .choice-card-visual,
.layout-portrait_split_versus .visual-answer-card {
  border-radius: 34px;
  box-sizing: border-box;
  position: relative;
}

/* Visual Choice Cards */
.layout-portrait_split_versus .choice-card-visual,
.layout-portrait_split_versus .visual-answer-card {
  min-height: 350px;
  height: 358px;
  border-radius: 34px;
  border: 7px solid #FFFFFF;
  box-shadow:
    0 14px 0 rgba(13, 35, 71, 0.24),
    0 22px 42px rgba(10, 25, 60, 0.28),
    inset 0 4px 6px rgba(255, 255, 255, 0.6);
  overflow: hidden;
}

.layout-portrait_split_versus .choice-media,
.layout-portrait_split_versus .option-image {
  height: 260px;
  border-radius: 26px 26px 0 0;
}

.layout-portrait_split_versus .visual-answer-label {
  border-radius: 0 0 26px 26px;
  min-height: 98px;
  padding: 12px 28px;
}

/* Text Choice Cards */
.layout-portrait_split_versus .choice-card-text,
.layout-portrait_split_versus .answer-card {
  border-radius: 34px;
  border: 7px solid #FFFFFF;
  box-shadow:
    0 14px 0 rgba(13, 35, 71, 0.24),
    0 22px 42px rgba(10, 25, 60, 0.28),
    inset 0 4px 6px rgba(255, 255, 255, 0.6);
  padding: 24px 36px;
}

/* Player 1 vs Player 2 Duel Rivalry Accents */
.layout-portrait_split_versus .choice-card:nth-child(1) {
  box-shadow:
    0 14px 0 rgba(13, 35, 71, 0.24),
    0 20px 40px rgba(255, 30, 86, 0.25),
    0 0 24px rgba(255, 30, 86, 0.3),
    inset 0 4px 6px rgba(255, 255, 255, 0.6);
}
.layout-portrait_split_versus .choice-card:nth-child(2) {
  box-shadow:
    0 14px 0 rgba(13, 35, 71, 0.24),
    0 20px 40px rgba(0, 210, 255, 0.25),
    0 0 24px rgba(0, 210, 255, 0.3),
    inset 0 4px 6px rgba(255, 255, 255, 0.6);
}

/* === Multi-Phase Card Entrance Stagger (BUG-PSV-01 FIX) === */
.layout-portrait_split_versus.quiz-question-clip .choice-card:nth-child(1) {
  animation: enter-from-left 0.54s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.08s) both;
  will-change: transform, opacity;
}
.layout-portrait_split_versus.quiz-question-clip .choice-card:nth-child(2) {
  animation: enter-from-right 0.54s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.22s) both;
  will-change: transform, opacity;
}

/* High-Impact Glowing "VS" Badge Divider */
.layout-portrait_split_versus .answer-grid::after,
.layout-portrait_split_versus .visual-answer-grid::after {
  content: "VS";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 96px;
  height: 96px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display, "Titan One", "Fredoka", cursive, sans-serif);
  font-size: 42px;
  font-weight: 900;
  color: #FFFFFF;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #FF1361 0%, #FFB703 50%, #00F2FE 100%);
  border: 6px solid #FFFFFF;
  box-shadow:
    0 10px 0 rgba(13, 35, 71, 0.35),
    0 0 28px rgba(255, 19, 97, 0.85),
    0 0 54px rgba(255, 183, 3, 0.7),
    inset 0 4px 8px rgba(255, 255, 255, 0.9);
  text-shadow:
    0 3px 0 #9E0038,
    0 0 14px rgba(255, 255, 255, 0.9);
  z-index: 10;
  pointer-events: none;
  animation:
    vs-slam-pop 0.52s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.32s) both,
    vs-badge-pulse 2.0s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.84s) infinite alternate;
}

@keyframes vs-slam-pop {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.2) rotate(-24deg);
  }
  70% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.22) rotate(6deg);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }
}

@keyframes vs-badge-pulse {
  0% {
    transform: translate(-50%, -50%) scale(1) rotate(-3deg);
    box-shadow:
      0 10px 0 rgba(13, 35, 71, 0.35),
      0 0 24px rgba(255, 19, 97, 0.75),
      0 0 42px rgba(255, 183, 3, 0.6),
      inset 0 4px 8px rgba(255, 255, 255, 0.85);
  }
  100% {
    transform: translate(-50%, -50%) scale(1.1) rotate(3deg);
    box-shadow:
      0 12px 0 rgba(13, 35, 71, 0.4),
      0 0 36px rgba(255, 19, 97, 0.95),
      0 0 64px rgba(255, 183, 3, 0.85),
      inset 0 5px 10px rgba(255, 255, 255, 0.98);
  }
}

/* === Phase 4: Answer Reveal Battle Climax === */
.quiz-question-clip[data-reveal-at] .choice-card.answer-reveal-correct,
.quiz-question-clip[data-reveal-at] .choice-card.answer-correct {
  border-color: #FFD700 !important;
  box-shadow:
    0 16px 0 rgba(13, 35, 71, 0.28),
    0 0 46px rgba(255, 215, 0, 0.9),
    0 0 80px rgba(255, 183, 3, 0.6),
    inset 0 4px 8px rgba(255, 255, 255, 0.9) !important;
  transform: scale(1.025);
  z-index: 5;
}

.quiz-question-clip[data-reveal-at] .choice-card.answer-reveal-incorrect,
.quiz-question-clip[data-reveal-at] .choice-card.answer-incorrect {
  opacity: 0.55 !important;
  filter: saturate(0.55) brightness(0.92);
  transform: scale(0.975);
}

/* Embedded Phase Region: Aligned directly below Card B */
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
  height: 94px;
  margin: 14px auto 0;
  padding: 0;
  box-sizing: border-box;
}

.layout-portrait_split_versus .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(760px, 100%);
  min-height: 80px;
}

.layout-portrait_split_versus .phase-region > .fact-card {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(840px, 100%);
  margin-top: 0;
  padding: 16px 32px;
}

.layout-portrait_split_versus .fact-card p {
  font-size: 30px;
  line-height: 1.25;
}

/* Mascot Safe Coexistence */
.has-mascot.layout-portrait_split_versus .phase-region > .fact-card {
  width: min(740px, 100%);
}

/* 9:16 Canvas Root Enforcements */
#stage[data-aspect-ratio="9:16"] .layout-portrait_split_versus .game-stage {
  width: 100%;
  max-width: 860px;
  margin: 184px auto 0 56px;
  padding: 0;
  row-gap: 18px;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_split_versus .question-title {
  max-width: 860px;
  margin: 0 auto;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_split_versus .answer-grid,
#stage[data-aspect-ratio="9:16"] .layout-portrait_split_versus .visual-answer-grid {
  max-width: 860px;
  padding: 0;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_split_versus .phase-region {
  max-width: 860px;
  padding: 0;
}
`,
} satisfies QuizLayoutRenderDefinition;
