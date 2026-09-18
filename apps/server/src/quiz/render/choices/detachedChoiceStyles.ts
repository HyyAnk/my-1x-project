/**
 * Detached Choice Primitives CSS.
 *
 * Implements the detached-badge and text-only presentation models from ADR-003 / specs/ANSWER-SURFACES.md:
 * - Transparent outer assembly with no borders, padding or background.
 * - Sibling circular letter badge with higher z-index (5).
 * - Painted text surface with border, shadow, background, and padding (z-index 4).
 * - Layout-scaled badge-to-surface overlap that visually fuses both parts.
 * - Text-only presentation without badge space reservation.
 */
export function detachedChoiceStyles(): string {
  return `
/* === Detached Answer Choice Primitives === */
.choice-card.choice-card-text.answer-card {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
  padding: 0;
  margin-left: 0;
  min-height: 0;
  overflow: visible;
  will-change: transform;
}

/* Outer assembly must remain transparent and unbordered across all reveal states */
.choice-card.answer-correct,
.choice-card.answer-reveal-correct,
.choice-card.answer-incorrect,
.choice-card.answer-reveal-incorrect,
.choice-card.choice-card-text.answer-card.answer-correct,
.choice-card.choice-card-text.answer-card.answer-reveal-correct,
.choice-card.choice-card-text.answer-card.answer-incorrect,
.choice-card.choice-card-text.answer-card.answer-reveal-incorrect,
.quiz-question-clip .choice-card:nth-child(n).answer-correct,
.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct,
.quiz-question-clip .choice-card:nth-child(n).answer-incorrect,
.quiz-question-clip .choice-card:nth-child(n).answer-reveal-incorrect,
.quiz-question-clip .choice-card.answer-correct,
.quiz-question-clip .choice-card.answer-reveal-correct,
.quiz-question-clip .choice-card.answer-incorrect,
.quiz-question-clip .choice-card.answer-reveal-incorrect {
  background: transparent;
  border: 0;
  box-shadow: none;
}

/* Detached Badge Sibling */
.choice-card .choice-label {
  position: relative;
  z-index: 5;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: var(--choice-badge-size, 132px);
  height: var(--choice-badge-size, 132px);
  font-size: var(--choice-badge-font-size, 56px);
  border-radius: 50%;
  box-sizing: border-box;
  margin-left: 0;
  will-change: transform;
}

/* Detached Painted Text Surface */
.choice-card .choice-card-surface {
  position: relative;
  z-index: 4;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  min-width: 0;
  box-sizing: border-box;
  height: var(--choice-surface-height, 108px);
  min-height: var(--choice-surface-height, 86px);
  max-height: var(--choice-surface-height, 108px);
  border-radius: var(--choice-surface-radius, 24px);
  padding: var(--choice-surface-padding, var(--choice-card-padding, 10px 24px));
  overflow: visible;
}

/* Overlap between badge and surface */
.choice-card .choice-label + .choice-card-surface {
  margin-left: calc(-1 * var(--choice-badge-overlap, 24px));
}

/* Visual Choice Card Assembly */
.visual-answer-assembly {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  width: 100%;
  height: var(--choice-assembly-height, 104px);
  background: transparent;
  border: 0;
  box-shadow: none;
  padding: 0;
  margin: 0;
  overflow: visible;
}

.visual-answer-assembly .choice-label {
  position: relative;
  z-index: 5;
  flex: 0 0 auto;
}

.visual-answer-assembly .choice-card-surface {
  position: relative;
  z-index: 4;
  flex: 1 1 auto;
  height: var(--choice-surface-height, 86px);
  margin: 0;
}

.visual-answer-assembly .choice-label + .choice-card-surface {
  margin-left: calc(-1 * var(--choice-badge-overlap, 24px));
}

/* Text-Only Variants (Split Versus, Verdict, Mystery Reveal) */
.choice-text-only {
  margin-left: 0;
}

.choice-text-only .choice-card-surface {
  margin-left: 0;
  width: 100%;
  height: var(--choice-surface-height, 100%);
  min-height: var(--choice-surface-height, 86px);
  justify-content: center;
  text-align: center;
}

.choice-text-only .choice-text {
  text-align: center;
  width: 100%;
  padding-right: 0;
  padding-left: 0;
}

/* Pure Visual Straddling Badge */
.choice-pure-visual {
  position: relative;
  overflow: visible;
  background: transparent;
  border: 0;
  box-shadow: none;
  padding: 0;
}

.choice-pure-visual .choice-badge-pure {
  position: absolute;
  z-index: 6;
  left: 50%;
  transform: translateX(-50%);
  width: var(--choice-badge-size, 88px);
  height: var(--choice-badge-size, 88px);
}

/* Pure Visual keeps answer text semantic but never paints it. */
.choice-pure-visual .choice-text,
.choice-card .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;
}
