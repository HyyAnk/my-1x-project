import type { MascotRenderAspectRatio } from "@studio/shared";

/**
 * 3-row grid, stage container, centered title box, phase region, and portrait fallback for Visual Choices Three Pure.
 */
export function visualChoicesThreePureBaseStyles(aspectRatio?: MascotRenderAspectRatio): string {
  return `
/* ==========================================================================
   LAYOUT: visual_choices_three_pure (16:9 Landscape Video - 1920x1080)
   Candy Arcade Quiz Engine - 3 Pure Visual Cards (No Text Labels)
   ========================================================================== */

/* 1. Stage Container & 3-Row CSS Grid */
.candy-scene:not(.quiz-frame-unified).layout-visual_choices_three_pure .game-stage {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "title"
    "answers"
    "phase";
  grid-template-rows: 168px auto 110px;
  align-items: start;
  justify-items: center;
  width: 1420px;
  max-width: 1420px;
  min-height: 945px;
  margin: 12px 40px 0 auto;
  row-gap: 20px;
}

/* 2. Question Title Box: Perfectly centered above the 3 visual cards */
.candy-scene:not(.quiz-frame-unified).layout-visual_choices_three_pure .question-title {
  grid-area: title;
  width: 100%;
  max-width: 1380px;
  height: 168px;
  min-height: 168px;
  margin: 0 auto;
  justify-self: center;
}

/* 3. 3-Column Pure Visual Answer Grid */
.candy-scene:not(.quiz-frame-unified).layout-visual_choices_three_pure .visual-answer-grid {
  grid-area: answers;
  width: 1420px;
  max-width: 1420px;
  margin: 0 auto;
  gap: 24px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

/* ==========================================================================
   PHASE 3 & 5: PHASE REGION IN ROW 3 (100% ZERO-COLLISION GUARANTEE)
   ========================================================================== */
.candy-scene:not(.quiz-frame-unified).layout-visual_choices_three_pure .phase-region {
  grid-area: phase;
  position: relative;
  top: auto;
  bottom: auto;
  left: auto;
  right: auto;
  transform: none;
  width: 100%;
  max-width: 1360px;
  height: 110px;
  margin: 0 auto;
  padding: 0;
  z-index: 5;
  box-sizing: border-box;
}

.candy-scene:not(.quiz-frame-unified).layout-visual_choices_three_pure .phase-region > .thinking-bar {
  position: absolute;
  top: 50%;
  left: 50%;
  bottom: auto;
  transform: translate(-50%, -50%);
  width: min(80vw, 1240px);
  min-height: 84px;
}

.candy-scene:not(.quiz-frame-unified).layout-visual_choices_three_pure .phase-region > .fact-card {
  position: absolute;
  top: 50%;
  left: 50%;
  bottom: auto;
  transform: translate(-50%, -50%);
  width: min(1140px, 100%);
  max-width: 1140px;
  margin: 0 auto;
}

/* Portrait 9:16 Safe-Zone Responsive Layout */
${
  aspectRatio === "9:16"
    ? `
#stage[data-aspect-ratio="9:16"] .candy-scene.layout-visual_choices_three_pure .game-stage,
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .game-stage {
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
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .question-title {
  width: 100%;
  max-width: min(860px, calc(100% - 140px));
  margin: 0 auto;
}
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .visual-answer-grid,
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .choice-group {
  position: relative;
  left: auto;
  top: auto;
  width: min(860px, calc(100% - 140px));
  max-width: 860px;
  height: auto;
  max-height: none;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .choice-card-visual,
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .visual-answer-card {
  width: 100%;
  height: 280px;
  min-height: 280px;
  max-height: 280px;
  border-radius: 28px;
}
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .choice-media,
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .option-image {
  height: 280px;
  min-height: 280px;
  max-height: 280px;
  border-radius: 28px;
}
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .choice-badge-pure,
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .choice-label,
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .visual-answer-label {
  top: 12px;
  left: 12px;
  transform: none;
  width: 68px;
  height: 68px;
}
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .visual-answer-card .visual-answer-label > b,
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .visual-answer-card .choice-badge-pure,
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .visual-answer-label .choice-label,
#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three_pure .visual-answer-card .choice-label {
  width: 68px;
  height: 68px;
  font-size: 38px;
}
`
    : ""
}
`;
}
