import type { QuizLayoutRenderDefinition } from "./types.js";

/**
 * Split Versus Two Layout (16:9 Landscape Video, 1920×1080).
 *
 * Tailored specifically for head-to-head 1v1 faceoffs, rivalry comparisons, and versus battles.
 * Architectural highlights:
 * 1. 2-Column Grid Arena: 1560px width with calibrated 64px central collision gap.
 * 2. High-Impact Central "VS" Emblem: 124px 3D candy medallion with comic typography, neon glow,
 *    and dynamic entrance slamming down from above.
 * 3. Multi-Phase Stagger Protection: Card 1 (Challenger) charges from left, Card 2 (Defender) charges from right,
 *    strictly keyed to calc(var(--clip-start, 0s) + var(--choices-at, 0s)).
 * 4. Dual Mode Support:
 *    - Visual Mode: 430px media container with calibrated 124px badge and zero overlap clash.
 *    - Text Mode: Heroic Challenger Cards with vertical flex orientation, centered crest badge,
 *      and colossal 52px typography.
 * 5. Player 1 (Crimson) vs Player 2 (Azure) combat rivalry depth shadows and badge gradients.
 * 6. Phase 4 Battle Climax: Winner receives golden neon coronation aura; loser dims and sinks;
 *    VS badge bursts toward champion.
 * 7. Thinking Bar Containment: Width constrained to min(82vw, 1360px), guaranteeing the 192px star marker
 *    stops at x <= 1866px with 54px safe canvas buffer. Fact card width min(1280px, 100%).
 * 8. Mascot Coexistence: Harmonious 1360px grid width reduction with scaled typography tokens.
 */
export const splitVersusTwoLayout = {
  id: "split_versus_two",
  renderBody: (slots) => `${slots.questionBoxHtml}${slots.choicesHtml}<div class="phase-region">${slots.phaseHtml}</div>`,
  css: (_aspectRatio) => `
/* ==========================================================================
   Split Versus Two Layout (16:9 Landscape Video, 1920×1080)
   ========================================================================== */

.layout-split_versus_two .game-stage {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "title"
    "answers"
    "phase";
  align-items: start;
  justify-items: center;
  row-gap: 32px;
}

.layout-split_versus_two .question-title {
  grid-area: title;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}

/* --- Versus Combat Arena: 2-Column Grid --- */
.layout-split_versus_two .answer-grid,
.layout-split_versus_two .visual-answer-grid {
  grid-area: answers;
  position: relative;
  width: 100%;
  max-width: 1560px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  box-sizing: border-box;
  align-items: stretch;
}

/* Layout Dimensional Tokens */
.layout-split_versus_two {
  --choice-card-min-height: 510px;
  --choice-card-height: 510px;
  --choice-card-margin-left: 0;
  --choice-media-height: 430px;
  --choice-badge-size: 124px;
  --choice-badge-margin-left: -62px;
  --choice-badge-font-size: 66px;
  --choice-font-size-base: 44px;
  --choice-font-size-medium: 36px;
  --choice-font-size-long: 28px;
  --choice-font-size-very_long: 22px;
  --choice-font-size-overflow: 20px;
  --choice-fit-min: 22px;
  --choice-fit-max: 60px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.1;
}

/* --- Player 1 (Crimson) vs Player 2 (Azure) Combat Rivalry Accents --- */
.layout-split_versus_two .choice-card:nth-child(1) {
  --choice-depth-shadow: #8B1238;
  --choice-badge-grad: linear-gradient(180deg, #FF3366 0%, #D80036 100%);
  --choice-bg-tint: linear-gradient(180deg, #FF6B93 0%, #FF3366 100%);
}

.layout-split_versus_two .choice-card:nth-child(2) {
  --choice-depth-shadow: #033E6B;
  --choice-badge-grad: linear-gradient(180deg, #1E88E5 0%, #004BA0 100%);
  --choice-bg-tint: linear-gradient(180deg, #42A5F5 0%, #1976D2 100%);
}

/* --- Visual Mode Formatting --- */
.layout-split_versus_two .choice-card-visual,
.layout-split_versus_two .visual-answer-card {
  min-height: 510px;
  border-radius: 42px;
  box-sizing: border-box;
}

.layout-split_versus_two .choice-media,
.layout-split_versus_two .option-image {
  height: 430px;
  border-radius: 38px 38px 0 0;
}

.layout-split_versus_two .visual-answer-label {
  min-height: 88px;
  border-radius: 0 0 38px 38px;
  margin: -32px 18px 0 38px;
  padding: 8px 24px 8px 18px;
}

/* --- Text Mode: Heroic Challenger Cards --- */
.layout-split_versus_two .choice-group-text .choice-card-text,
.layout-split_versus_two .choice-group-text .answer-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: 480px;
  min-height: 480px;
  padding: 36px 48px;
  margin-left: 0;
  border-radius: 42px;
  border: 10px solid #FFFFFF;
  box-shadow:
    0 16px 0 rgba(13, 35, 71, 0.22),
    0 24px 44px rgba(10, 25, 60, 0.2),
    inset 0 4px 6px rgba(255, 255, 255, 0.6);
  box-sizing: border-box;
}

.layout-split_versus_two .choice-group-text .choice-label {
  margin-left: 0;
  margin-bottom: 24px;
  width: 140px;
  height: 140px;
  font-size: 78px;
  border-radius: 50%;
  box-shadow: 0 10px 0 rgba(13, 35, 71, 0.25), 0 0 24px rgba(255, 255, 255, 0.4);
}

.layout-split_versus_two .choice-group-text .choice-text {
  padding-right: 0;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 52px;
  line-height: 1.12;
  text-align: center;
}

/* --- High-Impact Glowing Arcade "VS" Emblem --- */
.layout-split_versus_two .answer-grid::after,
.layout-split_versus_two .visual-answer-grid::after,
.layout-split_versus_two .vs-badge {
  content: "VS";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-4deg);
  width: 124px;
  height: 124px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display, "Titan One", "Fredoka", cursive, sans-serif);
  font-size: 54px;
  font-weight: 900;
  color: #FFFFFF;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #FF1361 0%, #FFA800 50%, #FFDD00 100%);
  border: 6px solid #FFFFFF;
  box-shadow:
    0 10px 0 rgba(13, 35, 71, 0.35),
    0 0 32px rgba(255, 19, 97, 0.8),
    0 0 54px rgba(255, 221, 0, 0.6),
    inset 0 4px 8px rgba(255, 255, 255, 0.85);
  text-shadow:
    0 4px 0 #8B0029,
    0 8px 18px rgba(0, 0, 0, 0.4);
  z-index: 10;
  pointer-events: none;
  box-sizing: border-box;
}

/* --- Phase 2: Challenger Entrance Animations --- */
.layout-split_versus_two.quiz-question-clip .choice-card:nth-child(1) {
  animation: split-versus-enter-left 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both;
}

.layout-split_versus_two.quiz-question-clip .choice-card:nth-child(2) {
  animation: split-versus-enter-right 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.14s) both;
}

.layout-split_versus_two.quiz-question-clip .answer-grid::after,
.layout-split_versus_two.quiz-question-clip .visual-answer-grid::after,
.layout-split_versus_two.quiz-question-clip .vs-badge {
  animation:
    split-versus-badge-slam 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.28s) both,
    split-versus-badge-pulse 2s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.82s) infinite alternate both;
}

@keyframes split-versus-enter-left {
  0% { opacity: 0; transform: translateX(-120px) scale(0.92) rotate(-3deg); }
  70% { transform: translateX(10px) scale(1.02) rotate(0.5deg); }
  100% { opacity: 1; transform: translateX(0) scale(1) rotate(0deg); }
}

@keyframes split-versus-enter-right {
  0% { opacity: 0; transform: translateX(120px) scale(0.92) rotate(3deg); }
  70% { transform: translateX(-10px) scale(1.02) rotate(-0.5deg); }
  100% { opacity: 1; transform: translateX(0) scale(1) rotate(0deg); }
}

@keyframes split-versus-badge-slam {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(2.8) rotate(-22deg); filter: brightness(2.2); }
  65% { transform: translate(-50%, -50%) scale(0.92) rotate(5deg); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(-4deg); filter: brightness(1); }
}

@keyframes split-versus-badge-pulse {
  0% { transform: translate(-50%, -50%) scale(1) rotate(-4deg); }
  100% {
    transform: translate(-50%, -50%) scale(1.1) rotate(3deg);
    box-shadow:
      0 12px 0 rgba(13, 35, 71, 0.4),
      0 0 44px rgba(255, 19, 97, 0.95),
      0 0 72px rgba(255, 221, 0, 0.85),
      inset 0 5px 10px rgba(255, 255, 255, 0.95);
  }
}

/* --- Phase 4: Answer Reveal Duel Climax --- */
.layout-split_versus_two .choice-card.answer-reveal-correct,
.layout-split_versus_two .choice-card.answer-correct {
  animation: split-versus-winner-coronation 0.72s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  z-index: 8;
}

.layout-split_versus_two .choice-card.answer-reveal-incorrect,
.layout-split_versus_two .choice-card.answer-incorrect {
  animation: split-versus-loser-defeat 0.48s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

@keyframes split-versus-winner-coronation {
  0% { transform: scale(1); }
  45% {
    transform: scale(1.06) translateY(-8px);
    box-shadow: 0 0 70px rgba(255, 215, 0, 0.95), 0 24px 48px rgba(0, 0, 0, 0.35);
  }
  100% {
    transform: scale(1.035) translateY(-4px);
    border-color: #FFD700;
    box-shadow: 0 0 50px rgba(255, 215, 0, 0.85), 0 20px 40px rgba(0, 0, 0, 0.3);
  }
}

@keyframes split-versus-loser-defeat {
  0% { opacity: 1; transform: scale(1); filter: grayscale(0%); }
  100% {
    opacity: 0.32;
    transform: scale(0.95) translateY(4px);
    filter: grayscale(82%) brightness(0.85);
    border-color: rgba(255, 255, 255, 0.3);
  }
}

/* VS Badge Victory Flare in Phase 4 */
.layout-split_versus_two.quiz-question-clip .answer-grid:has(.answer-reveal-correct)::after,
.layout-split_versus_two.quiz-question-clip .visual-answer-grid:has(.answer-reveal-correct)::after,
.layout-split_versus_two.quiz-question-clip .answer-grid:has(.answer-correct)::after,
.layout-split_versus_two.quiz-question-clip .visual-answer-grid:has(.answer-correct)::after {
  animation: split-versus-badge-victory 0.6s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

@keyframes split-versus-badge-victory {
  0% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.28) rotate(12deg); filter: brightness(1.6); }
  100% {
    transform: translate(-50%, -50%) scale(1.15) rotate(-2deg);
    background: linear-gradient(135deg, #FFD700 0%, #FF9100 100%);
    box-shadow: 0 0 60px rgba(255, 215, 0, 1), 0 10px 0 #B26A00;
  }
}

/* --- Phase 3 & 5: Embedded Phase Region & Flow --- */
.layout-split_versus_two .phase-region {
  grid-area: phase;
  position: relative;
  z-index: 5;
  left: auto;
  bottom: auto;
  transform: none;
  width: 100%;
  max-width: 1560px;
  height: 90px;
  margin: 0 auto;
}

.layout-split_versus_two .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(82vw, 1360px);
  min-height: 84px;
}

.layout-split_versus_two .phase-region > .fact-card {
  position: absolute;
  top: -12px;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(1280px, 100%);
}

/* --- Mascot Coexistence (Reduced 1360px Arena) --- */
.has-mascot.layout-split_versus_two .answer-grid,
.has-mascot.layout-split_versus_two .visual-answer-grid {
  max-width: 1360px;
  gap: 56px;
}

.has-mascot.layout-split_versus_two .answer-grid::after,
.has-mascot.layout-split_versus_two .visual-answer-grid::after,
.has-mascot.layout-split_versus_two .vs-badge {
  width: 112px;
  height: 112px;
  font-size: 48px;
}

.has-mascot.layout-split_versus_two {
  --choice-media-height: 410px;
  --choice-badge-size: 116px;
  --choice-badge-margin-left: -58px;
  --choice-badge-font-size: 60px;
  --choice-font-size-base: 40px;
  --choice-font-size-medium: 32px;
  --choice-font-size-long: 25px;
}

.has-mascot.layout-split_versus_two .phase-region {
  max-width: 1360px;
}

.has-mascot.layout-split_versus_two .phase-region > .thinking-bar {
  width: min(82vw, 1280px);
}
`,
} satisfies QuizLayoutRenderDefinition;
