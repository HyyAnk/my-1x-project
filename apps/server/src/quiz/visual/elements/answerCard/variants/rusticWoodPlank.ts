import type { AnswerCardSkin } from "../types.js";

export const rusticWoodPlankVariant: AnswerCardSkin = {
  id: "rustic_wood_plank",
  displayName: "Rustic Wood Plank",
  description: "Hand-hewn antique oak plank with brass corner braces, iron nail studs, warm parchment text, and glowing royal seal badges.",
  className: "ac-rustic-wood-plank",
  cardClassName: ({ order }) => `wood-card-${order}`,
  renderDecorations: () => ({
    beforeLabelHtml:
      '<div class="wood-bracket bracket-tl" aria-hidden="true"></div>' +
      '<div class="wood-bracket bracket-tr" aria-hidden="true"></div>' +
      '<div class="wood-bracket bracket-bl" aria-hidden="true"></div>' +
      '<div class="wood-bracket bracket-br" aria-hidden="true"></div>' +
      '<div class="wood-nail nail-l" aria-hidden="true"></div>' +
      '<div class="wood-nail nail-r" aria-hidden="true"></div>',
    labelSuffixHtml: '<span class="wood-wax-stamp" aria-hidden="true"></span>',
  }),
  renderCss(): string {
    return `
/* === Answer Card: Rustic Wood Plank === */
.ac-rustic-wood-plank {
  position: relative;
  border: 4px solid #7D431B;
  border-radius: 24px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0%, transparent 25%, rgba(0, 0, 0, 0.08) 50%, rgba(255, 255, 255, 0.03) 75%, transparent 100%),
    repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.05) 0px,
      rgba(0, 0, 0, 0.05) 1px,
      transparent 1px,
      transparent 6px
    ),
    linear-gradient(180deg, #6B3916 0%, #4E250E 50%, #341505 100%);
  box-shadow:
    0 8px 0 #1E0C04,
    inset 0 2px 0 rgba(255, 225, 150, 0.4),
    inset 0 -3px 0 rgba(0, 0, 0, 0.55),
    0 14px 28px rgba(0, 0, 0, 0.45);
  contain: layout style;
}

.ac-rustic-wood-plank::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(ellipse at 50% 0%, rgba(255, 215, 120, 0.16) 0%, transparent 65%);
  pointer-events: none;
  z-index: 1;
}

/* Authentic Hand-Hewn Grain Variation across Cards */
.ac-rustic-wood-plank.wood-card-0,
.skin-rustic_wood_plank:nth-child(1) .ac-rustic-wood-plank,
.choice-card:nth-child(1) .ac-rustic-wood-plank {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, transparent 25%, rgba(0, 0, 0, 0.08) 50%, rgba(255, 255, 255, 0.03) 75%, transparent 100%),
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.05) 0px, rgba(0, 0, 0, 0.05) 1px, transparent 1px, transparent 6px),
    linear-gradient(180deg, #6F3C18 0%, #53280F 50%, #371806 100%);
}
.ac-rustic-wood-plank.wood-card-1,
.skin-rustic_wood_plank:nth-child(2) .ac-rustic-wood-plank,
.choice-card:nth-child(2) .ac-rustic-wood-plank {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0%, transparent 25%, rgba(0, 0, 0, 0.09) 50%, rgba(255, 255, 255, 0.03) 75%, transparent 100%),
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.05) 0px, rgba(0, 0, 0, 0.05) 1px, transparent 1px, transparent 6px),
    linear-gradient(180deg, #663016 0%, #4B220E 50%, #321306 100%);
}
.ac-rustic-wood-plank.wood-card-2,
.skin-rustic_wood_plank:nth-child(3) .ac-rustic-wood-plank,
.choice-card:nth-child(3) .ac-rustic-wood-plank {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, transparent 25%, rgba(0, 0, 0, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%, transparent 100%),
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.05) 0px, rgba(0, 0, 0, 0.05) 1px, transparent 1px, transparent 6px),
    linear-gradient(180deg, #6A3B18 0%, #4F270F 50%, #351707 100%);
}
.ac-rustic-wood-plank.wood-card-3,
.skin-rustic_wood_plank:nth-child(4) .ac-rustic-wood-plank,
.choice-card:nth-child(4) .ac-rustic-wood-plank {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0%, transparent 25%, rgba(0, 0, 0, 0.08) 50%, rgba(255, 255, 255, 0.03) 75%, transparent 100%),
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.05) 0px, rgba(0, 0, 0, 0.05) 1px, transparent 1px, transparent 6px),
    linear-gradient(180deg, #603618 0%, #472410 50%, #301607 100%);
}

/* Brass Corner Braces */
.ac-rustic-wood-plank .wood-bracket {
  position: absolute;
  width: 22px;
  height: 22px;
  border-color: #E5A93C;
  border-style: solid;
  pointer-events: none;
  z-index: 3;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.75), inset 0 0 3px rgba(255, 235, 170, 0.4);
}
.ac-rustic-wood-plank .bracket-tl { top: 6px; left: 6px; border-width: 3.5px 0 0 3.5px; border-top-left-radius: 7px; }
.ac-rustic-wood-plank .bracket-tr { top: 6px; right: 6px; border-width: 3.5px 3.5px 0 0; border-top-right-radius: 7px; }
.ac-rustic-wood-plank .bracket-bl { bottom: 6px; left: 6px; border-width: 0 0 3.5px 3.5px; border-bottom-left-radius: 7px; }
.ac-rustic-wood-plank .bracket-br { bottom: 6px; right: 6px; border-width: 0 3.5px 3.5px 0; border-bottom-right-radius: 7px; }

/* Polished Brass Studs / Nails */
.ac-rustic-wood-plank .wood-nail {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #FDE68A 0%, #D97706 60%, #78350F 100%);
  border: 1px solid #291205;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.85), inset 0 1px 1px rgba(255, 255, 255, 0.7);
  pointer-events: none;
  z-index: 3;
}
.ac-rustic-wood-plank .nail-l { left: 12px; }
.ac-rustic-wood-plank .nail-r { right: 12px; }

/* Royal Wax Seal Choice Badge (A, B, C, D) - Ultra High Readability */
.ac-rustic-wood-plank > b,
.ac-rustic-wood-plank .choice-label,
.skin-rustic_wood_plank .choice-label,
.choice-card.skin-rustic_wood_plank .choice-label,
.choice-card[data-choice-variant="detached_badge"].skin-rustic_wood_plank > .choice-label,
.choice-card[data-choice-variant="detached_badge"].skin-rustic_wood_plank > .visual-answer-assembly > .choice-label {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 32%, #E53935 0%, #C62828 48%, #8E0A0A 80%, #5F0505 100%);
  border: 5px solid #F5CE66;
  box-shadow:
    0 8px 0 #2E0505,
    inset 0 2px 4px rgba(255, 255, 255, 0.5),
    inset 0 -3px 4px rgba(0, 0, 0, 0.5),
    0 12px 24px rgba(0, 0, 0, 0.45);
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", sans-serif;
  font-weight: 900;
  font-size: var(--choice-badge-font-size, 52px);
  line-height: 1;
  color: #FFFFFF;
  -webkit-text-stroke: 3.5px #3D0707;
  paint-order: stroke fill;
  text-shadow: 0 4px 0 #2A0404, 0 2px 6px rgba(0, 0, 0, 0.6);
  transition: transform 0.2s ease;
  overflow: hidden;
}

/* Stamped Inner Wax Seal Ring */
.ac-rustic-wood-plank .wood-wax-stamp,
.skin-rustic_wood_plank .wood-wax-stamp,
.choice-card.skin-rustic_wood_plank .wood-wax-stamp {
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  border: 2px dashed rgba(246, 208, 109, 0.45);
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

/* High Contrast Choice Text */
.ac-rustic-wood-plank span,
.ac-rustic-wood-plank .choice-text {
  position: relative;
  z-index: 5;
  font-family: "Nunito", "Baloo 2", sans-serif;
  font-weight: 800;
  color: #FFFDF5;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.95), 0 1px 2px #1A0B02;
  letter-spacing: 0.2px;
}

/* Visual choice option image celebration border & shadow */
.skin-rustic_wood_plank.choice-card-visual.answer-correct .option-image,
.skin-rustic_wood_plank.choice-card-visual.is-correct .option-image {
  border-color: #F59E0B;
  box-shadow: 0 14px 0 #854D0E, 0 0 32px rgba(245, 158, 11, 0.8), inset 0 3px 6px rgba(254, 240, 138, 0.6);
}
.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .option-image,
.quiz-question-clip .visual-answer-card:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .option-image,
.skin-rustic_wood_plank.choice-card-visual.answer-reveal-correct .option-image,
.choice-card.answer-reveal-correct.skin-rustic_wood_plank .option-image {
  animation: visual-choice-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--item-phase, 0s)) infinite alternate both,
             visual-correct-border 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: border-color, box-shadow, transform;
}

/* === Reveal State: Correct Answer (Golden Treasure Glory) === */
.ac-rustic-wood-plank.answer-correct,
.ac-rustic-wood-plank.is-correct,
.choice-card.answer-correct .ac-rustic-wood-plank,
.choice-card.is-correct .ac-rustic-wood-plank,
.visual-answer-card.answer-correct .ac-rustic-wood-plank,
.visual-answer-card.is-correct .ac-rustic-wood-plank {
  border-color: #F59E0B;
  background:
    radial-gradient(ellipse at 50% 50%, rgba(245, 158, 11, 0.26) 0%, transparent 70%),
    linear-gradient(180deg, #683616 0%, #4D260F 50%, #2E1405 100%);
  box-shadow:
    0 12px 0 #854D0E,
    0 0 40px rgba(245, 158, 11, 0.85),
    inset 0 3px 0 #FEF08A,
    inset 0 -3px 0 rgba(0, 0, 0, 0.6);
  animation: ac-rustic-wood-plank-win 0.68s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  z-index: 6;
}

.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .ac-rustic-wood-plank,
.quiz-question-clip .visual-answer-card:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .ac-rustic-wood-plank,
.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .visual-answer-label,
.quiz-question-clip .visual-answer-card:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .visual-answer-label,
.choice-card.answer-reveal-correct.skin-rustic_wood_plank .ac-rustic-wood-plank,
.visual-answer-card.answer-reveal-correct.skin-rustic_wood_plank .ac-rustic-wood-plank,
.ac-rustic-wood-plank.answer-reveal-correct,
.choice-card.answer-reveal-correct .ac-rustic-wood-plank,
.visual-answer-card.answer-reveal-correct .ac-rustic-wood-plank {
  animation: ac-rustic-wood-plank-win 0.68s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform, box-shadow;
}

/* Golden Sun Medallion Slam on Correct Answer */
.ac-rustic-wood-plank.answer-correct > b,
.ac-rustic-wood-plank.is-correct > b,
.choice-card.answer-correct .ac-rustic-wood-plank .choice-label,
.choice-card.is-correct .ac-rustic-wood-plank .choice-label,
.visual-answer-card.answer-correct .ac-rustic-wood-plank .choice-label,
.visual-answer-card.is-correct .ac-rustic-wood-plank .choice-label,
.choice-card.answer-correct.skin-rustic_wood_plank .choice-label,
.choice-card.is-correct.skin-rustic_wood_plank .choice-label,
.visual-answer-card.answer-correct.skin-rustic_wood_plank .choice-label,
.visual-answer-card.is-correct.skin-rustic_wood_plank .choice-label {
  background: radial-gradient(circle at 38% 32%, #FFF385 0%, #FBBF24 45%, #D97706 80%, #92400E 100%);
  border-color: #FEF08A;
  color: #FFFFFF;
  -webkit-text-stroke: 3.5px #78350F;
  box-shadow: 0 8px 0 #78350F, 0 0 28px rgba(245, 158, 11, 0.9), inset 0 2px 4px #FFFFFF, inset 0 -2px 4px rgba(0, 0, 0, 0.3);
  text-shadow: 0 4px 0 #451A03, 0 2px 6px rgba(0, 0, 0, 0.5);
  animation: ac-wood-seal-slam 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .choice-label,
.quiz-question-clip .visual-answer-card:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .choice-label,
.choice-card.answer-reveal-correct.skin-rustic_wood_plank .choice-label,
.visual-answer-card.answer-reveal-correct.skin-rustic_wood_plank .choice-label,
.ac-rustic-wood-plank.answer-reveal-correct > b,
.choice-card.answer-reveal-correct .ac-rustic-wood-plank .choice-label,
.visual-answer-card.answer-reveal-correct .ac-rustic-wood-plank .choice-label {
  animation: ac-wood-seal-slam 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
}

/* Pure Visual Straddling Badge Centering */
.choice-card-visual.choice-pure-visual.skin-rustic_wood_plank .choice-badge-pure,
.choice-card-visual.choice-pure-visual.skin-rustic_wood_plank .choice-label,
.layout-visual_choices_three_pure .choice-card.skin-rustic_wood_plank .choice-badge-pure,
.layout-visual_choices_three_pure .choice-card.skin-rustic_wood_plank .choice-label {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

/* Pure Visual Straddling Badge Reveal (Preserves translateX(-50%)) */
.quiz-question-clip .choice-card-visual.choice-pure-visual:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .choice-badge-pure,
.quiz-question-clip .choice-card-visual.choice-pure-visual:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .choice-label,
.quiz-question-clip .visual-answer-card.choice-pure-visual:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .choice-badge-pure,
.quiz-question-clip .visual-answer-card.choice-pure-visual:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .choice-label,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .choice-badge-pure,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .choice-label,
.choice-card-visual.choice-pure-visual.answer-reveal-correct.skin-rustic_wood_plank .choice-badge-pure,
.choice-card-visual.choice-pure-visual.answer-reveal-correct.skin-rustic_wood_plank .choice-label,
.layout-visual_choices_three_pure .choice-card.answer-reveal-correct.skin-rustic_wood_plank .choice-badge-pure,
.layout-visual_choices_three_pure .choice-card.answer-reveal-correct.skin-rustic_wood_plank .choice-label {
  animation: ac-wood-pure-seal-slam 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
}

.quiz-question-clip .choice-card-visual.choice-pure-visual:nth-child(n).answer-correct.skin-rustic_wood_plank .choice-badge-pure,
.quiz-question-clip .choice-card-visual.choice-pure-visual:nth-child(n).answer-correct.skin-rustic_wood_plank .choice-label,
.quiz-question-clip .visual-answer-card.choice-pure-visual:nth-child(n).answer-correct.skin-rustic_wood_plank .choice-badge-pure,
.quiz-question-clip .visual-answer-card.choice-pure-visual:nth-child(n).answer-correct.skin-rustic_wood_plank .choice-label,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(n).answer-correct.skin-rustic_wood_plank .choice-badge-pure,
.layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(n).answer-correct.skin-rustic_wood_plank .choice-label,
.choice-card-visual.choice-pure-visual.answer-correct.skin-rustic_wood_plank .choice-badge-pure,
.choice-card-visual.choice-pure-visual.answer-correct.skin-rustic_wood_plank .choice-label,
.layout-visual_choices_three_pure .choice-card.answer-correct.skin-rustic_wood_plank .choice-badge-pure,
.layout-visual_choices_three_pure .choice-card.answer-correct.skin-rustic_wood_plank .choice-label {
  transform: translateX(-50%) scale(1.08);
  background: radial-gradient(circle at 38% 32%, #FFF385 0%, #FBBF24 45%, #D97706 80%, #92400E 100%);
  border-color: #FEF08A;
  color: #FFFFFF;
  -webkit-text-stroke: 3.5px #78350F;
  box-shadow: 0 8px 0 #78350F, 0 0 28px rgba(245, 158, 11, 0.9), inset 0 2px 4px #FFFFFF, inset 0 -2px 4px rgba(0, 0, 0, 0.3);
  text-shadow: 0 4px 0 #451A03, 0 2px 6px rgba(0, 0, 0, 0.5);
}

/* Static Choice Text on Reveal */
.ac-rustic-wood-plank.answer-correct .choice-text,
.ac-rustic-wood-plank.is-correct .choice-text,
.choice-card.answer-correct .ac-rustic-wood-plank .choice-text,
.choice-card.is-correct .ac-rustic-wood-plank .choice-text,
.visual-answer-card.answer-correct .ac-rustic-wood-plank .choice-text,
.visual-answer-card.is-correct .ac-rustic-wood-plank .choice-text {
  color: #FEF08A;
  text-shadow: 0 0 14px rgba(245, 158, 11, 0.85), 0 2px 4px #000;
}

/* Scheduled Choice Text Animation on Reveal */
.ac-rustic-wood-plank.answer-reveal-correct .choice-text,
.choice-card.answer-reveal-correct .ac-rustic-wood-plank .choice-text,
.visual-answer-card.answer-reveal-correct .ac-rustic-wood-plank .choice-text {
  animation: ac-rustic-wood-text-win 0.62s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

/* === Reveal State: Incorrect Answer (Weathered & Dimmed) === */
.ac-rustic-wood-plank.answer-incorrect,
.ac-rustic-wood-plank.is-wrong,
.choice-card.answer-incorrect .ac-rustic-wood-plank,
.choice-card.is-wrong .ac-rustic-wood-plank,
.visual-answer-card.answer-incorrect .ac-rustic-wood-plank,
.visual-answer-card.is-wrong .ac-rustic-wood-plank {
  opacity: 0.35;
  filter: grayscale(80%) contrast(0.9) brightness(0.85);
  box-shadow: 0 4px 0 #0A0503, inset 0 1px 0 rgba(255, 255, 255, 0.08);
  animation: ac-rustic-wood-plank-settle 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.ac-rustic-wood-plank.answer-reveal-incorrect,
.choice-card.answer-reveal-incorrect .ac-rustic-wood-plank,
.visual-answer-card.answer-reveal-incorrect .ac-rustic-wood-plank {
  animation: ac-rustic-wood-plank-settle 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform, opacity, filter;
}

/* Keyframe Animations */
@keyframes ac-rustic-wood-plank-win {
  0% {
    transform: translateY(0) scale(1);
  }
  50% { transform: translateY(-10px) scale(1.04); border-color: #FBBF24; box-shadow: 0 16px 0 #854D0E, 0 0 44px rgba(245, 158, 11, 0.9); }
  75% { transform: translateY(-2px) scale(1.01); }
  100% { transform: translateY(-6px) scale(1.03); border-color: #F59E0B; box-shadow: 0 12px 0 #854D0E, 0 0 36px rgba(245, 158, 11, 0.8); }
}

@keyframes ac-wood-seal-slam {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.22);
    background: radial-gradient(circle at 38% 32%, #FFF385 0%, #FBBF24 45%, #D97706 80%, #92400E 100%);
    border-color: #FEF08A;
    color: #FFFFFF;
    -webkit-text-stroke: 3.5px #78350F;
    box-shadow: 0 8px 0 #78350F, 0 0 28px rgba(245, 158, 11, 0.9), inset 0 2px 4px #FFFFFF, inset 0 -2px 4px rgba(0, 0, 0, 0.3);
    text-shadow: 0 4px 0 #451A03, 0 2px 6px rgba(0, 0, 0, 0.5);
  }
  100% {
    transform: scale(1.08);
    background: radial-gradient(circle at 38% 32%, #FFF385 0%, #FBBF24 45%, #D97706 80%, #92400E 100%);
    border-color: #FEF08A;
    color: #FFFFFF;
    -webkit-text-stroke: 3.5px #78350F;
    box-shadow: 0 8px 0 #78350F, 0 0 28px rgba(245, 158, 11, 0.9), inset 0 2px 4px #FFFFFF, inset 0 -2px 4px rgba(0, 0, 0, 0.3);
    text-shadow: 0 4px 0 #451A03, 0 2px 6px rgba(0, 0, 0, 0.5);
  }
}

@keyframes ac-wood-pure-seal-slam {
  0% {
    transform: translateX(-50%) scale(1);
  }
  50% {
    transform: translateX(-50%) scale(1.22);
    background: radial-gradient(circle at 38% 32%, #FFF385 0%, #FBBF24 45%, #D97706 80%, #92400E 100%);
    border-color: #FEF08A;
    color: #FFFFFF;
    -webkit-text-stroke: 3.5px #78350F;
    box-shadow: 0 8px 0 #78350F, 0 0 28px rgba(245, 158, 11, 0.9), inset 0 2px 4px #FFFFFF, inset 0 -2px 4px rgba(0, 0, 0, 0.3);
    text-shadow: 0 4px 0 #451A03, 0 2px 6px rgba(0, 0, 0, 0.5);
  }
  100% {
    transform: translateX(-50%) scale(1.08);
    background: radial-gradient(circle at 38% 32%, #FFF385 0%, #FBBF24 45%, #D97706 80%, #92400E 100%);
    border-color: #FEF08A;
    color: #FFFFFF;
    -webkit-text-stroke: 3.5px #78350F;
    box-shadow: 0 8px 0 #78350F, 0 0 28px rgba(245, 158, 11, 0.9), inset 0 2px 4px #FFFFFF, inset 0 -2px 4px rgba(0, 0, 0, 0.3);
    text-shadow: 0 4px 0 #451A03, 0 2px 6px rgba(0, 0, 0, 0.5);
  }
}

@keyframes ac-rustic-wood-text-win {
  0% {
    color: #FFFDF5;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.95), 0 1px 2px #1A0B02;
  }
  100% {
    color: #FEF08A;
    text-shadow: 0 0 14px rgba(245, 158, 11, 0.85), 0 2px 4px #000;
  }
}

@keyframes ac-rustic-wood-plank-settle {
  0% { opacity: 1; transform: scale(1); filter: grayscale(0%); }
  100% { opacity: 0.35; transform: scale(0.96); filter: grayscale(80%) contrast(0.9) brightness(0.85); }
}
`;
  },
};
