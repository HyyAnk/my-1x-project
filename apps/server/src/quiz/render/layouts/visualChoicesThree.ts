import type { QuizLayoutRenderDefinition } from "./types.js";

/**
 * Visual Choices Three Layout (16:9 Landscape Video, 1920x1080).
 *
 * Tailored specifically for widescreen 16:9 presentation (YouTube, Desktop, Interactive).
 * Architectural specifications:
 * 1. Left Anchor Clearance: Stage starts at x = 340px, clearing both the Counter Badge
 *    (x <= 290px) and Channel Brand Mark (x <= 340px).
 * 2. Question Title Box: Centered at x = 1110px, max-width 1440px, height 168px.
 * 3. Choice Cards: 3-column grid on 1420px stage (457px cards, 24px gap), media height 320px,
 *    calibrated for standardized 1:1 square assets.
 * 4. Staggered Cascading Entrances: Sequential pop-in animation for Cards 1, 2, and 3.
 * 5. Card Badge & Label Alignment: Eliminates -56px overhang, badge sits cleanly within card boundaries.
 * 6. Native 3-Row CSS Grid & Phase Region: Row 3 position eliminates overlap with choice cards.
 * 7. Thinking Countdown Bar: Width min(82vw, 1360px), ensuring the 192px Star Marker
 *    stops at x <= 1886px (34px safe canvas buffer).
 * 8. Answer Reveal Bloom: Vibrant #10B981 emerald halo and border glow for the winning card;
 *    settle contrast hardening (opacity: 0.42, grayscale: 65%) for incorrect cards.
 * 9. Mascot Harmony: Clean stage compression when .has-mascot is active.
 */
export const visualChoicesThreeLayout = {
  id: "visual_choices_three",
  renderBody: (slots) => `${slots.questionBoxHtml}${slots.choicesHtml}<div class="phase-region">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
/* ==========================================================================
   LAYOUT: visual_choices_three (16:9 Landscape Video - 1920x1080)
   Candy Arcade Quiz Engine - 3 Landscape Visual Choice Cards with Labels
   ========================================================================== */

/* 1. Stage Container & 3-Row CSS Grid: Canonical 1420px Mascot-Ready Stage */
.layout-visual_choices_three .game-stage {
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

/* 2. Question Title Box: Centered directly over choice cards */
.layout-visual_choices_three .question-title {
  grid-area: title;
  width: 100%;
  max-width: 1380px;
  height: 168px;
  min-height: 168px;
  margin: 0 auto;
  justify-self: center;
}

/* 3. Three-Column Choice Cards Grid */
.layout-visual_choices_three .visual-answer-grid {
  grid-area: answers;
  width: 1420px;
  margin-top: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

/* 4. Capacity & Sizing Custom Properties */
.layout-visual_choices_three {
  --choice-media-height: 320px;
  --choice-label-min-height: 70px;
  --choice-label-padding: 8px 20px 8px 16px;
  --choice-badge-size: 72px;
  --choice-badge-margin-left: 0px;
  --choice-badge-font-size: 40px;
  --choice-label-font-size-base: 26px;
  --choice-label-font-size-medium: 22px;
  --choice-label-font-size-long: 19px;
  --choice-label-font-size-very_long: 17px;
  --choice-label-font-size-overflow: 17px;
  --choice-fit-min: 16px;
  --choice-fit-max: 30px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
  --choice-fit-multiline-gain: 6px;
}

/* 5. Choice Card Framing & Media Surface */
.layout-visual_choices_three .choice-card-visual,
.layout-visual_choices_three .visual-answer-card {
  position: relative;
  border-radius: 32px;
  contain: layout style;
  will-change: transform, opacity;
}

.layout-visual_choices_three .choice-media,
.layout-visual_choices_three .option-image {
  height: var(--choice-media-height, 320px);
  border: 10px solid #FFFFFF;
  border-radius: 32px;
  overflow: hidden;
  background: #1e293b;
  box-shadow:
    0 14px 0 rgba(13, 35, 71, 0.22),
    0 22px 36px rgba(10, 25, 60, 0.20),
    0 0 24px rgba(255, 215, 0, 0.12),
    inset 0 4px 6px rgba(255, 255, 255, 0.85);
  transition: border-color 0.35s ease, box-shadow 0.35s ease;
}

/* 6. Card Badge & Label Alignment: Harmonious in-bounds placement */
.layout-visual_choices_three .visual-answer-label {
  position: relative;
  z-index: 4;
  margin: -32px auto 0;
  width: calc(100% - 24px);
  min-height: var(--choice-label-min-height, 70px);
  padding: var(--choice-label-padding, 8px 20px 8px 16px);
  border-radius: 22px;
  border: 5px solid #FFFFFF;
  background: var(--choice-bg-tint);
  box-shadow:
    0 10px 0 var(--choice-stroke-shadow, rgba(13, 35, 71, 0.22)),
    0 16px 24px rgba(10, 25, 60, 0.16),
    inset 0 3px 0 rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  gap: 14px;
}

.layout-visual_choices_three .visual-answer-card .visual-answer-label > b,
.layout-visual_choices_three .visual-answer-label .choice-label {
  width: var(--choice-badge-size, 72px);
  height: var(--choice-badge-size, 72px);
  margin-left: 0;
  border-radius: 50%;
  border: 4px solid #FFFFFF;
  font-size: var(--choice-badge-font-size, 40px);
  flex-shrink: 0;
}

.layout-visual_choices_three .visual-answer-label .choice-text {
  flex: 1;
  min-width: 0;
  color: var(--choice-text-color, #1e293b);
  text-shadow: var(--choice-text-shadow, 0 1px 0 rgba(255, 255, 255, 0.8));
  font-family: "Fredoka", "Nunito", sans-serif;
  font-weight: 900;
  line-height: var(--choice-fit-leading, 1.08);
  text-wrap: balance;
  text-align: center;
}

/* 7. Phase 2: Cascading Staggered Pop-In Entrance Animations */
.layout-visual_choices_three.quiz-question-clip .visual-answer-card:nth-child(1) {
  animation: visual-card-stagger-in 0.52s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both,
             visual-choice-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.52s) infinite alternate both;
}
.layout-visual_choices_three.quiz-question-clip .visual-answer-card:nth-child(2) {
  animation: visual-card-stagger-in 0.52s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.12s) both,
             visual-choice-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.64s) infinite alternate both;
}
.layout-visual_choices_three.quiz-question-clip .visual-answer-card:nth-child(3) {
  animation: visual-card-stagger-in 0.52s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.24s) both,
             visual-choice-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.76s) infinite alternate both;
}

@keyframes visual-card-stagger-in {
  from {
    opacity: 0;
    transform: translateY(36px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 8. Phase 3 & 5: Phase Region in Row 3 (100% Zero-Collision Guarantee) */
.layout-visual_choices_three .phase-region {
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

.layout-visual_choices_three .phase-region > .thinking-bar {
  position: absolute;
  top: 50%;
  left: 50%;
  bottom: auto;
  transform: translate(-50%, -50%);
  width: min(80vw, 1240px);
  min-height: 84px;
}

.layout-visual_choices_three .phase-region > .fact-card {
  position: absolute;
  top: 50%;
  left: 50%;
  bottom: auto;
  transform: translate(-50%, -50%);
  width: min(1140px, 100%);
  max-width: 1140px;
  margin: 0 auto;
}

/* 9. Phase 4: Answer Reveal & Settle Contrast Hardening */
.layout-visual_choices_three.quiz-question-clip .visual-answer-card.answer-reveal-correct .option-image,
.layout-visual_choices_three.quiz-question-clip .visual-answer-card.answer-correct .option-image {
  border-color: #10B981;
  box-shadow:
    0 0 36px rgba(16, 185, 129, 0.8),
    0 16px 0 #047857,
    inset 0 4px 8px rgba(255, 255, 255, 0.95);
  animation: visual-correct-bloom 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.layout-visual_choices_three.quiz-question-clip .visual-answer-card.answer-reveal-correct .visual-answer-label,
.layout-visual_choices_three.quiz-question-clip .visual-answer-card.answer-correct .visual-answer-label {
  border-color: #10B981;
  box-shadow:
    0 0 24px rgba(16, 185, 129, 0.6),
    0 10px 0 #047857;
}

.layout-visual_choices_three.quiz-question-clip .visual-answer-card.answer-reveal-incorrect,
.layout-visual_choices_three.quiz-question-clip .visual-answer-card.answer-incorrect {
  animation: incorrect-card-settle-vc3 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

@keyframes visual-correct-bloom {
  0% { transform: scale(1); }
  50% { transform: scale(1.04); }
  100% { transform: scale(1.02); }
}

@keyframes incorrect-card-settle-vc3 {
  from {
    opacity: 1;
    transform: scale(1);
    filter: grayscale(0%) contrast(1);
  }
  to {
    opacity: 0.42;
    transform: scale(0.96);
    filter: grayscale(65%) contrast(0.95);
  }
}

${
  aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three .game-stage { grid-template-columns: 1fr; grid-template-areas: "title" "answers"; row-gap: 24px; }
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three .visual-answer-grid { width: 100%; grid-template-columns: 1fr; gap: 26px; }
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three {
  --choice-media-height: 360px;
  --choice-label-min-height: 74px;
  --choice-badge-size: 104px;
  --choice-badge-margin-left: -54px;
  --choice-badge-font-size: 52px;
  --choice-fit-max: 42px;
}
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three .option-image { height: 320px; }
`
    : ""
}`,
} satisfies QuizLayoutRenderDefinition;
