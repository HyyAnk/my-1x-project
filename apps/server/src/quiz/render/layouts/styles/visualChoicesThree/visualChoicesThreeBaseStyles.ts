import type { MascotRenderAspectRatio } from "@studio/shared";

/**
 * Visual Choices Three Layout - Base Arena & Geometry Styles.
 * Current runtime geometry:
 * - Arena: (380, 253, 1420, 586).
 * - Columns: x = 380, 864, 1348; width = 452; gap = 32.
 * - Media: height 461, border 10, viewport 432x441, bottom = 714.
 * - Answer assembly: top = 735, height = 104, bottom = 839.
 * - Media-to-assembly gap: 21px.
 * - Badge: 104x104, font-size: 48px.
 * - Text surface: 378x86, at columnX+74, y=744, padding-left: 44px, overlap: 30px.
 */
export function visualChoicesThreeBaseStyles(_aspectRatio?: MascotRenderAspectRatio): string {
  return `
/* === Visual Choices Three Layout: Base & Geometry === */

/* Unified Quiz Frame Arena Geometry */
.quiz-frame-unified.layout-visual_choices_three .visual-answer-grid,
.quiz-frame-unified.layout-visual_choices_three .choice-group {
  position: absolute;
  left: 0;
  top: 0;
  width: 1420px;
  height: 586px;
  max-height: 586px;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 452px);
  gap: 32px;
  box-sizing: border-box;
}

.quiz-frame-unified.layout-visual_choices_three .choice-card-visual,
.quiz-frame-unified.layout-visual_choices_three .visual-answer-card {
  width: var(--slot-card-width, 452px);
  height: var(--slot-card-height, 586px);
  min-height: var(--slot-card-height, 586px);
  max-height: var(--slot-card-height, 586px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.quiz-frame-unified.layout-visual_choices_three .choice-media,
.quiz-frame-unified.layout-visual_choices_three .option-image {
  height: var(--slot-media-height, 461px);
  min-height: var(--slot-media-height, 461px);
  max-height: var(--slot-media-height, 461px);
  width: 100%;
  border: var(--slot-border-width, 10px) solid #FFFFFF;
  border-radius: 36px;
  overflow: hidden;
  box-sizing: border-box;
  box-shadow:
    0 16px 0 rgba(13, 35, 71, 0.22),
    0 24px 38px rgba(10, 25, 60, 0.20),
    0 0 24px rgba(255, 215, 0, 0.12),
    inset 0 3px 0 rgba(255, 255, 255, 0.85);
}

.quiz-frame-unified.layout-visual_choices_three .choice-media img,
.quiz-frame-unified.layout-visual_choices_three .option-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 26px;
}

/* Answer Assembly: 21px gap below media, height 104px */
.quiz-frame-unified.layout-visual_choices_three .visual-answer-assembly {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  width: 100%;
  height: var(--choice-assembly-height, 104px);
  min-height: var(--choice-assembly-height, 104px);
  max-height: var(--choice-assembly-height, 104px);
  margin-top: 21px;
  padding: 0;
  box-sizing: border-box;
  overflow: visible;
}

.quiz-frame-unified.layout-visual_choices_three .visual-answer-assembly .choice-label {
  position: relative;
  z-index: 5;
  flex: 0 0 auto;
  width: var(--choice-badge-size, 104px);
  height: var(--choice-badge-size, 104px);
  font-size: var(--choice-badge-font-size, 48px);
  border-radius: 50%;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  margin-left: 0;
}

.quiz-frame-unified.layout-visual_choices_three .visual-answer-assembly .choice-card-surface {
  position: relative;
  z-index: 4;
  flex: 1 1 auto;
  height: var(--choice-surface-height, 86px);
  min-height: var(--choice-surface-height, 86px);
  max-height: var(--choice-surface-height, 86px);
  border-radius: 24px;
  padding: var(--choice-surface-padding, 6px 20px);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  overflow: visible;
}

.quiz-frame-unified.layout-visual_choices_three .visual-answer-assembly .choice-label + .choice-card-surface {
  margin-left: calc(-1 * var(--choice-badge-overlap, 30px));
}

/* Backward-compatible label selector support */
.quiz-frame-unified.layout-visual_choices_three .visual-answer-label {
  height: var(--choice-surface-height, 86px);
}

/* Capacity & Sizing Custom Properties */
.layout-visual_choices_three {
  --choice-media-height: var(--slot-media-height, 356px);
  --slot-media-height: 461px;
  --slot-card-height: 586px;
  --choice-assembly-height: 104px;
  --choice-badge-size: 104px;
  --choice-label-min-height: 70px;
  --choice-label-font-size-base: 26px;
  --choice-badge-font-size: 48px;
  --choice-surface-height: 86px;
  --choice-badge-overlap: 30px;
  --choice-surface-padding: 6px 20px 6px 44px;
  --choice-fit-min: 16px;
  --choice-fit-max: 30px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
  --choice-fit-multiline-gain: 6px;
}

${
  _aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three .game-stage {
  grid-template-columns: 1fr;
  grid-template-areas: "title" "answers" "phase";
  row-gap: 24px;
}
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three .visual-answer-grid {
  width: 100%;
  grid-template-columns: 1fr;
  gap: 26px;
}
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three {
  --choice-media-height: 360px;
  --choice-label-min-height: 74px;
  --choice-badge-size: 104px;
  --choice-badge-margin-left: -54px;
  --choice-badge-font-size: 52px;
  --choice-fit-max: 42px;
}
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three .option-image {
  height: 320px;
}
`
    : ""
}
`;
}
