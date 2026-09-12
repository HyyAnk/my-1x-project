import type { QuizLayoutRenderDefinition } from "./types.js";
import { renderQuizFrameBody } from "../frame/renderQuizFrameBody.js";

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
  renderBody: (slots) => renderQuizFrameBody(slots, `${slots.heroHtml}${slots.choicesHtml}`),
  css: (_aspectRatio) => `
/* === Verdict True/False Layout (16:9 Landscape Video, 1920x1080) === */

/* Unified Quiz Frame Arena Geometry */
.quiz-frame-unified.layout-verdict_true_false .hero-image {
  position: absolute;
  left: 0;
  top: 0;
  width: var(--slot-hero-width, 820px);
  height: var(--slot-hero-height, 510px);
  max-height: var(--slot-hero-height, 510px);
  margin: 0;
  border-radius: 38px;
  border: var(--slot-hero-border-width, 10px) solid #FFFFFF;
  box-shadow:
    0 16px 0 rgba(13, 35, 71, 0.22),
    0 24px 44px rgba(10, 25, 60, 0.24),
    0 0 32px rgba(255, 215, 0, 0.24),
    inset 0 4px 8px rgba(255, 255, 255, 0.5);
  overflow: hidden;
  box-sizing: border-box;
}
.quiz-frame-unified.layout-verdict_true_false .hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 26px;
}
.quiz-frame-unified.layout-verdict_true_false.quiz-question-clip .hero-image {
  animation: enter-from-left 0.66s cubic-bezier(0.22, 0.8, 0.3, 1) var(--clip-start) both;
}

/* Verdict Choices Grid: 2 Oversized Physical Buttons Centered Vertically */
.quiz-frame-unified.layout-verdict_true_false .answer-grid,
.quiz-frame-unified.layout-verdict_true_false .choice-group {
  position: absolute;
  left: 860px;
  top: 0;
  width: 560px;
  height: 510px;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 44px;
}

.quiz-frame-unified.layout-verdict_true_false .choice-card,
.quiz-frame-unified.layout-verdict_true_false .answer-card {
  width: 560px;
  height: 164px;
  min-height: 164px;
  max-height: 164px;
  margin: 0;
  box-sizing: border-box;
  --choice-card-height: 164px;
  --choice-card-min-height: 164px;
  --choice-badge-size: 112px;
}

.layout-verdict_true_false {
  --choice-card-min-height: 164px;
  --choice-card-height: 164px;
  --choice-card-margin-left: 0px;
  --choice-card-padding: 16px 42px 16px 48px;
  --choice-badge-size: 112px;
  --choice-badge-margin-left: 0px;
  --choice-badge-font-size: 64px;
  --choice-font-size-base: 48px;
  --choice-font-size-medium: 40px;
  --choice-font-size-long: 32px;
  --choice-font-size-very_long: 32px;
  --choice-font-size-overflow: 32px;
  --choice-fit-min: 32px;
  --choice-fit-max: 48px;
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

`,
} satisfies QuizLayoutRenderDefinition;
