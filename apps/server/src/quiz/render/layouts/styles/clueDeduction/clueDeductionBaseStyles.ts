/**
 * Returns the CSS custom properties, 3-row grid architecture, question title,
 * stage wrapper, and backdrop styles for the Clue Deduction layout.
 */
export function clueDeductionBaseStyles(): string {
  return `
/* ==========================================================================
   Clue Deduction Layout: High-Stakes Detective Stage (Candy Arcade v2)
   16:9 Landscape Optimized (1920x1080)
   ========================================================================== */

.layout-clue_deduction {
  --clue-stage-width: 1180px;
  --clue-stage-height: 560px;
  --choice-card-min-height: 76px;
  --choice-card-height: 76px;
  --choice-card-margin-left: 0px;
  --choice-card-padding: 10px 24px;
  --choice-badge-size: 48px;
  --choice-badge-margin-left: 0px;
  --choice-badge-font-size: 26px;
  --choice-font-size-base: 36px;
  --choice-font-size-medium: 32px;
  --choice-font-size-long: 28px;
  --choice-font-size-very_long: 24px;
  --choice-font-size-overflow: 22px;
  --choice-fit-min: 20px;
  --choice-fit-max: 44px;
  --choice-fit-max-lines: 1;
  --choice-fit-leading: 1.1;
  --choice-fit-multiline-gain: 0px;
}

/* --- 3-Row Native CSS Grid Architecture (BUG-CD-03, BUG-CD-07 Fix) --- */
.layout-clue_deduction .game-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto auto;
  grid-template-areas:
    "title"
    "stage"
    "phase";
  align-items: center;
  justify-items: center;
  row-gap: 20px;
  width: var(--mascot-content-width, 1420px);
  max-width: 1420px;
  margin: 16px 40px 0 auto;
  min-height: 0;
}

/* --- Row 1: Question Title Card --- */
.layout-clue_deduction .question-title {
  grid-area: title;
  width: 100%;
  max-width: 1380px;
  margin: 0 auto;
  justify-self: center;
  text-align: center;
}

/* --- Row 2: Clue Deduction Stage Wrapper --- */
.layout-clue_deduction .clue-deduction-stage-wrapper {
  grid-area: stage;
  position: relative;
  width: 100%;
  max-width: 1180px;
  height: var(--clue-stage-height, 560px);
  margin: 0 auto;
  border-radius: 32px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65), 0 0 0 3.5px rgba(56, 189, 248, 0.28), inset 0 2px 4px rgba(255, 255, 255, 0.15);
  background: #080e1e;
  animation: clue-stage-enter 0.65s cubic-bezier(0.18, 1.4, 0.3, 1) var(--clip-start, 0s) both;
}

/* Detective Stage Backdrop: Vignette & Cyber Grid (BUG-CD-08) */
.layout-clue_deduction .clue-stage-backdrop {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(circle at 50% 40%, rgba(30, 58, 138, 0.42) 0%, rgba(15, 23, 42, 0.88) 60%, #020617 100%),
    repeating-linear-gradient(0deg, rgba(56, 189, 248, 0.02) 0px, rgba(56, 189, 248, 0.02) 1px, transparent 1px, transparent 40px),
    repeating-linear-gradient(90deg, rgba(56, 189, 248, 0.02) 0px, rgba(56, 189, 248, 0.02) 1px, transparent 1px, transparent 40px);
  box-shadow: inset 0 -36px 60px rgba(0, 0, 0, 0.6);
}
`;
}
