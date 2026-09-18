/**
 * Contender cards, split arena, VS badge, and typography for Split Versus Two layout.
 * Current runtime geometry:
 * - Columns: x = 380, 1102; width = 698; central gap = 24.
 * - Media: 698x446, border = 12, all 4 corners rounded 32px.
 * - Answer surface: 698x122 at y=709 (top in card: 456px, 10px gap below media).
 *   All 4 corners rounded 32px. No A/B badges, centered text.
 * - VS emblem: 124x124 box at canvas (1028, 414), center = (1090, 476) [local: left 648, top 161].
 * - Composite card envelope: 698x578. Arena height = 578.
 */
export function splitVersusTwoChoiceStyles(): string {
  return `
/* --- Versus Combat Arena: 2-Column Grid --- */
.candy-scene:not(.quiz-frame-unified).layout-split_versus_two .answer-grid,
.candy-scene:not(.quiz-frame-unified).layout-split_versus_two .visual-answer-grid {
  grid-area: answers;
  position: relative;
  width: 100%;
  max-width: 1360px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  box-sizing: border-box;
  align-items: stretch;
}

/* --- Unified Arena Styles --- */
.quiz-frame-unified.layout-split_versus_two .answer-grid,
.quiz-frame-unified.layout-split_versus_two .visual-answer-grid,
.quiz-frame-unified.layout-split_versus_two .choice-group {
  position: absolute;
  left: 0;
  top: 0;
  width: 1420px;
  height: 578px;
  max-height: 578px;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 698px 698px;
  gap: 24px;
  box-sizing: border-box;
  align-items: stretch;
}

.quiz-frame-unified.layout-split_versus_two .choice-card {
  position: relative;
  width: var(--slot-card-width, 698px);
  height: var(--slot-card-height, 578px);
  min-height: var(--slot-card-height, 578px);
  max-height: var(--slot-card-height, 578px);
  box-sizing: border-box;
  margin: 0;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.quiz-frame-unified.layout-split_versus_two .choice-media,
.quiz-frame-unified.layout-split_versus_two .option-image {
  position: relative;
  width: 100%;
  height: var(--slot-media-height, 446px);
  min-height: var(--slot-media-height, 446px);
  max-height: var(--slot-media-height, 446px);
  border: var(--slot-border-width, 12px) solid #FFFFFF;
  border-radius: 32px;
  overflow: hidden;
  box-sizing: border-box;
  box-shadow:
    0 16px 0 rgba(13, 35, 71, 0.22),
    0 24px 38px rgba(10, 25, 60, 0.20),
    0 0 24px rgba(255, 215, 0, 0.12),
    inset 0 3px 0 rgba(255, 255, 255, 0.85);
}

.quiz-frame-unified.layout-split_versus_two .choice-media img,
.quiz-frame-unified.layout-split_versus_two .option-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 20px;
}

/* Centered Text-Only Answer Surface: 10px gap below media, 4 rounded corners */
.quiz-frame-unified.layout-split_versus_two .choice-card-surface,
.quiz-frame-unified.layout-split_versus_two .visual-answer-label {
  position: relative;
  width: 100%;
  height: var(--choice-surface-height, 122px);
  min-height: var(--choice-surface-height, 122px);
  max-height: var(--choice-surface-height, 122px);
  margin-top: 10px;
  margin-left: 0 !important;
  border-radius: 32px;
  padding: var(--choice-surface-padding, 12px 24px);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: visible;
}

.quiz-frame-unified.layout-split_versus_two .choice-card .choice-text {
  text-align: center;
  width: 100%;
}

/* Text-Only Fallback Cards */
.quiz-frame-unified.layout-split_versus_two .choice-group-text .choice-card-text,
.quiz-frame-unified.layout-split_versus_two .choice-group-text .answer-card {
  width: 698px;
  height: 504px;
  min-height: 504px;
  max-height: 504px;
  box-sizing: border-box;
  padding: 32px 40px;
  margin: 0;
  border-radius: 36px;
}

/* --- High-Impact Glowing Arcade "VS" Emblem --- */
.layout-split_versus_two .answer-grid::after,
.layout-split_versus_two .visual-answer-grid::after,
.layout-split_versus_two .vs-badge {
  content: "VS";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-4deg);
  transform-origin: center center;
  width: 124px;
  height: 124px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-family: var(--font-display, "Titan One", "Fredoka", cursive, sans-serif);
  font-size: 54px;
  font-weight: 900;
  color: #FFFFFF;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #FF1361 0%, #FFA800 50%, #FFDD00 100%);
  border: 8px solid #FFFFFF;
  box-shadow:
    0 10px 0 rgba(13, 35, 71, 0.35),
    0 0 32px rgba(255, 19, 97, 0.8),
    0 0 54px rgba(255, 221, 0, 0.6),
    inset 0 4px 8px rgba(255, 255, 255, 0.85);
  text-shadow:
    0 4px 0 #8B0029,
    0 8px 18px rgba(0, 0, 0, 0.4);
  z-index: 10;
  margin: 0;
  pointer-events: none;
  box-sizing: border-box;
}

/* VS Emblem: 124x124 box at canvas (1028, 414), center = (1090, 476) */
.quiz-frame-unified.layout-split_versus_two .answer-grid::after,
.quiz-frame-unified.layout-split_versus_two .visual-answer-grid::after,
.quiz-frame-unified.layout-split_versus_two .vs-badge {
  left: 648px;
  top: 161px;
  width: 124px;
  height: 124px;
  transform: rotate(-4deg);
}

/* Layout Dimensional Tokens */
.layout-split_versus_two {
  --slot-media-height: 446px;
  --slot-card-height: 578px;
  --choice-card-min-height: 500px;
  --choice-card-height: 500px;
  --choice-card-margin-left: 0;
  --choice-media-height: var(--slot-media-height, 446px);
  --choice-badge-size: 116px;
  --choice-badge-margin-left: -58px;
  --choice-badge-font-size: 60px;
  --choice-surface-height: 122px;
  --choice-surface-padding: 12px 24px;
  --choice-font-size-base: 40px;
  --choice-font-size-medium: 32px;
  --choice-font-size-long: 25px;
  --choice-font-size-very_long: 21px;
  --choice-font-size-overflow: 20px;
  --choice-fit-min: 20px;
  --choice-fit-max: 56px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.1;
}

/* Player 1 (Crimson) vs Player 2 (Azure) Combat Accents */
.layout-split_versus_two .choice-card:nth-child(1) {
  --choice-stroke: #FF3366;
  --choice-stroke-shadow: #881337;
  --choice-depth-shadow: #8B1238;
  --choice-badge-grad: linear-gradient(180deg, #FF3366 0%, #D80036 100%);
  --choice-badge-border: #FFE4E6;
  --choice-bg-tint: linear-gradient(180deg, #FFFFFF 0%, #FFF1F2 100%);
  --choice-pattern: linear-gradient(115deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 42%);
  --choice-text-color: #881337;
  --choice-text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
}

.layout-split_versus_two .choice-card:nth-child(2) {
  --choice-stroke: #0284C7;
  --choice-stroke-shadow: #0369A1;
  --choice-depth-shadow: #0A3D80;
  --choice-badge-grad: linear-gradient(180deg, #00A3FF 0%, #0066CC 100%);
  --choice-badge-border: #E0F2FE;
  --choice-bg-tint: linear-gradient(180deg, #FFFFFF 0%, #F0F9FF 100%);
  --choice-pattern: linear-gradient(115deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0) 42%);
  --choice-text-color: #075985;
  --choice-text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
}
`;
}
