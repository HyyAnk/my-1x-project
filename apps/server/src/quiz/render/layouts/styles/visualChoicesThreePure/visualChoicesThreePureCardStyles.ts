/**
 * Card geometry, straddling badges, and styling for Visual Choices Three Pure layout.
 * Canonical geometry per specs/GEOMETRY.md:
 * - Columns: x = 380, 864, 1348; width = 452; gap = 32.
 * - Media: 452x564, border = 10, viewport = 432x544.
 * - Bottom of media: canvas y = 817.
 * - Badges: 88x88 circular, centered at (columnCenter, 817).
 *   Top = 773 (local top: 520px), bottom = 861.
 * - Composite card envelope: 452x608. Arena height: 608.
 * - Rest-state clearance to fact at 886: 25px.
 */
export function visualChoicesThreePureCardStyles(): string {
  return `
/* --- Unified Arena Geometry: Visual Choices Three Pure --- */
.quiz-frame-unified.layout-visual_choices_three_pure .visual-answer-grid,
.quiz-frame-unified.layout-visual_choices_three_pure .choice-group {
  position: absolute;
  left: 0;
  top: 0;
  width: 1420px;
  height: 608px;
  max-width: 1420px;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 452px);
  gap: 32px;
  box-sizing: border-box;
}

.quiz-frame-unified.layout-visual_choices_three_pure .choice-card-visual,
.quiz-frame-unified.layout-visual_choices_three_pure .visual-answer-card {
  position: relative;
  width: var(--slot-card-width, 452px);
  height: var(--slot-card-height, 608px);
  min-height: var(--slot-card-height, 608px);
  max-height: var(--slot-card-height, 608px);
  box-sizing: border-box;
  overflow: visible;
}

.quiz-frame-unified.layout-visual_choices_three_pure .choice-media,
.quiz-frame-unified.layout-visual_choices_three_pure .option-image {
  position: relative;
  width: 100%;
  height: var(--slot-media-height, 564px);
  min-height: var(--slot-media-height, 564px);
  max-height: var(--slot-media-height, 564px);
  border: var(--slot-border-width, 10px) solid #FFFFFF;
  border-radius: 36px;
  overflow: hidden;
  box-sizing: border-box;
  background: #1e293b;
  box-shadow:
    0 16px 0 rgba(13, 35, 71, 0.22),
    0 24px 38px rgba(10, 25, 60, 0.20),
    0 0 24px rgba(255, 215, 0, 0.12),
    inset 0 3px 0 rgba(255, 255, 255, 0.85);
  transition: transform 0.3s ease, box-shadow 0.35s ease, border-color 0.35s ease;
}

.quiz-frame-unified.layout-visual_choices_three_pure .option-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  border-radius: 26px;
}

/* Straddling Circular Letter Badge centered at bottom edge (y=817) */
.layout-visual_choices_three_pure .choice-badge-pure,
.layout-visual_choices_three_pure .choice-pure-visual .choice-label,
.quiz-frame-unified.layout-visual_choices_three_pure .choice-badge-pure,
.quiz-frame-unified.layout-visual_choices_three_pure .choice-label {
  position: absolute;
  z-index: 6;
  left: 50%;
  transform: translateX(-50%);
  top: 520px;
  width: var(--choice-badge-size, 88px);
  height: var(--choice-badge-size, 88px);
  min-width: var(--choice-badge-size, 88px);
  border-radius: 50%;
  border: 4.5px solid #FFFFFF;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  font-family: var(--font-display, "Fredoka", "SVN-Hello Headline", "Baloo 2", sans-serif);
  font-size: var(--choice-badge-font-size, 52px);
  font-weight: 900;
  box-shadow: 0 8px 0 rgba(13, 35, 71, 0.25), 0 12px 20px rgba(0, 0, 0, 0.18);
  margin: 0;
  will-change: transform;
}

/* Capacity & Dimension Tokens */
.layout-visual_choices_three_pure {
  --slot-media-height: 564px;
  --slot-card-height: 608px;
  --choice-media-height: 564px;
  --choice-badge-size: 88px;
  --choice-badge-font-size: 52px;
}
`;
}
