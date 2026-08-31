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
`;
  },
};
