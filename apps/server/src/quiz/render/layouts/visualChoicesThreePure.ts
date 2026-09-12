import type { QuizLayoutRenderDefinition } from "./types.js";
import { renderQuizFrameBody } from "../frame/renderQuizFrameBody.js";

/**
 * Visual Choices Three Pure Layout (16:9 Landscape Video, 1920x1080).
 *
 * Designed specifically for pure visual identification quizzes (Odd-One-Out, Spot-the-Difference).
 * Architectural specifications:
 * 1. Restored Letter Badges (BUG-VCP-01): .visual-answer-label is styled as a transparent, corner-pinned
 *    overlay hosting 3D arcade letter tokens (A, B, C) while hiding only .choice-text.
 * 2. Optimized Media Height (BUG-VCP-02): 500px height (~0.91:1 ratio, ~437x480px inner viewport),
 *    perfectly calibrated for standardized 1:1 square assets.
 * 3. Centered Question Title (BUG-VCP-03): max-width 1560px centered directly over the 3 visual cards.
 * 4. Phase 2 Kinetic Stagger Entrance (BUG-VCP-04): Cascading pop-in keyframe animations (+0.00s, +0.12s, +0.24s).
 * 5. Phase 4 Victory Celebration (BUG-VCP-06): Emerald green #10B981 glowing border and halo on the winning
 *    card, with settle contrast hardening (opacity: 0.40, grayscale: 75%) on incorrect cards.
 * 6. Native 3-Row CSS Grid & Phase Region: Positioned in Row 3, guaranteeing zero overlap with choice cards.
 * 7. Clean Architecture: Deprecated invalid 9:16 portrait fallback (layout is 16:9 only).
 */
export const visualChoicesThreePureLayout = {
  id: "visual_choices_three_pure",
  renderBody: (slots) => renderQuizFrameBody(slots, slots.choicesHtml),
  css: (_aspectRatio) => `
/* ==========================================================================
   LAYOUT: visual_choices_three_pure (16:9 Landscape Video - 1920x1080)
   Candy Arcade Quiz Engine - 3 Pure Visual Cards (No Text Labels)
   ========================================================================== */

/* 1. Stage Container & 3-Row CSS Grid */
.candy-scene:not(.quiz-frame-unified).layout-visual_choices_three_pure .game-stage {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "title"
    "answers"
    "phase";
  grid-template-rows: 168px auto 110px;
  align-items: start;
  justify-items: center;
  width: 1420px;
  max-width: 1420px;
  min-height: 945px;
  margin: 12px 40px 0 auto;
  row-gap: 20px;
}

/* 2. Question Title Box: Perfectly centered above the 3 visual cards */
.candy-scene:not(.quiz-frame-unified).layout-visual_choices_three_pure .question-title {
  grid-area: title;
  width: 100%;
  max-width: 1380px;
  height: 168px;
  min-height: 168px;
  margin: 0 auto;
  justify-self: center;
}

/* 3. 3-Column Pure Visual Answer Grid */
.candy-scene:not(.quiz-frame-unified).layout-visual_choices_three_pure .visual-answer-grid {
  grid-area: answers;
  width: 1420px;
  max-width: 1420px;
  margin: 0 auto;
  gap: 24px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

/* --- Unified Arena Geometry --- */
.quiz-frame-unified.layout-visual_choices_three_pure .visual-answer-grid,
.quiz-frame-unified.layout-visual_choices_three_pure .choice-group {
  position: absolute;
  left: 0;
  top: 0;
  width: 1420px;
  height: 504px;
  max-width: 1420px;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 452px);
  gap: 32px;
  box-sizing: border-box;
}

.quiz-frame-unified.layout-visual_choices_three_pure .choice-card-visual,
.quiz-frame-unified.layout-visual_choices_three_pure .visual-answer-card {
  width: var(--slot-card-width, 452px);
  height: var(--slot-card-height, 504px);
  min-height: var(--slot-card-height, 504px);
  max-height: var(--slot-card-height, 504px);
  box-sizing: border-box;
}

.quiz-frame-unified.layout-visual_choices_three_pure .choice-media,
.quiz-frame-unified.layout-visual_choices_three_pure .option-image {
  height: var(--slot-media-height, 504px);
  min-height: var(--slot-media-height, 504px);
  max-height: var(--slot-media-height, 504px);
  box-sizing: border-box;
}

.quiz-frame-unified.layout-visual_choices_three_pure .visual-answer-label {
  display: block;
  position: absolute;
  top: 16px;
  left: 16px;
  width: 88px;
  height: 88px;
  min-height: 0;
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.quiz-frame-unified.layout-visual_choices_three_pure .visual-answer-label .choice-label,
.quiz-frame-unified.layout-visual_choices_three_pure .visual-answer-card .visual-answer-label > b {
  width: 88px;
  height: 88px;
  min-width: 88px;
  font-size: 52px;
  margin: 0;
}

/* 4. Choice Cards & Media Framing (500px height) */
.layout-visual_choices_three_pure .choice-card-visual,
.layout-visual_choices_three_pure .visual-answer-card {
  position: relative;
  border-radius: 36px;
  overflow: visible;
  contain: layout style;
  will-change: transform, opacity;
}

.layout-visual_choices_three_pure .choice-media,
.layout-visual_choices_three_pure .option-image {
  height: var(--slot-media-height, 504px);
  border: var(--slot-border-width, 10px) solid #FFFFFF;
  border-radius: 36px;
  overflow: hidden;
  background: #1e293b;
  box-shadow:
    0 16px 0 rgba(13, 35, 71, 0.22),
    0 24px 38px rgba(10, 25, 60, 0.20),
    0 0 24px rgba(255, 215, 0, 0.12),
    inset 0 3px 0 rgba(255, 255, 255, 0.85);
  transition: transform 0.3s ease, box-shadow 0.35s ease, border-color 0.35s ease;
}

.layout-visual_choices_three_pure .option-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
}

/* 5. Capacity Tokens */
.layout-visual_choices_three_pure {
  --choice-media-height: 500px;
  --choice-badge-size: 82px;
  --choice-badge-font-size: 48px;
}

/* ==========================================================================
   FLOATING LETTER BADGES (A, B, C) - RESTORED VIA CORNER OVERLAY
   ========================================================================== */
.layout-visual_choices_three_pure .visual-answer-label {
  display: block;
  position: absolute;
  top: 14px;
  left: 14px;
  width: 82px;
  height: 82px;
  min-height: 0;
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  pointer-events: none;
  z-index: 6;
}

/* Hide descriptive text cleanly; satisfies font readiness contract */
.layout-visual_choices_three_pure .visual-answer-label .choice-text {
  display: none;
}

/* 3D Circular Floating Badge Styling */
.layout-visual_choices_three_pure .visual-answer-card .visual-answer-label > b,
.layout-visual_choices_three_pure .visual-answer-label .choice-label {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 82px;
  height: 82px;
  border-radius: 50%;
  border: 4.5px solid #FFFFFF;
  margin: 0;
  font-family: var(--font-display, "Fredoka", "SVN-Hello Headline", "Baloo 2", sans-serif);
  font-size: 48px;
  font-weight: 900;
  line-height: 1;
  color: #FFFFFF;
  letter-spacing: -0.5px;
  text-shadow: 0 3px 0 rgba(0, 0, 0, 0.4);
  box-shadow:
    0 8px 0 var(--choice-depth-shadow, rgba(13, 35, 71, 0.3)),
    0 12px 24px rgba(10, 25, 60, 0.35),
    inset 0 3px 0 rgba(255, 255, 255, 0.85);
  background: var(--choice-badge-grad);
}

.layout-visual_choices_three_pure .choice-card:nth-child(1) .choice-label,
.layout-visual_choices_three_pure .visual-answer-card:nth-child(1) .choice-label {
  background: linear-gradient(180deg, #FFB800 0%, #FF6D00 100%);
  --choice-depth-shadow: #9A3412;
}
.layout-visual_choices_three_pure .choice-card:nth-child(2) .choice-label,
.layout-visual_choices_three_pure .visual-answer-card:nth-child(2) .choice-label {
  background: linear-gradient(180deg, #FF4572 0%, #D80036 100%);
  --choice-depth-shadow: #881337;
}
.layout-visual_choices_three_pure .choice-card:nth-child(3) .choice-label,
.layout-visual_choices_three_pure .visual-answer-card:nth-child(3) .choice-label {
  background: linear-gradient(180deg, #2E93FF 0%, #0062E6 100%);
  --choice-depth-shadow: #034E7B;
}

/* ==========================================================================
   PHASE 2: DYNAMIC STAGGERED ENTRANCE ANIMATIONS
   ========================================================================== */
@keyframes visual-pure-card-enter {
  0% {
    opacity: 0;
    transform: translateY(48px) scale(0.86);
  }
  65% {
    opacity: 1;
    transform: translateY(-8px) scale(1.025);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(1) {
  animation: visual-pure-card-enter 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both,
             visual-choice-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.54s) infinite alternate both;
}
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(2) {
  animation: visual-pure-card-enter 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.12s) both,
             visual-choice-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.66s) infinite alternate both;
}
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(3) {
  animation: visual-pure-card-enter 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.24s) both,
             visual-choice-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.78s) infinite alternate both;
}

/* ==========================================================================
   PHASE 3 & 5: PHASE REGION IN ROW 3 (100% ZERO-COLLISION GUARANTEE)
   ========================================================================== */
.candy-scene:not(.quiz-frame-unified).layout-visual_choices_three_pure .phase-region {
  grid-area: phase;
  position: relative;
  top: auto;
  bottom: auto;
  left: auto;
  right: auto;
  transform: none;
  width: 100%;
  max-width: 1360px;
  height: 110px;
  margin: 0 auto;
  padding: 0;
  z-index: 5;
  box-sizing: border-box;
}

.candy-scene:not(.quiz-frame-unified).layout-visual_choices_three_pure .phase-region > .thinking-bar {
  position: absolute;
  top: 50%;
  left: 50%;
  bottom: auto;
  transform: translate(-50%, -50%);
  width: min(80vw, 1240px);
  min-height: 84px;
}

.candy-scene:not(.quiz-frame-unified).layout-visual_choices_three_pure .phase-region > .fact-card {
  position: absolute;
  top: 50%;
  left: 50%;
  bottom: auto;
  transform: translate(-50%, -50%);
  width: min(1140px, 100%);
  max-width: 1140px;
  margin: 0 auto;
}

/* ==========================================================================
   PHASE 4: ANSWER REVEAL & CELEBRATION
   ========================================================================== */
@keyframes visual-pure-correct-celebrate {
  0% {
    transform: translateY(0) scale(1);
    box-shadow: 0 16px 0 rgba(13, 35, 71, 0.22);
    border-color: #FFFFFF;
  }
  50% {
    transform: translateY(-14px) scale(1.04);
    box-shadow:
      0 0 44px rgba(16, 185, 129, 0.9),
      0 0 88px rgba(16, 185, 129, 0.5),
      0 22px 0 #047857;
    border-color: #10B981;
  }
  100% {
    transform: translateY(-6px) scale(1.025);
    box-shadow:
      0 0 36px rgba(16, 185, 129, 0.85),
      0 0 68px rgba(16, 185, 129, 0.4),
      0 20px 0 #047857;
    border-color: #10B981;
  }
}

.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-reveal-correct .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-correct .option-image {
  animation: visual-pure-correct-celebrate 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-reveal-correct .choice-label,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-correct .choice-label {
  animation: correct-badge-reveal 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  border-color: #10B981;
  box-shadow: 0 0 24px rgba(16, 185, 129, 0.9), 0 8px 0 #047857;
}

.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-reveal-incorrect .option-image,
.layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card.answer-incorrect .option-image {
  animation: incorrect-card-settle-vcp 0.42s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

@keyframes incorrect-card-settle-vcp {
  from {
    opacity: 1;
    transform: scale(1);
    filter: grayscale(0%) contrast(1);
  }
  to {
    opacity: 0.40;
    transform: scale(0.96);
    filter: grayscale(75%) contrast(0.95);
  }
}
`,
} satisfies QuizLayoutRenderDefinition;
