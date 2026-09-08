/**
 * Returns the scheduled timeline reveal animations and the sandbox preview
 * scrubber fallback bindings for the Mystery Reveal layout.
 */
export function mysteryRevealRevealMotionStyles(): string {
  return `
/* === Scheduled Timeline Animations (Production-Ready - BUG-MR-01 Fix) === */
.quiz-question-clip.layout-mystery_reveal .mystery-scanner-bar {
  animation: mystery-scanner-sweep 0.85s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.quiz-question-clip.layout-mystery_reveal .mystery-revealed-layer {
  pointer-events: auto;
  animation: mystery-reveal-wipe 0.85s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

.quiz-question-clip.layout-mystery_reveal .mystery-mosaic-layer {
  animation: mystery-mosaic-vanish 0.85s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

/* Backward-compatibility selectors for sandbox snapshot preview */
.layout-mystery_reveal[data-choice-phase="reveal"] .mystery-scanner-bar,
.layout-mystery_reveal[data-choice-phase="explain"] .mystery-scanner-bar,
.layout-mystery_reveal.is-revealed .mystery-scanner-bar {
  animation: mystery-scanner-sweep 0.85s cubic-bezier(0.22, 0.8, 0.3, 1) forwards;
}

.layout-mystery_reveal[data-choice-phase="reveal"] .mystery-revealed-layer,
.layout-mystery_reveal[data-choice-phase="explain"] .mystery-revealed-layer,
.layout-mystery_reveal.is-revealed .mystery-revealed-layer {
  pointer-events: auto;
  animation: mystery-reveal-wipe 0.85s cubic-bezier(0.22, 0.8, 0.3, 1) forwards;
}

.layout-mystery_reveal[data-choice-phase="reveal"] .mystery-mosaic-layer,
.layout-mystery_reveal[data-choice-phase="explain"] .mystery-mosaic-layer,
.layout-mystery_reveal.is-revealed .mystery-mosaic-layer {
  animation: mystery-mosaic-vanish 0.85s cubic-bezier(0.22, 0.8, 0.3, 1) forwards;
}
`;
}
