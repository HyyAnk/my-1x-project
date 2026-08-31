import type { AnswerCardSkin } from "../types.js";

export const comicChunkyVariant: AnswerCardSkin = {
  id: "comic_chunky",
  displayName: "Comic Pop Art",
  description: "Retro comic book style with thick ink borders, shadow offsets & pop-art fonts.",
  className: "ac-comic-chunky",
  cardClassName: ({ order }) => `comic-card-${order}`,
  renderDecorations: () => ({
    beforeLabelHtml:
      '<div class="comic-halftone-overlay" aria-hidden="true"></div><div class="comic-speed-hatch" aria-hidden="true"></div><span class="comic-corner-sparkle" aria-hidden="true">✦</span>',
    labelSuffixHtml: '<i class="comic-badge-glare" aria-hidden="true"></i>',
  }),
  renderCss(): string {
    return `
/* === Answer Card: Comic Pop Art (ADR-003) === */
.ac-comic-chunky {
  border: 7px solid #111827;
  border-radius: 28px;
  box-shadow: 10px 12px 0 #111827, inset 0 3px 0 rgba(255,255,255,0.95), 0 16px 28px rgba(17,24,39,0.25);
  transition: transform 0.2s cubic-bezier(0.18, 1.42, 0.34, 1);
  contain: layout style;
}

/* Dynamic Comic Tilt & Themes per card */
.ac-comic-chunky.comic-card-0,
.skin-comic_chunky:nth-child(1) .ac-comic-chunky,
.choice-card:nth-child(1).ac-comic-chunky,
.ac-comic-chunky:nth-child(1) {
  --comic-base-rot: -1.2deg;
  transform: rotate(var(--comic-base-rot)) translate3d(0,0,0);
  background: var(--comic-card-bg-0, linear-gradient(135deg, #FFFFEE 0%, #FFF8D6 100%));
}
.ac-comic-chunky.comic-card-1,
.skin-comic_chunky:nth-child(2) .ac-comic-chunky,
.choice-card:nth-child(2).ac-comic-chunky,
.ac-comic-chunky:nth-child(2) {
  --comic-base-rot: 1.4deg;
  transform: rotate(var(--comic-base-rot)) translate3d(0,0,0);
  background: var(--comic-card-bg-1, linear-gradient(135deg, #FFF5F8 0%, #FFE3EC 100%));
}
.ac-comic-chunky.comic-card-2,
.skin-comic_chunky:nth-child(3) .ac-comic-chunky,
.choice-card:nth-child(3).ac-comic-chunky,
.ac-comic-chunky:nth-child(3) {
  --comic-base-rot: -0.9deg;
  transform: rotate(var(--comic-base-rot)) translate3d(0,0,0);
  background: var(--comic-card-bg-2, linear-gradient(135deg, #F0FBFF 0%, #DCF3FC 100%));
}
.ac-comic-chunky.comic-card-3,
.skin-comic_chunky:nth-child(4) .ac-comic-chunky,
.choice-card:nth-child(4).ac-comic-chunky,
.ac-comic-chunky:nth-child(4) {
  --comic-base-rot: 1deg;
  transform: rotate(var(--comic-base-rot)) translate3d(0,0,0);
  background: var(--comic-card-bg-3, linear-gradient(135deg, #F4FFF7 0%, #E2FBEA 100%));
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
.ac-comic-chunky > b,
.ac-comic-chunky .choice-label {
  border: 6px solid #111827;
  border-radius: 22px;
  color: #FFFFFF;
  box-shadow: 6px 8px 0 #111827, inset 0 3px 0 rgba(255,255,255,0.9);
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
.ac-comic-chunky.comic-card-0 .choice-label,
.choice-card:nth-child(1) .ac-comic-chunky > b,
.choice-card:nth-child(1) .ac-comic-chunky .choice-label,
.ac-comic-chunky:nth-child(1) > b,
.ac-comic-chunky:nth-child(1) .choice-label {
  background: var(--comic-badge-0, linear-gradient(180deg, #FFE600 0%, #FF9500 100%));
  transform: rotate(-6deg);
}
.ac-comic-chunky.comic-card-1 > b,
.ac-comic-chunky.comic-card-1 .choice-label,
.choice-card:nth-child(2) .ac-comic-chunky > b,
.choice-card:nth-child(2) .ac-comic-chunky .choice-label,
.ac-comic-chunky:nth-child(2) > b,
.ac-comic-chunky:nth-child(2) .choice-label {
  background: var(--comic-badge-1, linear-gradient(180deg, #FF5E97 0%, #E60049 100%));
  transform: rotate(5deg);
}
.ac-comic-chunky.comic-card-2 > b,
.ac-comic-chunky.comic-card-2 .choice-label,
.choice-card:nth-child(3) .ac-comic-chunky > b,
.choice-card:nth-child(3) .ac-comic-chunky .choice-label,
.ac-comic-chunky:nth-child(3) > b,
.ac-comic-chunky:nth-child(3) .choice-label {
  background: var(--comic-badge-2, linear-gradient(180deg, #00D2FF 0%, #0066FF 100%));
  transform: rotate(-4deg);
}
.ac-comic-chunky.comic-card-3 > b,
.ac-comic-chunky.comic-card-3 .choice-label,
.choice-card:nth-child(4) .ac-comic-chunky > b,
.choice-card:nth-child(4) .ac-comic-chunky .choice-label,
.ac-comic-chunky:nth-child(4) > b,
.ac-comic-chunky:nth-child(4) .choice-label {
  background: var(--comic-badge-3, linear-gradient(180deg, #38EF7D 0%, #11998E 100%));
  transform: rotate(6deg);
}

/* Gloss Glare on Badge */
.ac-comic-chunky .comic-badge-glare {
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

/* Comic Choice Text */
.ac-comic-chunky span.comic-choice-text,
.ac-comic-chunky span,
.ac-comic-chunky .choice-text {
  position: relative;
  z-index: 4;
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-weight: 900;
  color: #111827;
  text-shadow: 0 1.5px 0 rgba(255,255,255,0.9), 0 0 1px rgba(255,255,255,0.5);
  letter-spacing: -0.2px;
}

/* Reveal State: Correct Answer */
.ac-comic-chunky.answer-correct,
.choice-card.answer-correct .ac-comic-chunky,
.visual-answer-card.answer-correct .ac-comic-chunky {
  background: linear-gradient(135deg, #E6FFFA 0%, #B2F5EA 60%, #81E6D9 100%);
  border-color: #0F5132;
  box-shadow: 12px 14px 0 #0F5132, 0 0 26px rgba(0, 230, 118, 0.45), inset 0 3px 0 rgba(255,255,255,1);
  animation: comic-pop-win 0.64s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s) + 0.14s) forwards;
  z-index: 6;
}
.ac-comic-chunky.answer-correct > b,
.ac-comic-chunky.answer-correct .choice-label,
.choice-card.answer-correct .ac-comic-chunky > b,
.choice-card.answer-correct .ac-comic-chunky .choice-label,
.visual-answer-card.answer-correct .ac-comic-chunky > b,
.visual-answer-card.answer-correct .ac-comic-chunky .choice-label {
  background: linear-gradient(180deg, #00FF87 0%, #60EFFF 100%);
  border-color: #0F5132;
  box-shadow: 6px 8px 0 #0F5132, inset 0 3px 0 rgba(255,255,255,0.95);
  animation: comic-badge-bounce 0.64s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s) + 0.14s) forwards;
}

/* Reveal State: Incorrect Answer */
.ac-comic-chunky.answer-incorrect,
.choice-card.answer-incorrect .ac-comic-chunky,
.visual-answer-card.answer-incorrect .ac-comic-chunky {
  opacity: 0.65;
  filter: grayscale(40%);
  animation: comic-dud-settle 0.45s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) forwards;
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

@keyframes comic-sparkle-pulse {
  0% { transform: rotate(15deg) scale(0.85); opacity: 0.7; }
  100% { transform: rotate(35deg) scale(1.2); opacity: 1; text-shadow: 0 0 10px rgba(255,212,63,1); }
}
`;
  },
};
