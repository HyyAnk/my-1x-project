import type { MascotRenderAspectRatio } from "@studio/shared";

/**
 * 3-row grid, hero image viewport, choice group geometry, dimensional tokens, and portrait fallback for Verdict True/False.
 * Canonical geometry per specs/GEOMETRY.md:
 * - Hero: (380, 253, 820, 565), border = 10, viewport 800x545.
 * - Group: left 860, top 0, width 560, height 565, gap 44, centered vertically.
 * - True at y=349.5, False at y=557.5, shared vertical center with hero = 535.5.
 * - Arena height = 565.
 */
export function verdictTrueFalseBaseStyles(aspectRatio?: MascotRenderAspectRatio): string {
  return `
/* === Verdict True/False Layout (16:9 Landscape Video, 1920x1080) === */

/* Unified Quiz Frame Arena Geometry */
.quiz-frame-unified.layout-verdict_true_false .hero-image {
  position: absolute;
  left: 0;
  top: 0;
  width: var(--slot-hero-width, 820px);
  height: var(--slot-hero-height, 565px);
  max-height: var(--slot-hero-height, 565px);
  margin: 0;
  border-radius: 38px;
  border: var(--slot-hero-border-width, 10px) solid #FFFFFF;
  box-shadow:
    0 16px 0 rgba(13, 35, 71, 0.22),
    0 24px 44px rgba(10, 25, 60, 0.24),
    0 0 32px rgba(255, 215, 0, 0.24),
    inset 0 4px 8px rgba(255, 255, 255, 0.5);
  overflow: hidden;
  box-sizing: border-box;
}

.quiz-frame-unified.layout-verdict_true_false .hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 26px;
}

/* Verdict Choices Grid: 2 Oversized Physical Buttons Centered Vertically */
.quiz-frame-unified.layout-verdict_true_false .answer-grid,
.quiz-frame-unified.layout-verdict_true_false .choice-group {
  position: absolute;
  left: 860px;
  top: 0;
  width: 560px;
  height: 565px;
  max-height: 565px;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 44px;
}

.quiz-frame-unified.layout-verdict_true_false .choice-card,
.quiz-frame-unified.layout-verdict_true_false .answer-card {
  width: 560px;
  height: 164px;
  min-height: 164px;
  max-height: 164px;
  margin: 0;
  box-sizing: border-box;
  --choice-card-height: 164px;
  --choice-card-min-height: 164px;
}

.layout-verdict_true_false {
  --slot-hero-width: 820px;
  --slot-hero-height: 565px;
  --choice-card-min-height: 164px;
  --choice-card-height: 164px;
  --choice-card-margin-left: 0px;
  --choice-surface-height: 164px;
  --choice-card-padding: 16px 42px 16px 48px;
  --choice-badge-size: 112px;
  --choice-badge-margin-left: 0px;
  --choice-badge-font-size: 64px;
  --choice-font-size-base: 48px;
  --choice-font-size-medium: 40px;
  --choice-font-size-long: 32px;
  --choice-font-size-very_long: 32px;
  --choice-font-size-overflow: 32px;
  --choice-fit-min: 32px;
  --choice-fit-max: 48px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
  --choice-fit-multiline-gain: 6px;
}

/* Portrait 9:16 Safe-Zone Responsive Layout */
${
  aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .layout-verdict_true_false .game-stage {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "title"
    "hero"
    "answers"
    "phase";
  width: calc(100% - 72px);
  max-width: 960px;
  min-height: 0;
  margin: 184px auto 0;
  row-gap: 20px;
}
#stage[data-aspect-ratio="9:16"] .layout-verdict_true_false .question-title {
  width: 100%;
  max-width: min(860px, calc(100% - 140px));
  margin: 0 auto;
}
`
    : ""
}
`;
}
