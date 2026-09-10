import type { QuizLayoutRenderDefinition } from "./types.js";

/**
 * Verdict True or False Layout (16:9 Landscape Video, 1920×1080).
 *
 * Dedicated widescreen layout for dramatic binary verdict statements (True / False, Fact vs Myth).
 * Standardized directly to the canonical 1420px Mascot-Ready grid.
 * Key architectural features:
 * 1. 3-Row Native CSS Grid: "title title" / "hero answers" / "phase phase" eliminating Phase 5 Fact Card overlap.
 * 2. Hero Evidence Viewport: 1.08fr : 0.92fr ratio with 520px height minimizing cropping.
 * 3. 2 Oversized 3D Arcade Push Buttons:
 *    - TRUE: Emerald Green gradient (#10B981 -> #059669) with 14px 3D lip (#047857) and checkmark (✓).
 *    - FALSE: Coral/Rose Red gradient (#F43F5E -> #E11D48) with 14px 3D lip (#9F1239) and cross (✕).
 * 4. Star Marker Canvas Guard: Constrains Thinking Bar to 1260px width, guaranteeing clearance from right canvas edge.
 * 5. Synchronized Multi-Phase Timeline:
 *    - Phase 2: Staggered entrance animations tied to var(--choices-at) preventing static popping.
 *    - Phase 4: High-specificity verdict pop keyframes delivering dramatic winning bloom vs losing settle.
 *    - Phase 5: Smooth fact card entrance with zero occlusion of hero visual or verdict buttons.
 * 6. Inviolable Anchors: 100% preservation of counter badge and brand mark coordinates.
 * 7. Mascot Coexistence: Unified 1420px grid natively accommodating mascot coexistence without override bloat.
 */
export const verdictTrueFalseLayout = {
  id: "verdict_true_false",
  renderBody: (slots) => `${slots.questionBoxHtml}${slots.heroHtml}${slots.choicesHtml}<div class="phase-region">${slots.phaseHtml}</div>`,
  css: (_aspectRatio) => `
/* === Verdict True/False Layout (16:9 Landscape Video, 1920x1080) === */
.layout-verdict_true_false .game-stage {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(460px, 0.92fr);
  grid-template-areas:
    "title title"
    "hero answers"
    "phase phase";
  align-items: start;
  column-gap: 36px;
  row-gap: 22px;
  width: 1420px;
  max-width: 1420px;
  min-height: 0;
  margin: 20px 40px 0 auto;
}

/* Question Statement Card */
.layout-verdict_true_false .question-title {
  grid-area: title;
  width: 100%;
  max-width: 1380px;
  height: 168px;
  min-height: 168px;
  justify-self: center;
  margin: 0 auto;
}

/* Hero Evidence Viewport: 852px x 520px (ratio 1.64:1) */
.layout-verdict_true_false .game-stage > .hero-image {
  grid-area: hero;
  width: 100%;
  height: 520px;
  max-height: 520px;
  margin-top: 0;
  border-radius: 38px;
  border: 10px solid #FFFFFF;
  box-shadow:
    0 16px 0 rgba(13, 35, 71, 0.22),
    0 24px 44px rgba(10, 25, 60, 0.24),
    0 0 32px rgba(255, 215, 0, 0.24),
    inset 0 4px 8px rgba(255, 255, 255, 0.5);
  overflow: hidden;
  box-sizing: border-box;
}
.layout-verdict_true_false .hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 26px;
}
.layout-verdict_true_false.quiz-question-clip .hero-image {
  animation: enter-from-left 0.66s cubic-bezier(0.22, 0.8, 0.3, 1) var(--clip-start) both;
}

/* Verdict Choices Grid: 2 Oversized Physical Arcade Buttons Centered Vertically */
.layout-verdict_true_false .answer-grid {
  grid-area: answers;
  grid-template-columns: 1fr;
  width: 100%;
  height: 520px;
  margin-top: 0;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 36px;
}

.layout-verdict_true_false {
  --choice-card-min-height: 140px;
  --choice-card-height: 140px;
  --choice-card-margin-left: 80px;
  --choice-card-padding: 16px 42px 16px 48px;
  --choice-badge-size: 148px;
  --choice-badge-margin-left: -80px;
  --choice-badge-font-size: 80px;
  --choice-font-size-base: 46px;
  --choice-font-size-medium: 38px;
  --choice-font-size-long: 30px;
  --choice-font-size-very_long: 24px;
  --choice-font-size-overflow: 22px;
  --choice-fit-min: 24px;
  --choice-fit-max: 68px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
  --choice-fit-multiline-gain: 6px;
}

/* Oversized Pill Button Capsule Geometry */
.layout-verdict_true_false .choice-card,
.layout-verdict_true_false .choice-card-text,
.layout-verdict_true_false .answer-card {
  width: 100%;
  border-radius: 9999px;
  box-sizing: border-box;
  transition: transform 0.2s cubic-bezier(0.22, 0.8, 0.3, 1), opacity 0.2s ease-out;
}

/* TRUE Button: Emerald Green Styling with 14px 3D Base Lip & Checkmark */
.layout-verdict_true_false .choice-card:nth-child(1) .choice-card-surface,
.layout-verdict_true_false .choice-card:nth-child(1).answer-card,
.layout-verdict_true_false .choice-card:first-child .choice-card-surface,
.layout-verdict_true_false .choice-card:first-child.answer-card,
.layout-verdict_true_false .choice-card[data-choice-order="0"] .choice-card-surface,
.layout-verdict_true_false .choice-card[data-choice-order="0"].answer-card,
.layout-verdict_true_false .choice-true {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  border: 6px solid #FFFFFF;
  border-radius: 9999px;
  box-shadow:
    0 14px 0 #047857,
    0 22px 38px rgba(5, 150, 105, 0.40),
    0 0 28px rgba(16, 185, 129, 0.45),
    inset 0 4px 8px rgba(255, 255, 255, 0.65);
  color: #FFFFFF;
}

.layout-verdict_true_false .choice-card:nth-child(1) .choice-label,
.layout-verdict_true_false .choice-card:first-child .choice-label {
  background: linear-gradient(135deg, #34D399 0%, #059669 100%);
  border: 5px solid #FFFFFF;
  border-radius: 50%;
  box-shadow:
    0 6px 0 rgba(4, 120, 87, 0.45),
    0 0 16px rgba(16, 185, 129, 0.5),
    inset 0 2px 4px rgba(255, 255, 255, 0.75);
  color: #FFFFFF;
}

.layout-verdict_true_false .choice-card:nth-child(1) .choice-text::after,
.layout-verdict_true_false .choice-card:first-child .choice-text::after,
.layout-verdict_true_false .choice-true .choice-text::after {
  content: " ✓";
  font-weight: 900;
  margin-left: 16px;
  font-size: 1.22em;
  color: #FFFFFF;
  text-shadow: 0 2px 4px rgba(4, 120, 87, 0.6);
}

/* FALSE Button: Coral/Rose Red Styling with 14px 3D Base Lip & Cross */
.layout-verdict_true_false .choice-card:nth-child(2) .choice-card-surface,
.layout-verdict_true_false .choice-card:nth-child(2).answer-card,
.layout-verdict_true_false .choice-card:last-child .choice-card-surface,
.layout-verdict_true_false .choice-card:last-child.answer-card,
.layout-verdict_true_false .choice-card[data-choice-order="1"] .choice-card-surface,
.layout-verdict_true_false .choice-card[data-choice-order="1"].answer-card,
.layout-verdict_true_false .choice-false {
  background: linear-gradient(135deg, #F43F5E 0%, #E11D48 100%);
  border: 6px solid #FFFFFF;
  border-radius: 9999px;
  box-shadow:
    0 14px 0 #9F1239,
    0 22px 38px rgba(225, 29, 72, 0.40),
    0 0 28px rgba(244, 63, 94, 0.45),
    inset 0 4px 8px rgba(255, 255, 255, 0.65);
  color: #FFFFFF;
}

.layout-verdict_true_false .choice-card:nth-child(2) .choice-label,
.layout-verdict_true_false .choice-card:last-child .choice-label {
  background: linear-gradient(135deg, #FB7185 0%, #E11D48 100%);
  border: 5px solid #FFFFFF;
  border-radius: 50%;
  box-shadow:
    0 6px 0 rgba(159, 18, 57, 0.45),
    0 0 16px rgba(244, 63, 94, 0.5),
    inset 0 2px 4px rgba(255, 255, 255, 0.75);
  color: #FFFFFF;
}

.layout-verdict_true_false .choice-card:nth-child(2) .choice-text::after,
.layout-verdict_true_false .choice-card:last-child .choice-text::after,
.layout-verdict_true_false .choice-false .choice-text::after {
  content: " ✕";
  font-weight: 900;
  margin-left: 16px;
  font-size: 1.22em;
  color: #FFFFFF;
  text-shadow: 0 2px 4px rgba(159, 18, 57, 0.6);
}

/* Bold White Typography for Verdict Buttons */
.layout-verdict_true_false .choice-card .choice-text,
.layout-verdict_true_false .choice-card .answer-card span {
  font-weight: 900;
  letter-spacing: 0.8px;
  color: #FFFFFF;
  text-shadow: 0 2px 5px rgba(0, 0, 0, 0.35);
}

/* Phase 2: Kinetic Staggered Entrance (Tied to choices-at) */
.layout-verdict_true_false.quiz-question-clip .choice-card:nth-child(1) {
  animation: enter-from-right 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.08s) both;
}
.layout-verdict_true_false.quiz-question-clip .choice-card:nth-child(2) {
  animation: enter-from-right 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.22s) both;
}

/* Phase 4: High-Specificity Verdict Reveal Keyframes */
.layout-verdict_true_false.quiz-question-clip .choice-card.answer-reveal-correct,
.layout-verdict_true_false.quiz-question-clip .choice-card.answer-correct {
  animation: verdict-correct-pop 0.68s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both !important;
  z-index: 6 !important;
}
.layout-verdict_true_false.quiz-question-clip .choice-card.answer-reveal-incorrect,
.layout-verdict_true_false.quiz-question-clip .choice-card.answer-incorrect {
  animation: verdict-incorrect-settle 0.45s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both !important;
  z-index: 2 !important;
}

@keyframes verdict-correct-pop {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-12px) scale(1.06); filter: brightness(1.15); }
  100% {
    transform: translateY(-8px) scale(1.04);
    box-shadow:
      0 16px 0 #047857,
      0 28px 52px rgba(16, 185, 129, 0.65),
      0 0 48px rgba(52, 211, 153, 0.85),
      inset 0 4px 8px rgba(255, 255, 255, 0.9);
  }
}

@keyframes verdict-incorrect-settle {
  0% { transform: scale(1); opacity: 1; filter: grayscale(0%); }
  100% {
    transform: translateY(4px) scale(0.94);
    opacity: 0.32;
    filter: grayscale(85%) contrast(0.9) brightness(0.85);
    box-shadow: 0 4px 0 rgba(13, 35, 71, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
  }
}

/* Phase Region: Strictly Placed in Row 3 of CSS Grid (Zero Overlap with Row 2) */
.layout-verdict_true_false .phase-region {
  grid-area: phase;
  position: relative;
  z-index: 5;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  transform: none;
  width: 100%;
  max-width: 1420px;
  height: 96px;
  margin: 0 auto;
  margin-top: 0;
  box-sizing: border-box;
}

/* Phase 3 Thinking Bar: Constrained to 1260px Width Guarding Star Marker From Canvas Edge */
.layout-verdict_true_false .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(1260px, 100%);
  min-height: 84px;
}

/* Phase 5 Fact Card: Constrained to 1220px Width, Zero Overlap With Hero/Choices */
.layout-verdict_true_false .phase-region > .fact-card {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(1220px, 100%);
  margin-top: 0;
  padding: 18px 44px;
  border-radius: 36px;
  box-sizing: border-box;
  animation: verdict-fact-enter 0.45s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reward-at, 0s)) both;
}

@keyframes verdict-fact-enter {
  0% { opacity: 0; transform: translate(-50%, 18px) scale(0.92); }
  100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
}
`,
} satisfies QuizLayoutRenderDefinition;
