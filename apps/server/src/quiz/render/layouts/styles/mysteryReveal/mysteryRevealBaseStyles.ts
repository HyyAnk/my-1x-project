/**
 * Returns the CSS custom properties, 3-row grid architecture, question title,
 * mystery stage viewport, and cosmic backdrop styles for the Mystery Reveal
 * layout.
 */
export function mysteryRevealBaseStyles(): string {
  return `
/* ==========================================================================
   Mystery Reveal: Studio Stage with Dual-State Mosaic & Scanner Reveal
   16:9 Landscape Optimized (1920x1080) - Candy Arcade v2
   ========================================================================== */

.layout-mystery_reveal {
  --mystery-stage-width: 1100px;
  --mystery-stage-height: 590px;
  --choice-card-min-height: 84px;
  --choice-card-height: auto;
  --choice-card-margin-left: 0px;
  --choice-card-padding: 14px 32px;
  --choice-badge-size: 0px;
  --choice-badge-margin-left: 0px;
  --choice-badge-font-size: 0px;
  --choice-font-size-base: 48px;
  --choice-font-size-medium: 42px;
  --choice-font-size-long: 34px;
  --choice-font-size-very_long: 28px;
  --choice-font-size-overflow: 26px;
  --choice-fit-min: 24px;
  --choice-fit-max: 64px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.12;
  --choice-fit-multiline-gain: 4px;
}

/* --- 3-Row Explicit CSS Grid (Eliminates Phase 5 Fact Card Overlap - BUG-MR-02) --- */
.candy-scene:not(.quiz-frame-unified).layout-mystery_reveal .game-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto auto;
  grid-template-areas:
    "title"
    "stage"
    "phase";
  align-items: center;
  justify-items: center;
  row-gap: 16px;
  width: 1420px;
  max-width: 1420px;
  min-height: 945px;
  margin: 12px 40px 0 auto;
}

.candy-scene:not(.quiz-frame-unified).layout-mystery_reveal .question-title {
  grid-area: title;
  width: 100%;
  max-width: 1380px;
  text-align: center;
  margin: 0 auto;
}

/* --- Mystery Stage Viewport --- */
.candy-scene:not(.quiz-frame-unified).layout-mystery_reveal .mystery-stage-wrapper {
  grid-area: stage;
  position: relative;
  width: 100%;
  max-width: var(--mystery-stage-width, 1100px);
  height: var(--mystery-stage-height, 590px);
  margin: 0 auto;
  border-radius: 32px;
  overflow: hidden;
  border: 5px solid rgba(251, 191, 36, 0.4);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55), 0 0 40px rgba(56, 189, 248, 0.18), inset 0 2px 4px rgba(255, 255, 255, 0.2);
  background: #090d1a;
  contain: layout paint;
}

/* Unified Mystery Stage Viewport: (630, 253, 920, 360) -> local (250, 0, 920, 360) */
.quiz-frame-unified.layout-mystery_reveal .mystery-stage-wrapper {
  position: absolute;
  left: 250px;
  top: 0;
  width: 920px;
  height: 360px;
  max-width: 920px;
  margin: 0;
  border-radius: 28px;
  overflow: hidden;
  border: 4px solid rgba(251, 191, 36, 0.4);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55), 0 0 32px rgba(56, 189, 248, 0.18);
  background: #090d1a;
  contain: layout paint;
}

/* Cosmic Arcade Mystery Stage Backdrop (BUG-MR-10 Upgrade) */
.layout-mystery_reveal .mystery-stage-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  background: radial-gradient(circle at 50% 42%, #1e1b4b 0%, #0f172a 62%, #020617 100%);
  box-shadow: inset 0 -48px 72px rgba(0, 0, 0, 0.6), inset 0 0 60px rgba(56, 189, 248, 0.12);
}

.layout-mystery_reveal .mystery-stage-backdrop::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
  background-size: 28px 28px;
  opacity: 0.35;
  pointer-events: none;
}
`;
}
