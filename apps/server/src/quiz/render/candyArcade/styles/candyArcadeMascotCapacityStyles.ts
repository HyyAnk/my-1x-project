/**
 * Candy Arcade mascot container placement and occupancy capacity tokens (ADR-003).
 */

export function candyArcadeMascotCapacityStylesCss(): string {
  return `
.candy-mascot-container { position: absolute; width: 220px; height: 220px; z-index: var(--candy-layer-mascot); bottom: 18px; left: 32px; pointer-events: none; transform-origin: bottom center; transform: scale(var(--mascot-scale, 1)); }
.candy-mascot-container.anchor-bottom_left { bottom: 18px; left: 32px; }
.candy-mascot-container.anchor-bottom_right { bottom: 18px; left: 32px; }

/* Mascot Occupancy Capacity Tokens (ADR-003) */
.has-mascot { --mascot-content-width: 1420px; --question-card-width: 1440px; --question-card-left-edge: 360px; }
.has-mascot {
  --choice-grid-width: 100%;
  --choice-card-min-height: 114px;
  --choice-card-margin-left: 64px;
  --choice-card-padding: 12px 24px 12px 28px;
  --choice-card-gap: 14px;
  --choice-badge-size: 136px;
  --choice-badge-margin-left: -72px;
  --choice-badge-font-size: 70px;
  --choice-font-size-base: 36px;
  --choice-text-padding-right: 24px;
  --choice-font-size-medium: 28px;
  --choice-font-size-long: 23px;
  --choice-font-size-very_long: 19px;
  --choice-font-size-overflow: 19px;
  --choice-label-font-size-base: 26px;
  --choice-label-font-size-medium: 22px;
  --choice-label-font-size-long: 19px;
  --choice-label-font-size-very_long: 17px;
  --choice-label-font-size-overflow: 17px;
}
.has-mascot .answer-count-2 {
  --choice-font-size-base: 40px;
  --choice-font-size-medium: 32px;
  --choice-font-size-long: 26px;
  --choice-font-size-very_long: 21px;
  --choice-font-size-overflow: 21px;
}
.answer-count-2 {
  --choice-font-size-base: 40px;
  --choice-font-size-medium: 32px;
  --choice-font-size-long: 26px;
  --choice-font-size-very_long: 21px;
  --choice-font-size-overflow: 21px;
}

.has-mascot .game-stage { width: var(--mascot-content-width); margin-right: 40px; }
.has-mascot .question-title { width: var(--question-card-width); max-width: var(--question-card-width); }
.has-mascot .phase-region { left: 0; width: var(--question-card-width); transform: none; }
.has-mascot .phase-region > .thinking-bar, .has-mascot .phase-region > .fact-card { width: min(70vw, 1300px); left: 50%; }

.candy-mascot-container.mascot-intro { bottom: 40px; }
.candy-mascot-container.mascot-outro { bottom: 40px; }
.candy-mascot-container.mascot-intro.anchor-bottom_right, .candy-mascot-container.mascot-outro.anchor-bottom_right { right: 80px; }
.candy-mascot-container.mascot-intro.anchor-bottom_left, .candy-mascot-container.mascot-outro.anchor-bottom_left { left: 80px; }
`;
}
