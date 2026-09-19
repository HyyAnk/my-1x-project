import type { AnswerCardSkin } from "../types.js";

export const minimalSoftVariant: AnswerCardSkin = {
  id: "minimal_soft",
  displayName: "Minimalist Soft Card",
  description: "Ultra-clean modern card with subtle shadows, rounded pill badge & soft elegance.",
  className: "ac-minimal-soft",
  renderCss(): string {
    return `
/* === Answer Card: Minimal Soft (ADR-003) === */
.ac-minimal-soft {
  border: 4px solid #FFFFFF;
  border-radius: 9999px;
  background: #FFFFFF;
  box-shadow: 0 10px 24px rgba(13, 35, 71, 0.14), inset 0 2px 0 rgba(255, 255, 255, 1);
}
.ac-minimal-soft > b,
.ac-minimal-soft .choice-label,
.skin-minimal_soft .choice-label,
.choice-card.skin-minimal_soft .choice-label {
  border: 4px solid #FFFFFF;
  border-radius: 50%;
  background: var(--choice-badge-grad, linear-gradient(135deg, #6366F1 0%, #4F46E5 100%));
  color: #FFFFFF;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
  font-family: "Fredoka", "Nunito", sans-serif;
  font-weight: 900;
  line-height: 1;
}
.ac-minimal-soft > b::after,
.ac-minimal-soft .choice-label::after,
.skin-minimal_soft .choice-label::after,
.choice-card.skin-minimal_soft .choice-label::after {
  display: none;
}
.ac-minimal-soft span,
.ac-minimal-soft .choice-text {
  color: #1E293B;
  font-weight: 800;
}

/* === Reveal State: Correct Answer (Ultra-Clean Modern Emerald Highlight) === */
.ac-minimal-soft.answer-correct,
.choice-card.answer-correct .ac-minimal-soft,
.visual-answer-card.answer-correct .ac-minimal-soft {
  border-color: #22C55E;
  background: #F0FDF4;
  box-shadow: 0 14px 32px rgba(34, 197, 94, 0.28), 0 4px 12px rgba(34, 197, 94, 0.2), inset 0 2px 0 rgba(255, 255, 255, 1);
  animation: ac-minimal-soft-win 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  z-index: 6;
}

.ac-minimal-soft.answer-reveal-correct,
.choice-card.answer-reveal-correct .ac-minimal-soft,
.visual-answer-card.answer-reveal-correct .ac-minimal-soft {
  animation: ac-minimal-soft-win 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
}

/* Badge victory pop */
.ac-minimal-soft.answer-correct > b,
.ac-minimal-soft.answer-correct .choice-label,
.choice-card.answer-correct .ac-minimal-soft > b,
.choice-card.answer-correct .ac-minimal-soft .choice-label,
.visual-answer-card.answer-correct .ac-minimal-soft > b,
.visual-answer-card.answer-correct .ac-minimal-soft .choice-label,
.choice-card.answer-correct.skin-minimal_soft .choice-label,
.visual-answer-card.answer-correct.skin-minimal_soft .choice-label {
  background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
  border-color: #FFFFFF;
  box-shadow: 0 8px 20px rgba(34, 197, 94, 0.45);
  animation: ac-minimal-soft-badge-pop 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.ac-minimal-soft.answer-reveal-correct > b,
.ac-minimal-soft.answer-reveal-correct .choice-label,
.choice-card.answer-reveal-correct .ac-minimal-soft > b,
.choice-card.answer-reveal-correct .ac-minimal-soft .choice-label,
.visual-answer-card.answer-reveal-correct .ac-minimal-soft > b,
.visual-answer-card.answer-reveal-correct .ac-minimal-soft .choice-label,
.choice-card.answer-reveal-correct.skin-minimal_soft .choice-label,
.visual-answer-card.answer-reveal-correct.skin-minimal_soft .choice-label {
  animation: ac-minimal-soft-badge-pop 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
}

/* Correct text styling */
.ac-minimal-soft.answer-correct .choice-text,
.choice-card.answer-correct .ac-minimal-soft .choice-text,
.visual-answer-card.answer-correct .ac-minimal-soft .choice-text {
  color: #14532D;
}

.ac-minimal-soft.answer-reveal-correct .choice-text,
.choice-card.answer-reveal-correct .ac-minimal-soft .choice-text,
.visual-answer-card.answer-reveal-correct .ac-minimal-soft .choice-text {
  animation: ac-minimal-soft-text-win 0.62s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

/* Visual choice option image celebration border */
.skin-minimal_soft.choice-card-visual.answer-correct .option-image {
  border-color: #22C55E;
  box-shadow: 0 14px 32px rgba(34, 197, 94, 0.28);
}

.skin-minimal_soft.choice-card-visual.answer-reveal-correct .option-image {
  animation: visual-choice-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--item-phase, 0s)) infinite alternate both,
             visual-correct-border 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: border-color, box-shadow, transform;
}

/* === Reveal State: Incorrect Answer (Clean Settle & Dimming) === */
.ac-minimal-soft.answer-incorrect,
.choice-card.answer-incorrect .ac-minimal-soft,
.visual-answer-card.answer-incorrect .ac-minimal-soft {
  opacity: 0.35;
  filter: grayscale(78%) contrast(0.95) brightness(0.92);
  border-color: #E2E8F0;
  box-shadow: 0 4px 12px rgba(13, 35, 71, 0.06);
  animation: ac-minimal-soft-settle 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.ac-minimal-soft.answer-reveal-incorrect,
.choice-card.answer-reveal-incorrect .ac-minimal-soft,
.visual-answer-card.answer-reveal-incorrect .ac-minimal-soft {
  animation: ac-minimal-soft-settle 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform, opacity, filter;
}

/* Keyframe Animations */
@keyframes ac-minimal-soft-win {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-8px) scale(1.04); border-color: #22C55E; box-shadow: 0 16px 36px rgba(34, 197, 94, 0.35); background: #F0FDF4; }
  100% { transform: translateY(-4px) scale(1.02); border-color: #22C55E; box-shadow: 0 14px 32px rgba(34, 197, 94, 0.28); background: #F0FDF4; }
}

@keyframes ac-minimal-soft-badge-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.18); background: linear-gradient(135deg, #4ADE80 0%, #16A34A 100%); box-shadow: 0 10px 24px rgba(34, 197, 94, 0.55); }
  100% { transform: scale(1.06); background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%); box-shadow: 0 8px 20px rgba(34, 197, 94, 0.45); }
}

@keyframes ac-minimal-soft-text-win {
  0% { color: #1E293B; }
  100% { color: #14532D; }
}

@keyframes ac-minimal-soft-settle {
  0% { opacity: 1; transform: scale(1); filter: grayscale(0%); }
  100% { opacity: 0.35; transform: scale(0.96); filter: grayscale(78%) contrast(0.95) brightness(0.92); border-color: #E2E8F0; box-shadow: 0 4px 12px rgba(13, 35, 71, 0.06); }
}
`;
  },
};
