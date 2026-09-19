import type { AnswerCardSkin } from "../types.js";

export const steelBeamPlateVariant: AnswerCardSkin = {
  id: "steel_beam_plate",
  displayName: "Steel Beam Plate",
  description: "Heavy industrial steel girder card with riveted metallic corners, diamond tread texture, and bold mechanical bevels.",
  className: "ac-steel-beam-plate",
  cardClassName: ({ order }) => `steel-card-${order}`,
  renderDecorations: () => ({
    beforeLabelHtml:
      '<div class="steel-hazard-trim steel-hazard-tr" aria-hidden="true"></div>' +
      '<div class="steel-hazard-trim steel-hazard-br" aria-hidden="true"></div>' +
      '<div class="steel-tread-texture" aria-hidden="true"></div>' +
      '<div class="steel-rivet rivet-tl" aria-hidden="true"></div>' +
      '<div class="steel-rivet rivet-tr" aria-hidden="true"></div>' +
      '<div class="steel-rivet rivet-bl" aria-hidden="true"></div>' +
      '<div class="steel-rivet rivet-br" aria-hidden="true"></div>',
    labelSuffixHtml: '<span class="steel-badge-bracket" aria-hidden="true"></span>',
  }),
  renderCss(): string {
    return `
/* === Answer Card: Steel Beam Plate (ADR-003) === */
.ac-steel-beam-plate {
  position: relative;
  border: 4px solid #4B5563;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0) 35%, rgba(0, 0, 0, 0.3) 100%),
    radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.05) 0%, transparent 65%),
    linear-gradient(180deg, #242B38 0%, #1A202C 50%, #111622 100%);
  box-shadow:
    0 8px 0 #0B0E14,
    inset 0 2px 0 rgba(255, 255, 255, 0.2),
    inset 0 -2px 0 rgba(0, 0, 0, 0.6),
    0 12px 24px rgba(0, 0, 0, 0.45),
    0 0 16px var(--bg-primary, transparent);
  contain: layout style;
}

/* Subtle ambient industrial lighting from scene palette */
.ac-steel-beam-plate::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(ellipse at 50% 100%, var(--bg-secondary, transparent) 0%, transparent 60%);
  opacity: 0.08;
  pointer-events: none;
  z-index: 1;
}

/* Industrial Corner Hazard Trims */
.ac-steel-beam-plate .steel-hazard-trim {
  position: absolute;
  right: 12px;
  width: 38px;
  height: 5px;
  background: repeating-linear-gradient(
    -45deg,
    #F59E0B 0 6px,
    #18181B 6px 12px
  );
  border: 1px solid rgba(0, 0, 0, 0.4);
  border-radius: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.6), 0 0 4px var(--bg-accent, rgba(245, 158, 11, 0.25));
  pointer-events: none;
  z-index: 3;
}
.ac-steel-beam-plate .steel-hazard-tr {
  top: 6px;
}
.ac-steel-beam-plate .steel-hazard-br {
  bottom: 6px;
}

/* Authentic Diamond Tread Overlay - clean and non-interfering */
.ac-steel-beam-plate .steel-tread-texture {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background-image:
    radial-gradient(#4B5563 12%, transparent 18%),
    radial-gradient(#374151 12%, transparent 18%);
  background-position: 0 0, 8px 8px;
  background-size: 16px 16px;
  opacity: 0.06;
  pointer-events: none;
  z-index: 2;
}

/* Heavy Metallic Corner Rivets */
.ac-steel-beam-plate .steel-rivet {
  position: absolute;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #F8FAFC 0%, #94A3B8 50%, #475569 100%);
  border: 1px solid #1E293B;
  box-shadow: inset 0 1px 1px #FFFFFF, 0 1px 3px rgba(0, 0, 0, 0.8);
  pointer-events: none;
  z-index: 3;
}
.ac-steel-beam-plate .rivet-tl { top: 6px; left: 12px; }
.ac-steel-beam-plate .rivet-bl { bottom: 6px; left: 12px; }
.ac-steel-beam-plate .rivet-tr { top: 6px; right: 54px; }
.ac-steel-beam-plate .rivet-br { bottom: 6px; right: 54px; }

/* Embossed Industrial Letter Badge */
.ac-steel-beam-plate > b,
.ac-steel-beam-plate .choice-label,
.skin-steel_beam_plate .choice-label,
.choice-card.skin-steel_beam_plate .choice-label {
  border: 5px solid #374151;
  border-radius: 22px;
  background: linear-gradient(180deg, #FBBF24 0%, #F59E0B 52%, #D97706 100%);
  color: #FFFFFF;
  box-shadow:
    0 8px 0 #1E293B,
    inset 0 2px 0 rgba(255, 255, 255, 0.65),
    inset 0 -2px 0 rgba(0, 0, 0, 0.35),
    0 12px 24px rgba(0, 0, 0, 0.4);
  -webkit-text-stroke: 2.5px #1E293B;
  paint-order: stroke fill;
  text-shadow: 0 3px 0 #1E293B, 0 2px 6px rgba(0, 0, 0, 0.5);
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", sans-serif;
  font-weight: 900;
  line-height: 1;
}
.ac-steel-beam-plate > b::after,
.ac-steel-beam-plate .choice-label::after,
.skin-steel_beam_plate .choice-label::after,
.choice-card.skin-steel_beam_plate .choice-label::after {
  display: none;
}
.ac-steel-beam-plate .steel-badge-bracket {
  position: absolute;
  inset: 4px;
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  border-radius: 17px;
  pointer-events: none;
}

/* High Contrast Choice Text */
.ac-steel-beam-plate span,
.ac-steel-beam-plate .choice-text {
  position: relative;
  z-index: 5;
  color: #FFFFFF;
  font-weight: 800;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.85), 0 1px 2px #000000;
  letter-spacing: -0.01em;
}

/* === Reveal State: Correct Answer (Hydraulic Celebration & Emerald Power Surge) === */
.ac-steel-beam-plate.answer-correct,
.ac-steel-beam-plate.is-correct,
.choice-card.answer-correct .ac-steel-beam-plate,
.choice-card.is-correct .ac-steel-beam-plate,
.visual-answer-card.answer-correct .ac-steel-beam-plate,
.visual-answer-card.is-correct .ac-steel-beam-plate {
  border-color: #22C55E;
  background: linear-gradient(180deg, #163B29 0%, #0F291E 100%);
  box-shadow: 0 12px 0 #14532D, 0 0 36px rgba(34, 197, 94, 0.8), inset 0 2px 0 rgba(134, 239, 172, 0.6), 0 18px 36px rgba(0, 0, 0, 0.45);
  animation: ac-steel-beam-plate-win 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  z-index: 6;
}

.ac-steel-beam-plate.answer-reveal-correct,
.choice-card.answer-reveal-correct .ac-steel-beam-plate,
.visual-answer-card.answer-reveal-correct .ac-steel-beam-plate {
  animation: ac-steel-beam-plate-win 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
}

/* Badge victory slam */
.ac-steel-beam-plate.answer-correct > b,
.ac-steel-beam-plate.answer-correct .choice-label,
.ac-steel-beam-plate.is-correct > b,
.ac-steel-beam-plate.is-correct .choice-label,
.choice-card.answer-correct .ac-steel-beam-plate > b,
.choice-card.answer-correct .ac-steel-beam-plate .choice-label,
.choice-card.is-correct .ac-steel-beam-plate > b,
.choice-card.is-correct .ac-steel-beam-plate .choice-label,
.visual-answer-card.answer-correct .ac-steel-beam-plate > b,
.visual-answer-card.answer-correct .ac-steel-beam-plate .choice-label,
.visual-answer-card.is-correct .ac-steel-beam-plate > b,
.visual-answer-card.is-correct .ac-steel-beam-plate .choice-label,
.choice-card.answer-correct.skin-steel_beam_plate .choice-label,
.visual-answer-card.answer-correct.skin-steel_beam_plate .choice-label {
  background: linear-gradient(180deg, #4ADE80 0%, #22C55E 50%, #16A34A 100%);
  border-color: #86EFAC;
  box-shadow: 0 10px 0 #14532D, 0 0 28px rgba(34, 197, 94, 0.9), inset 0 3px 0 rgba(255, 255, 255, 0.85), inset 0 -3px 0 rgba(0, 0, 0, 0.3);
  -webkit-text-stroke: 3px #14532D;
  text-shadow: 0 3px 0 #14532D, 0 2px 6px rgba(0, 0, 0, 0.5);
  animation: ac-steel-beam-plate-badge-slam 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.ac-steel-beam-plate.answer-reveal-correct > b,
.ac-steel-beam-plate.answer-reveal-correct .choice-label,
.choice-card.answer-reveal-correct .ac-steel-beam-plate > b,
.choice-card.answer-reveal-correct .ac-steel-beam-plate .choice-label,
.visual-answer-card.answer-reveal-correct .ac-steel-beam-plate > b,
.visual-answer-card.answer-reveal-correct .ac-steel-beam-plate .choice-label,
.choice-card.answer-reveal-correct.skin-steel_beam_plate .choice-label,
.visual-answer-card.answer-reveal-correct.skin-steel_beam_plate .choice-label {
  animation: ac-steel-beam-plate-badge-slam 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
}

/* High contrast readable text */
.ac-steel-beam-plate.answer-correct .choice-text,
.ac-steel-beam-plate.is-correct .choice-text,
.choice-card.answer-correct .ac-steel-beam-plate .choice-text,
.choice-card.is-correct .ac-steel-beam-plate .choice-text,
.visual-answer-card.answer-correct .ac-steel-beam-plate .choice-text,
.visual-answer-card.is-correct .ac-steel-beam-plate .choice-text {
  color: #DCFCE7;
  text-shadow: 0 0 14px rgba(34, 197, 94, 0.7), 0 2px 4px rgba(0, 0, 0, 0.9);
}

.ac-steel-beam-plate.answer-reveal-correct .choice-text,
.choice-card.answer-reveal-correct .ac-steel-beam-plate .choice-text,
.visual-answer-card.answer-reveal-correct .ac-steel-beam-plate .choice-text {
  animation: ac-steel-beam-plate-text-win 0.62s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

/* Visual choice option image frame */
.skin-steel_beam_plate.choice-card-visual.answer-correct .option-image,
.skin-steel_beam_plate.choice-card-visual.is-correct .option-image {
  border-color: #22C55E;
  box-shadow: 0 14px 0 #14532D, 0 0 32px rgba(34, 197, 94, 0.75);
}

.skin-steel_beam_plate.choice-card-visual.answer-reveal-correct .option-image {
  animation: visual-choice-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--item-phase, 0s)) infinite alternate both,
             visual-correct-border 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: border-color, box-shadow, transform;
}

/* === Reveal State: Incorrect Answer (Clean Settle & Dimming) === */
.ac-steel-beam-plate.answer-incorrect,
.ac-steel-beam-plate.is-wrong,
.choice-card.answer-incorrect .ac-steel-beam-plate,
.choice-card.is-wrong .ac-steel-beam-plate,
.visual-answer-card.answer-incorrect .ac-steel-beam-plate,
.visual-answer-card.is-wrong .ac-steel-beam-plate {
  opacity: 0.35;
  filter: grayscale(78%) contrast(0.95) brightness(0.92);
  box-shadow: 0 4px 0 rgba(15, 23, 42, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: ac-steel-beam-plate-settle 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.ac-steel-beam-plate.answer-reveal-incorrect,
.choice-card.answer-reveal-incorrect .ac-steel-beam-plate,
.visual-answer-card.answer-reveal-incorrect .ac-steel-beam-plate {
  animation: ac-steel-beam-plate-settle 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform, opacity, filter;
}

/* Keyframe Animations */
@keyframes ac-steel-beam-plate-win {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-10px) scale(1.04); border-color: #4ADE80; box-shadow: 0 16px 0 #14532D, 0 0 44px rgba(74, 222, 128, 0.9); }
  75% { transform: translateY(-2px) scale(1.01); }
  100% { transform: translateY(-6px) scale(1.03); border-color: #22C55E; box-shadow: 0 12px 0 #14532D, 0 0 36px rgba(34, 197, 94, 0.8); }
}

@keyframes ac-steel-beam-plate-badge-slam {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1.08); }
}

@keyframes ac-steel-beam-plate-settle {
  0% { opacity: 1; transform: scale(1); filter: grayscale(0%); }
  100% { opacity: 0.35; transform: scale(0.96); filter: grayscale(78%) contrast(0.95) brightness(0.92); }
}

@keyframes ac-steel-beam-plate-text-win {
  0% { color: #F8FAFC; }
  100% { color: #DCFCE7; text-shadow: 0 0 14px rgba(34, 197, 94, 0.7), 0 2px 4px rgba(0, 0, 0, 0.9); }
}
`;
  },
};
