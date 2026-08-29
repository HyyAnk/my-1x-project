import { textLayout } from "../../../candyArcade.js";
import type { AnswerCardRenderInput, AnswerCardVariant } from "../types.js";

function esc(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function escAttr(value: string): string {
  return esc(value);
}

export const glassNeonVariant: AnswerCardVariant = {
  id: "glass_neon",
  displayName: "Glassmorphism Neon",
  description: "Translucent frosted acrylic panel with luminous edge glows & cyber typography.",
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
          `<div class="answer-card ac-glass-neon ${stateClass} choice-tier-${choiceLayout.tier}" style="--item-phase:0s" data-layout-allow-occlusion data-layout-allow-overflow>` +
          `<div class="glass-neon-edge" aria-hidden="true"></div>` +
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
/* Glass Neon Answer Cards */
.ac-glass-neon {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  overflow: visible;
  border: 4px solid rgba(255, 255, 255, 0.85) !important;
  border-radius: 32px !important;
  background: rgba(255, 255, 255, 0.82) !important;
  backdrop-filter: blur(20px) saturate(180%) !important;
  box-shadow: 0 12px 32px rgba(10, 25, 60, 0.22), 0 0 24px rgba(255, 255, 255, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.95) !important;
}
.ac-glass-neon .glass-neon-edge {
  position: absolute;
  inset: -2px;
  border-radius: 34px;
  background: linear-gradient(135deg, rgba(255,255,255,0.8) 0%, transparent 60%, rgba(255,255,255,0.4) 100%);
  pointer-events: none;
  z-index: 2;
}
.ac-glass-neon > b {
  position: relative;
  z-index: 4;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 5px solid rgba(255, 255, 255, 0.95) !important;
  border-radius: 24px !important;
  background: var(--choice-badge-grad, linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)) !important;
  color: #FFFFFF !important;
  box-shadow: 0 8px 20px rgba(6, 182, 212, 0.4), inset 0 2px 0 rgba(255,255,255,0.85) !important;
  font-family: "Fredoka", "SVN-Hello Headline", sans-serif;
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.ac-glass-neon > b::after {
  display: none;
}
.ac-glass-neon span {
  color: #0F172A !important;
  text-shadow: 0 1px 0 rgba(255,255,255,0.8);
}
`;
  },
};
