import type { MascotRenderAspectRatio } from "@studio/shared";

/**
 * Media Left Choices Right Layout - Base Arena & Geometry Styles.
 * Canonical geometry per specs/GEOMETRY.md:
 * - Hero: (380, 253, 720, 570), border=12, viewport 696x546.
 * - Choice Group: (1140, 253, 660, 570) [local: left 760, top 0].
 * - 3-Answer: rows at y=304, 472, 640; assembly 660x132; badge 132x132; text 566x108; gap 36; overlap 38.
 * - 2-Answer: rows at y=366, 558; assembly 660x152; badge 152x152; text 552x124; gap 40; overlap 44.
 */
export function mediaLeftChoicesRightBaseStyles(_aspectRatio?: MascotRenderAspectRatio): string {
  return `
/* === Media Left Choices Right Layout: Base & Geometry === */

/* Unified Quiz Frame Arena Geometry */
.quiz-frame-unified.layout-media_left_choices_right .hero-image {
  position: absolute;
  left: 0;
  top: 0;
  width: var(--slot-hero-width, 720px);
  height: var(--slot-hero-height, 570px);
  max-height: var(--slot-hero-height, 570px);
  margin: 0;
  border-radius: 38px;
  border: var(--slot-hero-border-width, 12px) solid #FFFFFF;
  box-shadow:
    0 16px 0 rgba(13, 35, 71, 0.22),
    0 24px 44px rgba(10, 25, 60, 0.24),
    0 0 32px rgba(255, 215, 0, 0.24),
    inset 0 4px 8px rgba(255, 255, 255, 0.5);
  overflow: hidden;
  box-sizing: border-box;
}

.quiz-frame-unified.layout-media_left_choices_right .hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 26px;
}

.quiz-frame-unified.layout-media_left_choices_right .answer-grid,
.quiz-frame-unified.layout-media_left_choices_right .choice-group {
  position: absolute;
  left: 760px;
  top: 0;
  width: 660px;
  height: 570px;
  max-height: 570px;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.quiz-frame-unified.layout-media_left_choices_right .choice-card,
.quiz-frame-unified.layout-media_left_choices_right .answer-card {
  width: 100%;
  box-sizing: border-box;
}

/* 2-Answer Variant: tops 366/558, assembly 660x152, gap 40 */
.quiz-frame-unified.layout-media_left_choices_right .answer-grid.answer-count-2,
.quiz-frame-unified.layout-media_left_choices_right .choice-group.answer-count-2 {
  gap: 40px;
}
.quiz-frame-unified.layout-media_left_choices_right .answer-grid.answer-count-2 .choice-card,
.quiz-frame-unified.layout-media_left_choices_right .choice-group.answer-count-2 .choice-card {
  height: 152px;
  min-height: 152px;
  max-height: 152px;
  --choice-card-height: 152px;
  --choice-card-min-height: 152px;
  --choice-badge-size: 152px;
  --choice-surface-height: 124px;
  --choice-badge-overlap: 44px;
  --choice-surface-padding: 10px 24px 10px 58px;
}

/* 3-Answer Variant (Default): tops 304/472/640, assembly 660x132, gap 36 */
.quiz-frame-unified.layout-media_left_choices_right .answer-grid.answer-count-3,
.quiz-frame-unified.layout-media_left_choices_right .choice-group.answer-count-3,
.quiz-frame-unified.layout-media_left_choices_right .answer-grid:not(.answer-count-2),
.quiz-frame-unified.layout-media_left_choices_right .choice-group:not(.answer-count-2) {
  gap: 36px;
}
.quiz-frame-unified.layout-media_left_choices_right .answer-grid.answer-count-3 .choice-card,
.quiz-frame-unified.layout-media_left_choices_right .choice-group.answer-count-3 .choice-card,
.quiz-frame-unified.layout-media_left_choices_right .answer-grid:not(.answer-count-2) .choice-card,
.quiz-frame-unified.layout-media_left_choices_right .choice-group:not(.answer-count-2) .choice-card {
  height: 132px;
  min-height: 132px;
  max-height: 132px;
  --choice-card-height: 132px;
  --choice-card-min-height: 132px;
  --choice-badge-size: 132px;
  --choice-surface-height: 108px;
  --choice-badge-overlap: 38px;
  --choice-surface-padding: 10px 24px 10px 56px;
}

/* Choice Design Tokens (16:9 Default) */
.layout-media_left_choices_right {
  --choice-card-min-height: 132px;
  --choice-card-height: auto;
  --choice-card-margin-left: 0px;
  --choice-card-padding: 10px 24px 10px 56px;
  --choice-surface-padding: 10px 24px 10px 56px;
  --choice-badge-size: 132px;
  --choice-badge-margin-left: 0px;
  --choice-badge-font-size: 56px;
  --choice-badge-overlap: 38px;
  --choice-surface-height: 108px;
  --choice-font-size-base: 44px;
  --choice-font-size-medium: 38px;
  --choice-font-size-long: 32px;
  --choice-font-size-very_long: 32px;
  --choice-font-size-overflow: 32px;
  --choice-fit-min: 32px;
  --choice-fit-max: 64px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
  --choice-fit-multiline-gain: 6px;
}
`;
}
