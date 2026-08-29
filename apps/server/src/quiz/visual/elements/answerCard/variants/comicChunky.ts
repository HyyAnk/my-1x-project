import { textLayout } from "../../../candyArcade.js";
import { esc, escAttr } from "../../../../render/candyArcade/candyArcadeSvg.js";
import type { AnswerCardRenderInput, AnswerCardVariant } from "../types.js";

export const comicChunkyVariant: AnswerCardVariant = {
  id: "comic_chunky",
  displayName: "Comic Pop Art",
  description: "Retro comic book style with thick ink borders, shadow offsets & pop-art fonts.",
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
        const choiceLayout = textLayout(choiceText, "choice");
        const letter = String.fromCharCode(65 + idx);
        return (
          `<div class="answer-card ac-comic-chunky ${stateClass} choice-tier-${choiceLayout.tier}" style="--item-phase:0s" data-layout-allow-occlusion data-layout-allow-overflow>` +
          `<div class="comic-halftone-overlay" aria-hidden="true"></div>` +
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
/* Comic Chunky Answer Cards */
.ac-comic-chunky {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  overflow: visible;
  border: 7px solid #132A58 !important;
  border-radius: 28px !important;
  background: var(--choice-bg-tint, #FFFEEA) !important;
  box-shadow: 10px 12px 0 #132A58, inset 0 3px 0 rgba(255,255,255,0.9), 0 16px 28px rgba(10,25,60,0.2) !important;
}
.ac-comic-chunky .comic-halftone-overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 140px;
  border-radius: 0 20px 20px 0;
  background: radial-gradient(#132A58 18%, transparent 19%);
  background-size: 12px 12px;
  opacity: 0.14;
  pointer-events: none;
  z-index: 3;
}
.ac-comic-chunky > b {
  position: relative;
  z-index: 4;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 6px solid #132A58 !important;
  border-radius: 22px !important;
  background: var(--choice-badge-grad, linear-gradient(180deg, #FFDD44 0%, #FFA826 100%)) !important;
  color: #FFFFFF !important;
  box-shadow: 6px 8px 0 #132A58, inset 0 3px 0 rgba(255,255,255,0.9) !important;
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", sans-serif;
  font-weight: 900;
  line-height: 1;
  -webkit-text-stroke: 3px #132A58;
  paint-order: stroke fill;
  text-shadow: 0 3px 0 #132A58;
  transform: rotate(-4deg);
}
.ac-comic-chunky > b::after {
  display: none;
}
.ac-comic-chunky span {
  font-family: "Fredoka", "Nunito", sans-serif;
  font-weight: 900;
}
`;
  },
};
