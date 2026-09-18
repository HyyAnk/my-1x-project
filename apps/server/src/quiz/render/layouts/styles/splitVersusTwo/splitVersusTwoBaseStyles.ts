import type { MascotRenderAspectRatio } from "@studio/shared";

/**
 * Stage geometry, title box, phase region, and portrait fallback for Split Versus Two layout.
 */
export function splitVersusTwoBaseStyles(aspectRatio?: MascotRenderAspectRatio): string {
  return `
/* ==========================================================================
   Split Versus Two Layout (16:9 Landscape Video, 1920×1080)
   ========================================================================== */

.candy-scene:not(.quiz-frame-unified).layout-split_versus_two .game-stage {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "title"
    "answers"
    "phase";
  align-items: start;
  justify-items: center;
  row-gap: 24px;
  width: 1420px;
  max-width: 1420px;
  margin: 12px 40px 0 auto;
}

.candy-scene:not(.quiz-frame-unified).layout-split_versus_two .question-title {
  grid-area: title;
  width: 100%;
  max-width: 1380px;
  margin: 0 auto;
  justify-self: center;
}

/* --- Phase 3 & 5: Embedded Phase Region & Flow --- */
.candy-scene:not(.quiz-frame-unified).layout-split_versus_two .phase-region {
  grid-area: phase;
  position: relative;
  z-index: 5;
  left: auto;
  bottom: auto;
  transform: none;
  width: 100%;
  max-width: 1360px;
  height: 90px;
  margin: 0 auto;
}

.candy-scene:not(.quiz-frame-unified).layout-split_versus_two .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(82vw, 1280px);
  min-height: 84px;
}

.candy-scene:not(.quiz-frame-unified).layout-split_versus_two .phase-region > .fact-card {
  position: absolute;
  top: -12px;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(1280px, 100%);
}

/* Portrait 9:16 Safe-Zone Responsive Layout */
${
  aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .candy-scene.layout-split_versus_two .game-stage,
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .game-stage {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "title"
    "answers"
    "phase";
  width: calc(100% - 72px);
  max-width: 960px;
  min-height: 0;
  margin: 184px auto 0;
  row-gap: 20px;
}
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .question-title {
  width: 100%;
  max-width: min(860px, calc(100% - 140px));
  margin: 0 auto;
}
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .answer-grid,
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .visual-answer-grid,
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .choice-group {
  position: relative;
  left: auto;
  top: auto;
  width: min(860px, calc(100% - 140px));
  max-width: 860px;
  height: auto;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .choice-card,
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .choice-card-text,
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .choice-group-text .choice-card-text,
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .answer-card {
  width: 100%;
  height: 220px;
  min-height: 220px;
  max-height: 220px;
  padding: 16px 28px;
  border-radius: 28px;
  --choice-card-height: 220px;
  --choice-card-min-height: 220px;
  --choice-badge-size: 88px;
  --choice-font-size-base: 36px;
}
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .choice-group-text .choice-label {
  width: 80px;
  height: 80px;
  font-size: 44px;
  margin-bottom: 8px;
}
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .choice-group-text .choice-text {
  font-size: 36px;
}
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .choice-card-visual,
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .visual-answer-card {
  width: 100%;
  height: 280px;
  min-height: 280px;
  max-height: 280px;
  border-radius: 28px;
}
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .choice-media,
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .option-image {
  height: 200px;
}
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .visual-answer-label {
  height: 76px;
  min-height: 76px;
  margin: -24px 12px 0 24px;
}
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .answer-grid::after,
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .visual-answer-grid::after,
#stage[data-aspect-ratio="9:16"] .layout-split_versus_two .vs-badge {
  left: calc(50% - 40px);
  top: calc(50% - 40px);
  width: 80px;
  height: 80px;
  font-size: 34px;
}
`
    : ""
}
`;
}
