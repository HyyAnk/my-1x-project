import type { AnswerCardSkin } from "../types.js";

export const glassNeonVariant: AnswerCardSkin = {
  id: "glass_neon",
  displayName: "Glassmorphism Neon",
  description: "Translucent frosted acrylic panel with luminous edge glows & cyber typography.",
  className: "ac-glass-neon",
  renderDecorations: () => ({ beforeLabelHtml: '<div class="glass-neon-edge" aria-hidden="true"></div>' }),
  renderCss(): string {
    return `
/* === Answer Card: Glass Neon (ADR-003) === */
.ac-glass-neon {
  border: 4px solid rgba(255, 255, 255, 0.85);
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(8px) saturate(140%);
  box-shadow: 0 12px 32px rgba(10, 25, 60, 0.22), 0 0 24px rgba(255, 255, 255, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.95);
  contain: layout style;
}
.ac-glass-neon .glass-neon-edge {
  position: absolute;
  inset: -2px;
  border-radius: 34px;
  background: linear-gradient(135deg, rgba(255,255,255,0.8) 0%, transparent 60%, rgba(255,255,255,0.4) 100%);
  pointer-events: none;
  z-index: 2;
}
.ac-glass-neon > b,
.ac-glass-neon .choice-label {
  border: 5px solid rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  background: var(--choice-badge-grad, linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%));
  color: #FFFFFF;
  box-shadow: 0 8px 20px rgba(6, 182, 212, 0.4), inset 0 2px 0 rgba(255,255,255,0.85);
  font-family: "Fredoka", "SVN-Hello Headline", sans-serif;
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.ac-glass-neon > b::after,
.ac-glass-neon .choice-label::after {
  display: none;
}
.ac-glass-neon span,
.ac-glass-neon .choice-text {
  color: #0F172A;
  text-shadow: 0 1px 0 rgba(255,255,255,0.8);
}
`;
  },
};
