/**
 * ADR-003 Base Choice Component CSS.
 *
 * Owns the stable internal structure, bounds, flex/grid alignment, and fallback capacity
 * of quiz answer choice groups, cards, badges, text, and media.
 * Does NOT set skin-specific decoration or outer layout geometry.
 */
export function baseChoiceStyles(): string {
  return `
/* === Base Choice Group & Cards (ADR-003) === */
.choice-group {
  position: relative;
  z-index: 3;
  display: grid;
  opacity: 0;
  animation: phase-enter .01s steps(1,end) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both;
  contain: layout style;
}

.choice-group-text,
.answer-grid {
  gap: var(--choice-grid-gap, 28px);
  width: var(--choice-grid-width, 1540px);
  margin-top: 28px;
}

.answer-count-2 {
  grid-template-columns: var(--choice-grid-columns, repeat(2, 1fr));
}

.answer-count-3 {
  grid-template-columns: var(--choice-grid-columns, repeat(3, 1fr));
}

.choice-card {
  position: relative;
  z-index: 3;
  contain: layout style;
  will-change: transform;
  transform: translate3d(0,0,0);
  backface-visibility: hidden;
}

.choice-card-text,
.answer-card {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  min-height: 122px;
  min-height: var(--choice-card-min-height, 122px);
  height: var(--choice-card-height, auto);
  gap: var(--choice-card-gap, 20px);
  margin-left: 76px;
  margin-left: var(--choice-card-margin-left, 76px);
  padding: 14px 36px 14px 40px;
  padding: var(--choice-card-padding, 14px 36px 14px 40px);
  overflow: visible;
  font-weight: 900;
  contain: layout style;
  will-change: transform;
  transform: translate3d(0,0,0);
  backface-visibility: hidden;
}

.choice-label,
.answer-card > b,
.visual-answer-label > b {
  position: relative;
  z-index: 4;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 156px;
  width: var(--choice-badge-size, 156px);
  height: 156px;
  height: var(--choice-badge-size, 156px);
  margin-left: -86px;
  margin-left: var(--choice-badge-margin-left, -86px);
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-size: 80px;
  font-size: var(--choice-badge-font-size, 80px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.5px;
  contain: layout style;
  will-change: transform;
  transform: translate3d(0,0,0);
}

.choice-text,
.answer-card span,
.visual-answer-label span {
  position: relative;
  z-index: 4;
  flex: 1 1 auto;
  min-width: 0;
  padding-right: var(--choice-text-padding-right, 48px);
  line-height: 1.15;
  font-weight: 900;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.choice-group-visual,
.visual-answer-grid {
  gap: var(--choice-grid-gap, 28px);
  width: var(--choice-grid-width, 1560px);
  margin-top: 28px;
  grid-template-columns: var(--choice-grid-columns, repeat(3, 1fr));
}

.choice-card-visual,
.visual-answer-card {
  position: relative;
  z-index: 3;
  contain: layout style;
  will-change: transform;
  transform: translate3d(0,0,0);
  backface-visibility: hidden;
}

.choice-media,
.image-card,
.option-image {
  position: relative;
  z-index: 3;
  display: block;
  margin: 0;
  overflow: hidden;
  width: 100%;
  height: var(--choice-media-height, 500px);
  contain: layout paint;
  transform: translate3d(0,0,0);
  will-change: transform;
  backface-visibility: hidden;
  animation: visual-choice-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--item-phase, 0s)) infinite alternate both;
}

.choice-media img,
.option-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.choice-media .image-shine {
  position: absolute;
  z-index: 4;
  inset: 0;
  pointer-events: none;
}

.answer-card img {
  position: relative;
  z-index: 4;
  width: 68px;
  height: 68px;
  border-radius: 20px;
  object-fit: cover;
  animation: answer-float var(--scene-duration) ease-in-out calc(var(--clip-start, 0s) + var(--item-phase, 0s)) 1 alternate both;
  will-change: transform;
}

.visual-answer-label {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: var(--choice-label-gap, 16px);
  min-height: 76px;
  min-height: var(--choice-label-min-height, 76px);
  margin: -36px 18px 0 38px;
  padding: 8px 24px 8px 18px;
  padding: var(--choice-label-padding, 8px 24px 8px 18px);
  overflow: visible;
  font-weight: 900;
  contain: layout style;
  will-change: transform;
  transform: translate3d(0,0,0);
}

.visual-answer-card .visual-answer-label > b {
  width: 108px;
  width: var(--choice-badge-size, 108px);
  height: 108px;
  height: var(--choice-badge-size, 108px);
  margin-left: -56px;
  margin-left: var(--choice-badge-margin-left, -56px);
  font-size: 56px;
  font-size: var(--choice-badge-font-size, 56px);
}

/* Default per-choice gradient token values (Arcade theme defaults) */
.choice-card:nth-child(1), .answer-card:nth-child(1), .visual-answer-card:nth-child(1) {
  --choice-stroke: #FFFFFF;
  --choice-stroke-shadow: #9A3412;
  --choice-depth-shadow: #E09000;
  --choice-badge-grad: linear-gradient(180deg, #FFB800 0%, #FF6D00 100%);
  --choice-badge-border: #FFFFFF;
  --choice-bg-tint: linear-gradient(180deg, #FFDF40 0%, #FFB800 100%);
  --choice-pattern: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='32' viewBox='0 0 64 32'%3E%3Cpath d='M0 16 Q 16 6 32 16 T 64 16' fill='none' stroke='%23FFFFFF' stroke-opacity='0.12' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E");
  --choice-text-color: #78350F;
  --choice-text-shadow: 0 1px 0 rgba(255,255,255,0.75);
}

.choice-card:nth-child(2), .answer-card:nth-child(2), .visual-answer-card:nth-child(2) {
  --choice-stroke: #FFFFFF;
  --choice-stroke-shadow: #881337;
  --choice-depth-shadow: #CC2556;
  --choice-badge-grad: linear-gradient(180deg, #FF4572 0%, #D80036 100%);
  --choice-badge-border: #FFFFFF;
  --choice-bg-tint: linear-gradient(180deg, #FF80A6 0%, #FF4D7E 100%);
  --choice-pattern: repeating-linear-gradient(-45deg, transparent, transparent 16px, rgba(255,255,255,0.09) 16px, rgba(255,255,255,0.09) 32px);
  --choice-text-color: #831843;
  --choice-text-shadow: 0 1px 0 rgba(255,255,255,0.75);
}

.choice-card:nth-child(3), .answer-card:nth-child(3), .visual-answer-card:nth-child(3) {
  --choice-stroke: #FFFFFF;
  --choice-stroke-shadow: #034E7B;
  --choice-depth-shadow: #007ECC;
  --choice-badge-grad: linear-gradient(180deg, #2E93FF 0%, #0062E6 100%);
  --choice-badge-border: #FFFFFF;
  --choice-bg-tint: linear-gradient(180deg, #66D1FF 0%, #29B2FF 100%);
  --choice-pattern: radial-gradient(circle, rgba(255,255,255,0.12) 28%, transparent 29%);
  --choice-text-color: #0C4A6E;
  --choice-text-shadow: 0 1px 0 rgba(255,255,255,0.75);
}
`;
}
