import { textLayout } from "../../../candyArcade.js";
import { esc, escAttr } from "../../../../render/candyArcade/candyArcadeSvg.js";
import type { AnswerCardRenderInput, AnswerCardVariant } from "../types.js";

export const glossyArcadeVariant: AnswerCardVariant = {
  id: "glossy_arcade",
  displayName: "Glossy Arcade 3D",
  description: "Vibrant candy 3D glossy pill with circular letter badge, dashed border & shine.",
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
          `<div class="answer-card ac-glossy-arcade ${stateClass} choice-tier-${choiceLayout.tier}" style="--item-phase:0s" data-layout-allow-occlusion data-layout-allow-overflow>` +
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
/* Glossy Arcade Answer Cards */
.ac-glossy-arcade {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  overflow: visible;
  border: 8px solid var(--choice-stroke, #FFFFFF);
  border-radius: 9999px;
  background: var(--choice-pattern), var(--choice-bg-tint);
  background-size: 64px 32px, 100% 100%;
  box-shadow: 0 16px 0 var(--choice-depth-shadow, rgba(13,35,71,.2)), inset 0 4px 0 rgba(255,255,255,.7), 0 18px 32px rgba(10,25,60,.28);
}
.ac-glossy-arcade::before {
  content: "";
  position: absolute;
  inset: 6px 14px 6px 24px;
  border: 3px dashed rgba(255, 255, 255, 0.7);
  border-radius: 9999px;
  pointer-events: none;
  z-index: 3;
}
.ac-glossy-arcade > b {
  position: relative;
  z-index: 4;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 8px solid var(--choice-badge-border, #FFFFFF);
  border-radius: 50%;
  background: var(--choice-badge-grad);
  color: #FFFFFF !important;
  box-shadow: 0 12px 0 var(--choice-stroke-shadow), 0 14px 28px rgba(10,25,60,.35), -4px 6px 14px rgba(0,0,0,0.18), inset 0 -6px 0 rgba(0,0,0,0.22), inset 0 4px 0 rgba(255,255,255,0.85);
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-weight: 900;
  line-height: 1;
  -webkit-text-stroke: 4px var(--choice-stroke-shadow);
  paint-order: stroke fill;
  text-shadow: 0 4px 0 var(--choice-stroke-shadow), 0 2px 6px rgba(0,0,0,.35);
  letter-spacing: -0.5px;
}
.ac-glossy-arcade > b::after {
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
`;
  },
};
