/**
 * ADR-003 Choice Typography Tier CSS.
 *
 * Single tier system consuming layout capacity tokens.
 */
export function choiceTypographyStyles(): string {
  return `
/* === Choice Typography Tiers (ADR-003) === */
.choice-card-text .choice-text,
.answer-card span {
  font-size: var(--choice-font-size-base, 44px);
}

.choice-card-text.choice-tier-medium .choice-text,
.choice-card-text .choice-tier-medium span,
.choice-tier-medium.answer-card span,
.choice-tier-medium .answer-card span {
  font-size: var(--choice-font-size-medium, 38px);
}

.choice-card-text.choice-tier-long .choice-text,
.choice-card-text .choice-tier-long span,
.choice-tier-long.answer-card span,
.choice-tier-long .answer-card span {
  font-size: var(--choice-font-size-long, 32px);
}

.choice-card-text.choice-tier-very_long .choice-text,
.choice-card-text.choice-tier-overflow .choice-text,
.choice-card-text .choice-tier-very_long span,
.choice-card-text .choice-tier-overflow span,
.choice-tier-very_long.answer-card span,
.choice-tier-very_long .answer-card span,
.choice-tier-overflow.answer-card span,
.choice-tier-overflow .answer-card span {
  font-size: var(--choice-font-size-very_long, 26px);
}

/* Visual Choice Card Typography */
.choice-card-visual .choice-text,
.visual-answer-label span {
  font-size: var(--choice-label-font-size-base, 32px);
}

.choice-card-visual.choice-tier-medium .choice-text,
.choice-card-visual.choice-tier-medium .visual-answer-label span,
.choice-tier-medium .visual-answer-label span,
.choice-tier-medium.visual-answer-card .visual-answer-label span {
  font-size: var(--choice-label-font-size-medium, 28px);
}

.choice-card-visual.choice-tier-long .choice-text,
.choice-card-visual.choice-tier-long .visual-answer-label span,
.choice-tier-long .visual-answer-label span,
.choice-tier-long.visual-answer-card .visual-answer-label span {
  font-size: var(--choice-label-font-size-long, 24px);
}

.choice-card-visual.choice-tier-very_long .choice-text,
.choice-card-visual.choice-tier-very_long .visual-answer-label span,
.choice-card-visual.choice-tier-overflow .choice-text,
.choice-card-visual.choice-tier-overflow .visual-answer-label span,
.choice-tier-very_long .visual-answer-label span,
.choice-tier-very_long.visual-answer-card .visual-answer-label span,
.choice-tier-overflow .visual-answer-label span,
.choice-tier-overflow.visual-answer-card .visual-answer-label span {
  font-size: var(--choice-label-font-size-very_long, 24px);
}
`;
}
