/**
 * Returns the Row 3 dedicated phase region, thinking bar, and fact card
 * containment styles for the Clue Deduction layout.
 */
export function clueDeductionPhaseStyles(): string {
  return `
/* --- Row 3: Dedicated Phase Region (BUG-CD-03 & BUG-CD-04 Fix) --- */
.layout-clue_deduction .phase-region {
  grid-area: phase;
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  width: 100%;
  max-width: 1360px;
  min-height: 96px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

/* Thinking Bar: Sized to 1180px to eliminate Star Marker Overflow (BUG-CD-04 Fix) */
.layout-clue_deduction .phase-region > .thinking-bar {
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  width: min(72vw, 1180px);
  min-height: 84px;
  margin: 0 auto;
}

/* Fact Card: Dedicated Row 3 containment with ZERO stage overlap */
.layout-clue_deduction .phase-region > .fact-card {
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  max-width: 1180px;
  width: min(1180px, 100%);
  margin: 0 auto;
}
`;
}
