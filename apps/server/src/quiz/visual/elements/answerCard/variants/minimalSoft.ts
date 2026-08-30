import { textLayout } from "../../../candyArcade.js";
import { esc, escAttr } from "../../../../render/candyArcade/candyArcadeSvg.js";
import type { AnswerCardRenderInput, AnswerCardVariant } from "../types.js";

export const minimalSoftVariant: AnswerCardVariant = {
  id: "minimal_soft",
  displayName: "Minimalist Soft Card",
  description: "Ultra-clean modern card with subtle shadows, rounded pill badge & soft elegance.",
  renderHtml(input: AnswerCardRenderInput): string {
    const { choices, correctIndex, phase } = input;
    const isReveal = phase === "reveal" || phase === "explain";

    const cards = choices
      .map((choiceText, idx) => {
        const isCorrect = idx === correctIndex;
        let stateClass = "answer-normal";
        let statusIcon = "";
        if (isReveal) {
          stateClass = isCorrect ? "answer-correct" : "answer-incorrect";
          statusIcon = isCorrect ? '<i class="answer-check" style="opacity:1;">✓</i>' : '<i class="answer-cross" style="opacity:1;">✕</i>';
        }
        const choiceLayout = textLayout(choiceText, "choice", {
          hasMascot: input.hasMascot,
          layoutId: input.layoutId,
        });
        const letter = String.fromCharCode(65 + idx);
        return (
          `<div class="answer-card ac-minimal-soft ${stateClass} choice-tier-${choiceLayout.tier}" style="--item-phase:0s" data-layout-allow-occlusion data-layout-allow-overflow>` +
          `<b data-layout-allow-occlusion data-text="${letter}">${letter}</b>` +
          `<span data-layout-allow-occlusion data-text="${escAttr(choiceText)}">${esc(choiceText)}</span>` +
          statusIcon +
          `</div>`
        );
      })
      .join("");

    return cards;
  },
  renderCss(): string {
    return `
/* Minimalist Soft Answer Cards */
.ac-minimal-soft {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  overflow: visible;
  border: 4px solid #FFFFFF !important;
  border-radius: 9999px !important;
  background: #FFFFFF !important;
  box-shadow: 0 10px 24px rgba(13, 35, 71, 0.14), inset 0 2px 0 rgba(255, 255, 255, 1) !important;
}
.ac-minimal-soft > b {
  position: relative;
  z-index: 4;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 4px solid #FFFFFF !important;
  border-radius: 50% !important;
  background: var(--choice-badge-grad, linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)) !important;
  color: #FFFFFF !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16) !important;
  font-family: "Fredoka", "Nunito", sans-serif;
  font-weight: 900;
  line-height: 1;
}
.ac-minimal-soft > b::after {
  display: none;
}
.ac-minimal-soft span {
  color: #1E293B !important;
  font-weight: 800;
}
`;
  },
};
