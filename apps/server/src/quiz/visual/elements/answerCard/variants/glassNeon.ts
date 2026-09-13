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

/* === Reveal State: Correct Answer (Cyber Neon Emerald Glow & Bloom) === */
.ac-glass-neon.answer-correct,
.choice-card.answer-correct .ac-glass-neon,
.visual-answer-card.answer-correct .ac-glass-neon {
  border-color: #22C55E;
  background: rgba(240, 253, 244, 0.94);
  box-shadow: 0 0 32px rgba(34, 197, 94, 0.8), inset 0 0 16px rgba(34, 197, 94, 0.35), 0 14px 36px rgba(10, 25, 60, 0.25), inset 0 2px 0 rgba(255, 255, 255, 0.95);
  animation: ac-glass-neon-pulse 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  z-index: 6;
}

.ac-glass-neon.answer-reveal-correct,
.choice-card.answer-reveal-correct .ac-glass-neon,
.visual-answer-card.answer-reveal-correct .ac-glass-neon {
  animation: ac-glass-neon-pulse 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
}

.ac-glass-neon.answer-correct .glass-neon-edge,
.choice-card.answer-correct .ac-glass-neon .glass-neon-edge,
.visual-answer-card.answer-correct .ac-glass-neon .glass-neon-edge {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.9) 0%, rgba(34, 197, 94, 0.3) 50%, rgba(16, 185, 129, 0.8) 100%);
  box-shadow: inset 0 0 12px rgba(34, 197, 94, 0.6);
}

.ac-glass-neon.answer-reveal-correct .glass-neon-edge,
.choice-card.answer-reveal-correct .ac-glass-neon .glass-neon-edge,
.visual-answer-card.answer-reveal-correct .ac-glass-neon .glass-neon-edge {
  animation: ac-glass-neon-edge-glow 0.62s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

/* Badge glow bloom & victory pulse */
.ac-glass-neon.answer-correct > b,
.ac-glass-neon.answer-correct .choice-label,
.choice-card.answer-correct .ac-glass-neon > b,
.choice-card.answer-correct .ac-glass-neon .choice-label,
.visual-answer-card.answer-correct .ac-glass-neon > b,
.visual-answer-card.answer-correct .ac-glass-neon .choice-label {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  border-color: #DCFCE7;
  box-shadow: 0 0 28px rgba(34, 197, 94, 0.9), 0 8px 24px rgba(16, 185, 129, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.9);
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.3);
  animation: ac-glass-neon-badge-pop 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.ac-glass-neon.answer-reveal-correct > b,
.ac-glass-neon.answer-reveal-correct .choice-label,
.choice-card.answer-reveal-correct .ac-glass-neon > b,
.choice-card.answer-reveal-correct .ac-glass-neon .choice-label,
.visual-answer-card.answer-reveal-correct .ac-glass-neon > b,
.visual-answer-card.answer-reveal-correct .ac-glass-neon .choice-label {
  animation: ac-glass-neon-badge-pop 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
}

/* Correct text styling */
.ac-glass-neon.answer-correct .choice-text,
.choice-card.answer-correct .ac-glass-neon .choice-text,
.visual-answer-card.answer-correct .ac-glass-neon .choice-text {
  color: #064E3B;
  text-shadow: 0 0 12px rgba(74, 222, 128, 0.5), 0 1px 0 rgba(255, 255, 255, 0.9);
}

.ac-glass-neon.answer-reveal-correct .choice-text,
.choice-card.answer-reveal-correct .ac-glass-neon .choice-text,
.visual-answer-card.answer-reveal-correct .ac-glass-neon .choice-text {
  animation: ac-glass-neon-text-glow 0.62s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

/* Visual choice option image neon halo */
.skin-glass_neon.choice-card-visual.answer-correct .option-image,
.skin-glass_neon.choice-card-visual.answer-reveal-correct .option-image {
  border-color: #22C55E;
  box-shadow: 0 0 32px rgba(34, 197, 94, 0.8), inset 0 0 16px rgba(34, 197, 94, 0.35);
}

/* === Reveal State: Incorrect Answer (Clean Settle & Dimming) === */
.ac-glass-neon.answer-incorrect,
.choice-card.answer-incorrect .ac-glass-neon,
.visual-answer-card.answer-incorrect .ac-glass-neon {
  opacity: 0.35;
  filter: grayscale(78%) contrast(0.95) brightness(0.92);
  box-shadow: 0 4px 12px rgba(10, 25, 60, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  animation: ac-glass-neon-settle 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.ac-glass-neon.answer-reveal-incorrect,
.choice-card.answer-reveal-incorrect .ac-glass-neon,
.visual-answer-card.answer-reveal-incorrect .ac-glass-neon {
  animation: ac-glass-neon-settle 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform, opacity, filter;
}

/* Keyframe Animations */
@keyframes ac-glass-neon-pulse {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-10px) scale(1.05); border-color: #4ADE80; box-shadow: 0 0 42px rgba(34, 197, 94, 0.95), inset 0 0 24px rgba(74, 222, 128, 0.5), 0 16px 40px rgba(10, 25, 60, 0.3); background: rgba(240, 253, 244, 0.96); }
  100% { transform: translateY(-5px) scale(1.03); border-color: #22C55E; box-shadow: 0 0 32px rgba(34, 197, 94, 0.8), inset 0 0 16px rgba(34, 197, 94, 0.35), 0 14px 36px rgba(10, 25, 60, 0.25); background: rgba(240, 253, 244, 0.94); }
}

@keyframes ac-glass-neon-badge-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.22); background: linear-gradient(135deg, #34D399 0%, #059669 100%); box-shadow: 0 0 36px rgba(34, 197, 94, 1), 0 10px 28px rgba(16, 185, 129, 0.6); }
  100% { transform: scale(1.08); background: linear-gradient(135deg, #10B981 0%, #059669 100%); box-shadow: 0 0 28px rgba(34, 197, 94, 0.9), 0 8px 24px rgba(16, 185, 129, 0.5); }
}

@keyframes ac-glass-neon-edge-glow {
  0% { background: linear-gradient(135deg, rgba(255,255,255,0.8) 0%, transparent 60%, rgba(255,255,255,0.4) 100%); }
  100% { background: linear-gradient(135deg, rgba(74, 222, 128, 0.9) 0%, rgba(34, 197, 94, 0.3) 50%, rgba(16, 185, 129, 0.8) 100%); box-shadow: inset 0 0 12px rgba(34, 197, 94, 0.6); }
}

@keyframes ac-glass-neon-text-glow {
  0% { color: #0F172A; text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8); }
  100% { color: #064E3B; text-shadow: 0 0 12px rgba(74, 222, 128, 0.5), 0 1px 0 rgba(255, 255, 255, 0.9); }
}

@keyframes ac-glass-neon-settle {
  0% { opacity: 1; transform: scale(1); filter: grayscale(0%); }
  100% { opacity: 0.35; transform: scale(0.96); filter: grayscale(78%) contrast(0.95) brightness(0.92); border-color: rgba(255, 255, 255, 0.2); box-shadow: 0 4px 12px rgba(10, 25, 60, 0.08); }
}
`;
  },
};
