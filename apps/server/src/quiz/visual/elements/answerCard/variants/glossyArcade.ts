import type { AnswerCardSkin } from "../types.js";

export const glossyArcadeVariant: AnswerCardSkin = {
  id: "glossy_arcade",
  displayName: "Glossy Arcade 3D",
  description: "Vibrant candy 3D glossy pill with circular letter badge, dashed border & shine.",
  className: "ac-glossy-arcade",
  renderCss(): string {
    return `
/* === Answer Card: Glossy Arcade 3D (ADR-003) === */
.ac-glossy-arcade {
  border: 8px solid var(--choice-stroke, #FFFFFF);
  border-radius: 9999px;
  background: var(--choice-pattern), var(--choice-bg-tint);
  background-size: 64px 32px, 100% 100%;
  box-shadow: 0 16px 0 var(--choice-depth-shadow, rgba(13,35,71,.2)), inset 0 4px 0 rgba(255,255,255,.7), 0 18px 32px rgba(10,25,60,.28);
}
.ac-glossy-arcade::before, .answer-card::before { content: ""; position: absolute; inset: 6px 14px 6px 24px; border: 3px dashed rgba(255, 255, 255, 0.7); border-radius: 9999px; pointer-events: none; z-index: 3; }
.ac-glossy-arcade > b,
.ac-glossy-arcade .choice-label {
  border: 8px solid var(--choice-badge-border, #FFFFFF);
  border-radius: 50%;
  background: var(--choice-badge-grad);
  color: #FFFFFF;
  box-shadow: 0 12px 0 var(--choice-stroke-shadow), 0 14px 28px rgba(10,25,60,.35), -4px 6px 14px rgba(0,0,0,0.18), inset 0 -6px 0 rgba(0,0,0,0.22), inset 0 4px 0 rgba(255,255,255,0.85);
  -webkit-text-stroke: 4px var(--choice-stroke-shadow);
  paint-order: stroke fill;
  text-shadow: 0 4px 0 var(--choice-stroke-shadow), 0 2px 6px rgba(0,0,0,.35);
}
.ac-glossy-arcade > b::after,
.ac-glossy-arcade .choice-label::after,
.answer-card > b::after {
  position: absolute;
  top: 4px;
  left: 12px;
  right: 12px;
  height: 44%;
  border-radius: 50% 50% 35% 35%;
  background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.3) 65%, rgba(255,255,255,0) 100%);
  content: "";
  pointer-events: none;
  z-index: 5;
}
.ac-glossy-arcade span,
.ac-glossy-arcade .choice-text {
  color: var(--choice-text-color, #1e293b);
  text-shadow: var(--choice-text-shadow);
}

/* === Reveal State: Correct Answer (Celebration Glow & 3D Candy Elevation) === */
.ac-glossy-arcade.answer-correct,
.choice-card.answer-correct .ac-glossy-arcade,
.visual-answer-card.answer-correct .ac-glossy-arcade {
  border-color: #22C55E;
  background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 55%, #BBF7D0 100%);
  box-shadow: 0 16px 0 #15803D, 0 0 40px rgba(74, 222, 128, 0.85), inset 0 4px 0 rgba(255, 255, 255, 0.95), 0 20px 36px rgba(21, 128, 61, 0.35);
  animation: ac-glossy-arcade-win 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  z-index: 6;
}

.ac-glossy-arcade.answer-reveal-correct,
.choice-card.answer-reveal-correct .ac-glossy-arcade,
.visual-answer-card.answer-reveal-correct .ac-glossy-arcade {
  animation: ac-glossy-arcade-win 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
}

.ac-glossy-arcade.answer-correct::before,
.ac-glossy-arcade.answer-reveal-correct::before,
.choice-card.answer-correct .ac-glossy-arcade::before,
.choice-card.answer-reveal-correct .ac-glossy-arcade::before,
.visual-answer-card.answer-correct .ac-glossy-arcade::before,
.visual-answer-card.answer-reveal-correct .ac-glossy-arcade::before {
  border-color: rgba(255, 255, 255, 0.95);
}

/* Badge victory bounce & radiant 3D win styles */
.ac-glossy-arcade.answer-correct > b,
.ac-glossy-arcade.answer-correct .choice-label,
.choice-card.answer-correct .ac-glossy-arcade > b,
.choice-card.answer-correct .ac-glossy-arcade .choice-label,
.visual-answer-card.answer-correct .ac-glossy-arcade > b,
.visual-answer-card.answer-correct .ac-glossy-arcade .choice-label {
  background: linear-gradient(180deg, #4ADE80 0%, #22C55E 50%, #16A34A 100%);
  border-color: #FFFFFF;
  box-shadow: 0 12px 0 #15803D, 0 14px 28px rgba(21, 128, 61, 0.45), 0 0 24px rgba(74, 222, 128, 0.8), inset 0 -6px 0 rgba(0, 0, 0, 0.22), inset 0 4px 0 rgba(255, 255, 255, 0.85);
  -webkit-text-stroke: 4px #15803D;
  text-shadow: 0 4px 0 #15803D, 0 2px 6px rgba(0, 0, 0, 0.35);
  animation: ac-glossy-arcade-badge-bounce 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.ac-glossy-arcade.answer-reveal-correct > b,
.ac-glossy-arcade.answer-reveal-correct .choice-label,
.choice-card.answer-reveal-correct .ac-glossy-arcade > b,
.choice-card.answer-reveal-correct .ac-glossy-arcade .choice-label,
.visual-answer-card.answer-reveal-correct .ac-glossy-arcade > b,
.visual-answer-card.answer-reveal-correct .ac-glossy-arcade .choice-label {
  animation: ac-glossy-arcade-badge-bounce 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
}

/* High contrast WCAG AA readable text */
.ac-glossy-arcade.answer-correct .choice-text,
.choice-card.answer-correct .ac-glossy-arcade .choice-text,
.visual-answer-card.answer-correct .ac-glossy-arcade .choice-text {
  color: #064E3B;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8), 0 0 12px rgba(74, 222, 128, 0.4);
}

.ac-glossy-arcade.answer-reveal-correct .choice-text,
.choice-card.answer-reveal-correct .ac-glossy-arcade .choice-text,
.visual-answer-card.answer-reveal-correct .ac-glossy-arcade .choice-text {
  animation: ac-glossy-arcade-text-win 0.62s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

/* Visual choice option image celebration border & halo */
.skin-glossy_arcade.choice-card-visual.answer-correct .option-image,
.skin-glossy_arcade.choice-card-visual.answer-reveal-correct .option-image {
  border-color: #22C55E;
  box-shadow: 0 16px 0 #15803D, 0 0 36px rgba(74, 222, 128, 0.75), inset 0 4px 8px rgba(255, 255, 255, 0.95);
}

/* === Reveal State: Incorrect Answer (Clean Settle & Dimming) === */
.ac-glossy-arcade.answer-incorrect,
.choice-card.answer-incorrect .ac-glossy-arcade,
.visual-answer-card.answer-incorrect .ac-glossy-arcade {
  opacity: 0.35;
  filter: grayscale(78%) contrast(0.95) brightness(0.92);
  box-shadow: 0 4px 0 rgba(13, 35, 71, 0.1), inset 0 2px 0 rgba(255, 255, 255, 0.4);
  animation: ac-glossy-arcade-settle 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.ac-glossy-arcade.answer-reveal-incorrect,
.choice-card.answer-reveal-incorrect .ac-glossy-arcade,
.visual-answer-card.answer-reveal-incorrect .ac-glossy-arcade {
  animation: ac-glossy-arcade-settle 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform, opacity, filter;
}

/* Keyframe Animations */
@keyframes ac-glossy-arcade-win {
  0% { transform: translateY(0) scale(1); }
  55% { transform: translateY(-12px) scale(1.06); border-color: #4ADE80; box-shadow: 0 18px 0 #15803D, 0 0 44px rgba(74, 222, 128, 0.9), inset 0 4px 0 rgba(255, 255, 255, 0.95); background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 55%, #BBF7D0 100%); }
  76% { transform: translateY(-2px) scale(1.015); }
  100% { transform: translateY(-6px) scale(1.04); border-color: #22C55E; box-shadow: 0 16px 0 #15803D, 0 0 40px rgba(74, 222, 128, 0.85), inset 0 4px 0 rgba(255, 255, 255, 0.95); background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 55%, #BBF7D0 100%); }
}

@keyframes ac-glossy-arcade-badge-bounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.22); background: linear-gradient(180deg, #4ADE80 0%, #22C55E 50%, #16A34A 100%); border-color: #FFFFFF; box-shadow: 0 14px 0 #15803D, 0 0 32px rgba(74, 222, 128, 0.9), inset 0 -6px 0 rgba(0, 0, 0, 0.22), inset 0 4px 0 rgba(255, 255, 255, 0.85); }
  100% { transform: scale(1.08); background: linear-gradient(180deg, #4ADE80 0%, #22C55E 50%, #16A34A 100%); border-color: #FFFFFF; box-shadow: 0 12px 0 #15803D, 0 0 24px rgba(74, 222, 128, 0.8), inset 0 -6px 0 rgba(0, 0, 0, 0.22), inset 0 4px 0 rgba(255, 255, 255, 0.85); }
}

@keyframes ac-glossy-arcade-settle {
  0% { opacity: 1; transform: scale(1); filter: grayscale(0%); }
  100% { opacity: 0.35; transform: scale(0.96); filter: grayscale(78%) contrast(0.95) brightness(0.92); border-color: rgba(255, 255, 255, 0.25); box-shadow: 0 4px 0 rgba(13, 35, 71, 0.1), inset 0 2px 0 rgba(255, 255, 255, 0.4); }
}

@keyframes ac-glossy-arcade-text-win {
  0% { color: var(--choice-text-color, #1e293b); }
  100% { color: #064E3B; text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8), 0 0 12px rgba(74, 222, 128, 0.4); }
}
`;
  },
};
