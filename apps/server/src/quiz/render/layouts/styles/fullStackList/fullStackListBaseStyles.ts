import type { MascotRenderAspectRatio } from "@studio/shared";

/**
 * Full Stack List Layout - Base Arena & Geometry Styles.
 * Canonical geometry per specs/GEOMETRY.md:
 * - Arena: (380, 253, 1420, 528).
 * - Choice Group: (450, 253, 1280, 528) [local: left 70].
 * - 3-Answer: A locked at y=275, B=458, C=641 (local tops: 22, 205, 388).
 *   Assembly 1280x140; badge 140x140; text 1180x116; gap 43; overlap 40.
 * - 2-Answer: A locked at y=329, B=548 (local tops: 76, 295).
 *   Assembly 1280x164; badge 164x164; text 1162x136; gap 55; overlap 46.
 */
export function fullStackListBaseStyles(_aspectRatio?: MascotRenderAspectRatio): string {
  return `
/* === Full Stack List Layout: Base & Geometry === */

/* Unified Quiz Frame Arena Geometry */
.quiz-frame-unified.layout-full_stack_list .answer-grid,
.quiz-frame-unified.layout-full_stack_list .choice-group {
  position: absolute;
  left: 70px;
  top: 0;
  width: 1280px;
  height: auto;
  max-height: 528px;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.quiz-frame-unified.layout-full_stack_list .choice-card,
.quiz-frame-unified.layout-full_stack_list .answer-card {
  width: 1280px;
  box-sizing: border-box;
}

/* 2-Answer Variant: A locked at y=329, B=548, assembly 1280x164, gap 55 */
.quiz-frame-unified.layout-full_stack_list .answer-grid.answer-count-2,
.quiz-frame-unified.layout-full_stack_list .choice-group.answer-count-2 {
  top: 76px;
  gap: 55px;
}
.quiz-frame-unified.layout-full_stack_list .answer-grid.answer-count-2 .choice-card,
.quiz-frame-unified.layout-full_stack_list .choice-group.answer-count-2 .choice-card {
  height: 164px;
  min-height: 164px;
  max-height: 164px;
  --choice-card-height: 164px;
  --choice-card-min-height: 164px;
  --choice-badge-size: 164px;
  --choice-badge-font-size: 64px;
  --choice-surface-height: 136px;
  --choice-badge-overlap: 46px;
  --choice-surface-padding: 10px 28px 10px 64px;
}

/* 3-Answer Variant (Default): A locked at y=275, B=458, C=641, assembly 1280x140, gap 43 */
.quiz-frame-unified.layout-full_stack_list .answer-grid.answer-count-3,
.quiz-frame-unified.layout-full_stack_list .choice-group.answer-count-3,
.quiz-frame-unified.layout-full_stack_list .answer-grid:not(.answer-count-2),
.quiz-frame-unified.layout-full_stack_list .choice-group:not(.answer-count-2) {
  top: 22px;
  gap: 43px;
}
.quiz-frame-unified.layout-full_stack_list .answer-grid.answer-count-3 .choice-card,
.quiz-frame-unified.layout-full_stack_list .choice-group.answer-count-3 .choice-card,
.quiz-frame-unified.layout-full_stack_list .answer-grid:not(.answer-count-2) .choice-card,
.quiz-frame-unified.layout-full_stack_list .choice-group:not(.answer-count-2) .choice-card {
  height: 140px;
  min-height: 140px;
  max-height: 140px;
  --choice-card-height: 140px;
  --choice-card-min-height: 140px;
  --choice-badge-size: 140px;
  --choice-badge-font-size: 64px;
  --choice-surface-height: 116px;
  --choice-badge-overlap: 40px;
  --choice-surface-padding: 10px 28px 10px 58px;
}

/* Choice Card Tokens */
.layout-full_stack_list {
  --choice-card-min-height: 140px;
  --choice-card-height: auto;
  --choice-card-margin-left: 0px;
  --choice-card-padding: 10px 28px 10px 58px;
  --choice-surface-padding: 10px 28px 10px 58px;
  --choice-text-padding-right: 48px;
  --choice-badge-size: 140px;
  --choice-badge-margin-left: 0px;
  --choice-badge-font-size: 64px;
  --choice-badge-overlap: 40px;
  --choice-surface-height: 116px;
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

/* Fallback Phase Region for non-unified scenes */
.candy-scene:not(.quiz-frame-unified).layout-full_stack_list .phase-region {
  grid-area: phase;
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  width: 100%;
  max-width: 1360px;
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  pointer-events: none;
}
.candy-scene:not(.quiz-frame-unified).layout-full_stack_list .phase-region > .thinking-bar {
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  width: min(80vw, 1220px);
  max-width: 100%;
  min-height: 84px;
  margin: 0 auto;
}
`;
}
