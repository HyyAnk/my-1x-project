import type { AnswerCardSkin } from "../types.js";

export const pastelMarshmallowVariant: AnswerCardSkin = {
  id: "pastel_marshmallow",
  displayName: "Pastel Marshmallow",
  description: "Ultra-plush marshmallow rounded card with soft bouncy shadow, candy confection accents, and playful bouncy badge.",
  className: "ac-pastel-marshmallow",
  cardClassName: ({ order }) => `marshmallow-card-${order}`,
  renderDecorations: () => ({
    beforeLabelHtml:
      '<div class="marshmallow-inner-glow" aria-hidden="true"></div>' +
      '<span class="marshmallow-sprinkle sprinkle-1" aria-hidden="true">✦</span>' +
      '<span class="marshmallow-sprinkle sprinkle-2" aria-hidden="true">●</span>' +
      '<span class="marshmallow-sprinkle sprinkle-3" aria-hidden="true">✦</span>' +
      '<span class="marshmallow-sprinkle sprinkle-4" aria-hidden="true">●</span>',
    labelSuffixHtml: '<span class="marshmallow-badge-swirl" aria-hidden="true"></span>',
  }),
  renderCss(): string {
    return `
/* === Answer Card: Pastel Marshmallow (ADR-003) === */
.ac-pastel-marshmallow {
  position: relative;
  border: 4.5px solid #FFFFFF;
  border-radius: 9999px;
  background:
    linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 68%, rgba(255, 255, 255, 0.96) 84%, rgba(255, 248, 252, 0.92) 100%),
    var(--marshmallow-card-bg, linear-gradient(180deg, #FFFFFF 0%, #FFF2F7 100%)),
    linear-gradient(180deg, transparent 75%, var(--bg-primary, #FFF0F8) 90%, var(--bg-secondary, #F3E8FF) 100%);
  box-shadow:
    0 7px 0 var(--marshmallow-shadow, rgba(214, 185, 208, 0.65)),
    0 14px 28px rgba(90, 45, 80, 0.12),
    0 2px 4px rgba(0, 0, 0, 0.04),
    inset 0 3px 0 #FFFFFF,
    inset 0 -3px 0 rgba(244, 114, 182, 0.18);
  contain: layout style;
}

/* Authentic Marshmallow Confection Flavors across Card Indexes */
.choice-card.skin-pastel_marshmallow:nth-child(1),
.skin-pastel_marshmallow:nth-child(1),
.choice-card:nth-child(1) .ac-pastel-marshmallow,
.ac-pastel-marshmallow.marshmallow-card-0 {
  --marshmallow-card-bg: linear-gradient(180deg, #FFFFFF 0%, #FFF5F9 65%, #FFE7F2 100%);
  --marshmallow-accent: #FF6584;
  --marshmallow-shadow: rgba(235, 175, 205, 0.65);
  --marshmallow-badge-grad: linear-gradient(180deg, #FF7FA5 0%, #F43F7E 52%, #D92662 100%);
  --marshmallow-badge-shadow: #A81D4C;
}

.choice-card.skin-pastel_marshmallow:nth-child(2),
.skin-pastel_marshmallow:nth-child(2),
.choice-card:nth-child(2) .ac-pastel-marshmallow,
.ac-pastel-marshmallow.marshmallow-card-1 {
  --marshmallow-card-bg: linear-gradient(180deg, #FFFFFF 0%, #F4F9FF 65%, #E3F2FD 100%);
  --marshmallow-accent: #38BDF8;
  --marshmallow-shadow: rgba(180, 210, 240, 0.65);
  --marshmallow-badge-grad: linear-gradient(180deg, #58D5FF 0%, #0284C7 52%, #0369A1 100%);
  --marshmallow-badge-shadow: #03527E;
}

.choice-card.skin-pastel_marshmallow:nth-child(3),
.skin-pastel_marshmallow:nth-child(3),
.choice-card:nth-child(3) .ac-pastel-marshmallow,
.ac-pastel-marshmallow.marshmallow-card-2 {
  --marshmallow-card-bg: linear-gradient(180deg, #FFFFFF 0%, #FFFEF5 65%, #FFF8D6 100%);
  --marshmallow-accent: #F59E0B;
  --marshmallow-shadow: rgba(235, 215, 175, 0.65);
  --marshmallow-badge-grad: linear-gradient(180deg, #FCD34D 0%, #F59E0B 52%, #D97706 100%);
  --marshmallow-badge-shadow: #A15502;
}

.choice-card.skin-pastel_marshmallow:nth-child(4),
.skin-pastel_marshmallow:nth-child(4),
.choice-card:nth-child(4) .ac-pastel-marshmallow,
.ac-pastel-marshmallow.marshmallow-card-3 {
  --marshmallow-card-bg: linear-gradient(180deg, #FFFFFF 0%, #FAF6FF 65%, #EFE8FF 100%);
  --marshmallow-accent: #A855F7;
  --marshmallow-shadow: rgba(215, 190, 240, 0.65);
  --marshmallow-badge-grad: linear-gradient(180deg, #D8B4FE 0%, #A855F7 52%, #7E22CE 100%);
  --marshmallow-badge-shadow: #5E14A1;
}

/* Marshmallow Candy Inner Glow (Top Powdered-Sugar Cushion Highlight) */
.ac-pastel-marshmallow .marshmallow-inner-glow {
  position: absolute;
  top: 3px;
  left: 14px;
  right: 14px;
  height: 48%;
  border-radius: 9999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.35) 60%, transparent 100%);
  pointer-events: none;
  opacity: 0.9;
  z-index: 2;
}

/* Playful Confection Sprinkles */
.ac-pastel-marshmallow .marshmallow-sprinkle {
  position: absolute;
  pointer-events: none;
  z-index: 3;
  line-height: 1;
  user-select: none;
  animation: ac-pastel-marshmallow-sprinkle-bob 3.2s ease-in-out infinite alternate;
}
.ac-pastel-marshmallow .sprinkle-1 {
  top: 9px;
  right: 24px;
  font-size: 15px;
  color: var(--bg-accent, #FF6584);
  opacity: 0.88;
  filter: drop-shadow(0 1px 2px rgba(255, 101, 132, 0.35));
  animation-delay: 0s;
}
.ac-pastel-marshmallow .sprinkle-2 {
  bottom: 9px;
  right: 50px;
  font-size: 8px;
  color: #A78BFA;
  opacity: 0.88;
  filter: drop-shadow(0 1px 2px rgba(167, 139, 250, 0.35));
  animation-delay: 0.8s;
}
.ac-pastel-marshmallow .sprinkle-3 {
  top: 11px;
  right: 76px;
  font-size: 11px;
  color: #FBBF24;
  opacity: 0.88;
  filter: drop-shadow(0 1px 2px rgba(251, 191, 36, 0.35));
  animation-delay: 1.6s;
}
.ac-pastel-marshmallow .sprinkle-4 {
  bottom: 11px;
  right: 102px;
  font-size: 7px;
  color: #38BDF8;
  opacity: 0.88;
  filter: drop-shadow(0 1px 2px rgba(56, 189, 248, 0.35));
  animation-delay: 2.4s;
}

/* Circular Marshmallow Macaron Badge (Letter A, B, C, D) */
.ac-pastel-marshmallow > b,
.ac-pastel-marshmallow .choice-label,
.skin-pastel_marshmallow .choice-label,
.choice-card.skin-pastel_marshmallow .choice-label {
  border: 4.5px solid #FFFFFF;
  border-radius: 50%;
  background: var(--marshmallow-badge-grad, var(--choice-badge-grad, linear-gradient(180deg, var(--bg-accent, #F472B6) 0%, #EC4899 50%, #DB2777 100%)));
  color: #FFFFFF;
  box-shadow:
    0 8px 0 var(--marshmallow-badge-shadow, rgba(160, 50, 110, 0.32)),
    0 12px 24px rgba(25, 15, 35, 0.2),
    inset 0 3px 0 rgba(255, 255, 255, 0.92),
    inset 0 -4px 0 rgba(0, 0, 0, 0.16);
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", sans-serif;
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 3px 0 var(--marshmallow-badge-shadow, rgba(0, 0, 0, 0.2)), 0 2px 4px rgba(0, 0, 0, 0.25);
  overflow: visible;
}

/* Pure Visual Straddling Badge Centering & Reveal */
.choice-card-visual.choice-pure-visual.skin-pastel_marshmallow .choice-badge-pure,
.choice-card-visual.choice-pure-visual.skin-pastel_marshmallow .choice-label,
.layout-visual_choices_three_pure .choice-card.skin-pastel_marshmallow .choice-badge-pure,
.layout-visual_choices_three_pure .choice-card.skin-pastel_marshmallow .choice-label {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.choice-card-visual.choice-pure-visual.answer-reveal-correct.skin-pastel_marshmallow .choice-badge-pure,
.choice-card-visual.choice-pure-visual.answer-reveal-correct.skin-pastel_marshmallow .choice-label,
.layout-visual_choices_three_pure .choice-card.answer-reveal-correct.skin-pastel_marshmallow .choice-badge-pure,
.layout-visual_choices_three_pure .choice-card.answer-reveal-correct.skin-pastel_marshmallow .choice-label {
  animation: ac-pastel-marshmallow-pure-badge-jiggle 0.62s cubic-bezier(0.34, 1.56, 0.64, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
}

.choice-card-visual.choice-pure-visual.answer-correct.skin-pastel_marshmallow .choice-badge-pure,
.choice-card-visual.choice-pure-visual.answer-correct.skin-pastel_marshmallow .choice-label,
.layout-visual_choices_three_pure .choice-card.answer-correct.skin-pastel_marshmallow .choice-badge-pure,
.layout-visual_choices_three_pure .choice-card.answer-correct.skin-pastel_marshmallow .choice-label {
  transform: translateX(-50%) scale(1.1);
  background: linear-gradient(180deg, #4ADE80 0%, #22C55E 50%, #16A34A 100%);
  border-color: #FFFFFF;
  box-shadow:
    0 0 0 2px #22C55E,
    0 8px 0 #15803D,
    0 10px 24px rgba(34, 197, 94, 0.5),
    inset 0 3px 0 rgba(255, 255, 255, 0.9),
    inset 0 -4px 0 rgba(21, 128, 61, 0.4);
}

/* 3D Glossy Marshmallow Arc Shine */
.ac-pastel-marshmallow > b::after,
.ac-pastel-marshmallow .choice-label::after,
.skin-pastel_marshmallow .choice-label::after,
.choice-card.skin-pastel_marshmallow .choice-label::after {
  display: block;
  content: "";
  position: absolute;
  top: 4px;
  left: 14%;
  width: 72%;
  height: 44%;
  border-radius: 50% 50% 36% 36%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.28) 65%, transparent 100%);
  pointer-events: none;
  z-index: 5;
}

/* Confectionery Sugar Swirl Ring on Badge */
.ac-pastel-marshmallow .marshmallow-badge-swirl,
.skin-pastel_marshmallow .choice-label .marshmallow-badge-swirl,
.choice-card.skin-pastel_marshmallow .choice-label .marshmallow-badge-swirl {
  display: block;
  position: absolute;
  inset: 1px;
  border-radius: 50%;
  border: 2px dashed rgba(255, 255, 255, 0.55);
  pointer-events: none;
  z-index: 4;
  animation: ac-pastel-marshmallow-swirl 16s linear infinite;
}

/* Crisp, Ultra-Legible Answer Text */
.ac-pastel-marshmallow span,
.ac-pastel-marshmallow .choice-text {
  position: relative;
  z-index: 4;
  color: #1E1B4B;
  font-family: "Fredoka", "Nunito", "SVN-Hello Headline", "Baloo 2", sans-serif;
  font-weight: 800;
  letter-spacing: -0.2px;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.85);
}

/* === Reveal State: Correct Answer (Sweet Mint Jelly Win & Marshmallow Bounce) === */
.ac-pastel-marshmallow.answer-correct,
.ac-pastel-marshmallow.is-correct,
.choice-card.answer-correct .ac-pastel-marshmallow,
.choice-card.is-correct .ac-pastel-marshmallow,
.visual-answer-card.answer-correct .ac-pastel-marshmallow,
.visual-answer-card.is-correct .ac-pastel-marshmallow {
  border-color: #4ADE80;
  background: linear-gradient(180deg, #FFFFFF 0%, #F0FDF4 45%, #DCFCE7 100%);
  box-shadow:
    0 0 0 3px #22C55E,
    0 9px 0 #15803D,
    0 16px 36px rgba(34, 197, 94, 0.4),
    0 0 32px rgba(74, 222, 128, 0.6),
    inset 0 3px 0 #FFFFFF;
  animation: ac-pastel-marshmallow-win 0.62s cubic-bezier(0.34, 1.56, 0.64, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  z-index: 6;
}

.ac-pastel-marshmallow.answer-reveal-correct,
.choice-card.answer-reveal-correct .ac-pastel-marshmallow,
.visual-answer-card.answer-reveal-correct .ac-pastel-marshmallow {
  animation: ac-pastel-marshmallow-win 0.62s cubic-bezier(0.34, 1.56, 0.64, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
}

/* Badge victory bounce */
.ac-pastel-marshmallow.answer-correct > b,
.ac-pastel-marshmallow.answer-correct .choice-label,
.ac-pastel-marshmallow.is-correct > b,
.ac-pastel-marshmallow.is-correct .choice-label,
.choice-card.answer-correct .ac-pastel-marshmallow > b,
.choice-card.answer-correct .ac-pastel-marshmallow .choice-label,
.choice-card.is-correct .ac-pastel-marshmallow > b,
.choice-card.is-correct .ac-pastel-marshmallow .choice-label,
.visual-answer-card.answer-correct .ac-pastel-marshmallow > b,
.visual-answer-card.answer-correct .ac-pastel-marshmallow .choice-label,
.visual-answer-card.is-correct .ac-pastel-marshmallow > b,
.visual-answer-card.is-correct .ac-pastel-marshmallow .choice-label,
.choice-card.answer-correct.skin-pastel_marshmallow .choice-label,
.visual-answer-card.answer-correct.skin-pastel_marshmallow .choice-label {
  background: linear-gradient(180deg, #4ADE80 0%, #22C55E 50%, #16A34A 100%);
  border-color: #FFFFFF;
  box-shadow:
    0 0 0 2px #22C55E,
    0 8px 0 #15803D,
    0 10px 24px rgba(34, 197, 94, 0.5),
    inset 0 3px 0 rgba(255, 255, 255, 0.9),
    inset 0 -4px 0 rgba(21, 128, 61, 0.4);
  text-shadow: 0 2px 4px rgba(21, 128, 61, 0.5);
  animation: ac-pastel-marshmallow-badge-jiggle 0.62s cubic-bezier(0.34, 1.56, 0.64, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.ac-pastel-marshmallow.answer-reveal-correct > b,
.ac-pastel-marshmallow.answer-reveal-correct .choice-label,
.choice-card.answer-reveal-correct .ac-pastel-marshmallow > b,
.choice-card.answer-reveal-correct .ac-pastel-marshmallow .choice-label,
.visual-answer-card.answer-reveal-correct .ac-pastel-marshmallow > b,
.visual-answer-card.answer-reveal-correct .ac-pastel-marshmallow .choice-label,
.choice-card.answer-reveal-correct.skin-pastel_marshmallow .choice-label,
.visual-answer-card.answer-reveal-correct.skin-pastel_marshmallow .choice-label {
  animation: ac-pastel-marshmallow-badge-jiggle 0.62s cubic-bezier(0.34, 1.56, 0.64, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform;
}

/* High contrast readable text */
.ac-pastel-marshmallow.answer-correct .choice-text,
.ac-pastel-marshmallow.is-correct .choice-text,
.choice-card.answer-correct .ac-pastel-marshmallow .choice-text,
.choice-card.is-correct .ac-pastel-marshmallow .choice-text,
.visual-answer-card.answer-correct .ac-pastel-marshmallow .choice-text,
.visual-answer-card.is-correct .ac-pastel-marshmallow .choice-text {
  color: #064E3B;
  font-weight: 900;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8), 0 0 12px rgba(74, 222, 128, 0.4);
}

.ac-pastel-marshmallow.answer-reveal-correct .choice-text,
.choice-card.answer-reveal-correct .ac-pastel-marshmallow .choice-text,
.visual-answer-card.answer-reveal-correct .ac-pastel-marshmallow .choice-text {
  animation: ac-pastel-marshmallow-text-win 0.62s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

/* Visual choice option image candy border */
.skin-pastel_marshmallow.choice-card-visual.answer-correct .option-image,
.skin-pastel_marshmallow.choice-card-visual.is-correct .option-image {
  border-color: #4ADE80;
  box-shadow: 0 14px 32px rgba(34, 197, 94, 0.35);
}

.skin-pastel_marshmallow.choice-card-visual.answer-reveal-correct .option-image {
  animation: visual-choice-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--item-phase, 0s)) infinite alternate both,
             visual-correct-border 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: border-color, box-shadow, transform;
}

/* === Reveal State: Incorrect Answer (Clean Settle & Soft Deflate) === */
.ac-pastel-marshmallow.answer-incorrect,
.ac-pastel-marshmallow.is-wrong,
.choice-card.answer-incorrect .ac-pastel-marshmallow,
.choice-card.is-wrong .ac-pastel-marshmallow,
.visual-answer-card.answer-incorrect .ac-pastel-marshmallow,
.visual-answer-card.is-wrong .ac-pastel-marshmallow {
  opacity: 0.35;
  filter: grayscale(78%) contrast(0.95) brightness(0.92);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5);
  animation: ac-pastel-marshmallow-settle 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.ac-pastel-marshmallow.answer-reveal-incorrect,
.choice-card.answer-reveal-incorrect .ac-pastel-marshmallow,
.visual-answer-card.answer-reveal-incorrect .ac-pastel-marshmallow {
  animation: ac-pastel-marshmallow-settle 0.38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  will-change: transform, opacity, filter;
}

/* Keyframe Animations */
@keyframes ac-pastel-marshmallow-win {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-10px) scale(1.05); border-color: #4ADE80; box-shadow: 0 0 0 3px #22C55E, 0 16px 36px rgba(34, 197, 94, 0.4), 0 0 32px rgba(74, 222, 128, 0.6), inset 0 3px 0 #FFFFFF; background: linear-gradient(180deg, #FFFFFF 0%, #F0FDF4 45%, #DCFCE7 100%); }
  75% { transform: translateY(-2px) scale(1.01); }
  100% { transform: translateY(-5px) scale(1.03); border-color: #22C55E; box-shadow: 0 0 0 3px #22C55E, 0 10px 0 #15803D, 0 14px 32px rgba(34, 197, 94, 0.35), inset 0 3px 0 #FFFFFF; background: linear-gradient(180deg, #FFFFFF 0%, #F0FDF4 45%, #DCFCE7 100%); }
}

@keyframes ac-pastel-marshmallow-badge-jiggle {
  0% { transform: scale(1); }
  45% { transform: scale(1.24) rotate(4deg); background: linear-gradient(180deg, #4ADE80 0%, #22C55E 50%, #16A34A 100%); border-color: #FFFFFF; }
  70% { transform: scale(1.04) rotate(-2deg); }
  100% { transform: scale(1.1) rotate(0deg); background: linear-gradient(180deg, #4ADE80 0%, #22C55E 50%, #16A34A 100%); border-color: #FFFFFF; }
}

@keyframes ac-pastel-marshmallow-pure-badge-jiggle {
  0% { transform: translateX(-50%) scale(1); }
  45% { transform: translateX(-50%) scale(1.24) rotate(4deg); background: linear-gradient(180deg, #4ADE80 0%, #22C55E 50%, #16A34A 100%); border-color: #FFFFFF; }
  70% { transform: translateX(-50%) scale(1.04) rotate(-2deg); }
  100% { transform: translateX(-50%) scale(1.1) rotate(0deg); background: linear-gradient(180deg, #4ADE80 0%, #22C55E 50%, #16A34A 100%); border-color: #FFFFFF; }
}

@keyframes ac-pastel-marshmallow-settle {
  0% { opacity: 1; transform: scale(1); filter: grayscale(0%); }
  100% { opacity: 0.35; transform: scale(0.96); filter: grayscale(78%) contrast(0.95) brightness(0.92); }
}

@keyframes ac-pastel-marshmallow-text-win {
  0% { color: #1E1B4B; }
  100% { color: #064E3B; text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8), 0 0 12px rgba(74, 222, 128, 0.4); }
}

@keyframes ac-pastel-marshmallow-swirl {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes ac-pastel-marshmallow-sprinkle-bob {
  0% { transform: translateY(0) rotate(0deg); }
  100% { transform: translateY(-2px) rotate(8deg); }
}
`;
  },
};
