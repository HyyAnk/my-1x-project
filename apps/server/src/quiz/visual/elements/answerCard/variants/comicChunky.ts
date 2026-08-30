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
          statusIcon = isCorrect
            ? '<div class="comic-status-burst answer-check" aria-hidden="true" style="opacity:1;"><span>POW!</span><i>✓</i></div>'
            : '<div class="comic-status-burst answer-cross" aria-hidden="true" style="opacity:1;"><span>NOPE</span><i>✕</i></div>';
        }
        const choiceLayout = textLayout(choiceText, "choice", {
          hasMascot: input.hasMascot,
          layoutId: input.layoutId,
        });
        const letter = String.fromCharCode(65 + idx);
        return (
          `<div class="answer-card ac-comic-chunky comic-card-${idx} ${stateClass} choice-tier-${choiceLayout.tier}" style="--item-phase:0s" data-layout-allow-occlusion data-layout-allow-overflow>` +
          `<div class="comic-halftone-overlay" aria-hidden="true"></div>` +
          `<div class="comic-speed-hatch" aria-hidden="true"></div>` +
          `<span class="comic-corner-sparkle" aria-hidden="true">✦</span>` +
          `<b data-layout-allow-occlusion data-text="${letter}">${letter}<i class="comic-badge-glare" aria-hidden="true"></i></b>` +
          `<span class="comic-choice-text" data-layout-allow-occlusion data-text="${escAttr(choiceText)}">${esc(choiceText)}</span>` +
          statusIcon +
          `</div>`
        );
      })
      .join("");

    return cards;
  },
  renderCss(): string {
    return `
/* Comic Pop Art Answer Cards */
.ac-comic-chunky {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  overflow: visible;
  border: 7px solid #111827 !important;
  border-radius: 28px !important;
  box-shadow: 10px 12px 0 #111827, inset 0 3px 0 rgba(255,255,255,0.95), 0 16px 28px rgba(17,24,39,0.25) !important;
  transition: transform 0.2s cubic-bezier(0.18, 1.42, 0.34, 1);
  contain: layout style;
}

/* Suppress default arcade dashed line */
.ac-comic-chunky::before {
  display: none !important;
}

/* Dynamic Comic Tilt & Themes per card */
.ac-comic-chunky.comic-card-0,
.ac-comic-chunky:nth-child(1) {
  --comic-base-rot: -1.2deg;
  transform: rotate(var(--comic-base-rot)) translate3d(0,0,0);
  background: var(--comic-card-bg-0, linear-gradient(135deg, #FFFFEE 0%, #FFF8D6 100%)) !important;
}
.ac-comic-chunky.comic-card-1,
.ac-comic-chunky:nth-child(2) {
  --comic-base-rot: 1.4deg;
  transform: rotate(var(--comic-base-rot)) translate3d(0,0,0);
  background: var(--comic-card-bg-1, linear-gradient(135deg, #FFF5F8 0%, #FFE3EC 100%)) !important;
}
.ac-comic-chunky.comic-card-2,
.ac-comic-chunky:nth-child(3) {
  --comic-base-rot: -0.9deg;
  transform: rotate(var(--comic-base-rot)) translate3d(0,0,0);
  background: var(--comic-card-bg-2, linear-gradient(135deg, #F0FBFF 0%, #DCF3FC 100%)) !important;
}
.ac-comic-chunky.comic-card-3,
.ac-comic-chunky:nth-child(4) {
  --comic-base-rot: 1deg;
  transform: rotate(var(--comic-base-rot)) translate3d(0,0,0);
  background: var(--comic-card-bg-3, linear-gradient(135deg, #F4FFF7 0%, #E2FBEA 100%)) !important;
}

/* Authentic Ben-Day Halftone Pattern */
.ac-comic-chunky .comic-halftone-overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 170px;
  border-radius: 0 20px 20px 0;
  background-image: radial-gradient(#111827 20%, transparent 22%);
  background-size: 10px 10px;
  opacity: 0.16;
  pointer-events: none;
  z-index: 2;
  mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,1) 100%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,1) 100%);
}

/* Comic Corner Speed Hatch Lines */
.ac-comic-chunky .comic-speed-hatch {
  position: absolute;
  bottom: 6px;
  right: 14px;
  width: 70px;
  height: 24px;
  background: repeating-linear-gradient(
    -45deg,
    #111827,
    #111827 3px,
    transparent 3px,
    transparent 8px
  );
  opacity: 0.18;
  pointer-events: none;
  z-index: 2;
  border-radius: 4px;
}

/* Comic Corner Sparkle */
.ac-comic-chunky .comic-corner-sparkle {
  position: absolute;
  top: -10px;
  right: 28px;
  font-size: 20px;
  line-height: 1;
  color: #FFD43F;
  text-shadow: 0 2px 0 #111827, 0 0 6px rgba(255,212,63,0.8);
  pointer-events: none;
  z-index: 5;
  transform: rotate(15deg);
  animation: comic-sparkle-pulse 2.2s ease-in-out infinite alternate;
}

/* Pop Art Letter Badge (A, B, C) */
.ac-comic-chunky > b {
  position: relative;
  z-index: 4;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 6px solid #111827 !important;
  border-radius: 22px !important;
  color: #FFFFFF !important;
  box-shadow: 6px 8px 0 #111827, inset 0 3px 0 rgba(255,255,255,0.9) !important;
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", sans-serif;
  font-weight: 900;
  line-height: 1;
  -webkit-text-stroke: 3.5px #111827;
  paint-order: stroke fill;
  text-shadow: 0 3px 0 #111827;
  transform: rotate(-5deg);
  overflow: hidden;
}

.ac-comic-chunky.comic-card-0 > b,
.ac-comic-chunky:nth-child(1) > b {
  background: var(--comic-badge-0, linear-gradient(180deg, #FFE600 0%, #FF9500 100%)) !important;
  transform: rotate(-6deg);
}
.ac-comic-chunky.comic-card-1 > b,
.ac-comic-chunky:nth-child(2) > b {
  background: var(--comic-badge-1, linear-gradient(180deg, #FF5E97 0%, #E60049 100%)) !important;
  transform: rotate(5deg);
}
.ac-comic-chunky.comic-card-2 > b,
.ac-comic-chunky:nth-child(3) > b {
  background: var(--comic-badge-2, linear-gradient(180deg, #00D2FF 0%, #0066FF 100%)) !important;
  transform: rotate(-4deg);
}
.ac-comic-chunky.comic-card-3 > b,
.ac-comic-chunky:nth-child(4) > b {
  background: var(--comic-badge-3, linear-gradient(180deg, #38EF7D 0%, #11998E 100%)) !important;
  transform: rotate(6deg);
}

/* Gloss Glare on Badge */
.ac-comic-chunky > b .comic-badge-glare {
  position: absolute;
  top: 3px;
  left: 6px;
  right: 6px;
  height: 38%;
  border-radius: 14px 14px 8px 8px;
  background: linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.15) 100%);
  pointer-events: none;
  z-index: 5;
}
.ac-comic-chunky > b::after {
  display: none !important;
}

/* Comic Choice Text */
.ac-comic-chunky span.comic-choice-text,
.ac-comic-chunky span {
  position: relative;
  z-index: 4;
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-weight: 900;
  color: #111827 !important;
  text-shadow: 0 1.5px 0 rgba(255,255,255,0.9), 0 0 1px rgba(255,255,255,0.5);
  letter-spacing: -0.2px;
}

/* Comic Status Burst (POW! / NOPE) */
.ac-comic-chunky .comic-status-burst {
  position: absolute;
  z-index: 7;
  top: -18px;
  right: -8px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 14px;
  border: 4px solid #111827;
  border-radius: 14px;
  font-family: "Fredoka", "SVN-Hello Headline", sans-serif;
  font-weight: 900;
  box-shadow: 4px 5px 0 #111827;
  opacity: 0;
  transform: rotate(8deg) scale(0.9);
  animation: comic-status-pop 0.42s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s) + 0.12s) both;
}
.ac-comic-chunky .comic-status-burst span {
  font-size: 20px;
  line-height: 1;
  color: #FFFFFF !important;
  -webkit-text-stroke: 2px #111827;
  paint-order: stroke fill;
  text-shadow: 0 2px 0 #111827;
}
.ac-comic-chunky .comic-status-burst i {
  font-style: normal;
  font-size: 22px;
  line-height: 1;
  color: #FFFFFF;
  -webkit-text-stroke: 2px #111827;
}

.ac-comic-chunky .comic-status-burst.answer-check {
  background: #00E676;
  transform: rotate(10deg);
}
.ac-comic-chunky .comic-status-burst.answer-cross {
  background: #FF3366;
  transform: rotate(-8deg);
}

/* Reveal State: Correct Answer */
.ac-comic-chunky.answer-correct {
  background: linear-gradient(135deg, #E6FFFA 0%, #B2F5EA 60%, #81E6D9 100%) !important;
  border-color: #0F5132 !important;
  box-shadow: 12px 14px 0 #0F5132, 0 0 26px rgba(0, 230, 118, 0.45), inset 0 3px 0 rgba(255,255,255,1) !important;
  animation: comic-pop-win 0.64s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s) + 0.14s) forwards !important;
  z-index: 6;
}
.ac-comic-chunky.answer-correct > b {
  background: linear-gradient(180deg, #00FF87 0%, #60EFFF 100%) !important;
  border-color: #0F5132 !important;
  box-shadow: 6px 8px 0 #0F5132, inset 0 3px 0 rgba(255,255,255,0.95) !important;
  animation: comic-badge-bounce 0.64s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s) + 0.14s) forwards !important;
}

/* Reveal State: Incorrect Answer */
.ac-comic-chunky.answer-incorrect {
  opacity: 0.65;
  filter: grayscale(40%);
  animation: comic-dud-settle 0.45s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) forwards !important;
}

/* Comic Keyframe Animations */
@keyframes comic-pop-win {
  0% { transform: rotate(var(--comic-base-rot, 0deg)) scale(1); }
  45% { transform: rotate(0deg) scale(1.08); }
  70% { transform: rotate(-1deg) scale(1.03); }
  100% { transform: rotate(0deg) scale(1.05); }
}

@keyframes comic-badge-bounce {
  0% { transform: scale(1) rotate(-5deg); }
  50% { transform: scale(1.22) rotate(8deg); }
  100% { transform: scale(1.1) rotate(0deg); }
}

@keyframes comic-dud-settle {
  0% { transform: rotate(var(--comic-base-rot, 0deg)) scale(1); }
  25% { transform: rotate(calc(var(--comic-base-rot, 0deg) - 2deg)) translate3d(0, 4px, 0); }
  60% { transform: rotate(calc(var(--comic-base-rot, 0deg) + 1.5deg)) translate3d(0, 6px, 0); }
  100% { transform: rotate(var(--comic-base-rot, 0deg)) translate3d(0, 6px, 0) scale(0.96); }
}

@keyframes comic-status-pop {
  0% { transform: scale(0.2) rotate(-20deg); opacity: 0; }
  60% { transform: scale(1.15) rotate(12deg); opacity: 1; }
  100% { transform: scale(1) rotate(8deg); opacity: 1; }
}

@keyframes comic-sparkle-pulse {
  0% { transform: rotate(15deg) scale(0.85); opacity: 0.7; }
  100% { transform: rotate(35deg) scale(1.2); opacity: 1; text-shadow: 0 0 10px rgba(255,212,63,1); }
}
`;
  },
};
