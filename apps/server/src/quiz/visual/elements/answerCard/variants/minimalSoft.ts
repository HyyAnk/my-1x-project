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
.ac-minimal-soft .choice-label {
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
.ac-minimal-soft .choice-label::after {
  display: none;
}
.ac-minimal-soft span,
.ac-minimal-soft .choice-text {
  color: #1E293B;
  font-weight: 800;
}
`;
  },
};
