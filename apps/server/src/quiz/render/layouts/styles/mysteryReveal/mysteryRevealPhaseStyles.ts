/**
 * Returns the Row 3 phase region, thinking bar, and fact card containment
 * styles for the Mystery Reveal layout.
 */
export function mysteryRevealPhaseStyles(): string {
  return `
/* === Row 3: Phase Region (Integrated CSS Grid Flow - ZERO OVERLAP - BUG-MR-02 & BUG-MR-05 Fix) === */
.layout-mystery_reveal .phase-region {
  grid-area: phase;
  position: relative;
  left: auto;
  bottom: auto;
  width: 100%;
  max-width: 1360px;
  min-height: 96px;
  height: 110px;
  transform: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.layout-mystery_reveal .phase-region > .thinking-bar {
  position: relative;
  bottom: auto;
  left: auto;
  transform: none;
  width: min(75vw, 1100px);
  min-height: 84px;
  margin: 0 auto;
}

.layout-mystery_reveal .phase-region > .fact-card {
  position: relative;
  bottom: auto;
  left: auto;
  transform: none;
  width: min(1080px, 100%);
  margin: 0 auto;
}
`;
}
