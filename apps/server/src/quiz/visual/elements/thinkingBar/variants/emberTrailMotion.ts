export function emberTrailMotionCss(): string {
  return `
.thinking-bar-flame-fuse .ember-trail-rope {
  animation: quiz-timer-drain var(--timer-duration) linear var(--timer-start) both;
}

.thinking-bar-flame-fuse .ember-trail-rope::before {
  animation: emberTrailBraidRush 1.4s linear var(--timer-start) infinite;
}

.thinking-bar-flame-fuse .ember-trail-rope::after {
  animation: emberTrailBurnFront 0.54s ease-in-out var(--timer-start) infinite alternate;
}

.thinking-bar-flame-fuse .ember-trail-marker {
  animation: quiz-timer-marker-slide var(--timer-duration) linear var(--timer-start) both;
}

.thinking-bar-flame-fuse .ember-core {
  animation: emberTrailCorePulse 0.86s ease-in-out var(--timer-start) infinite alternate both;
}

@keyframes emberTrailBraidRush {
  from { background-position: 0 0; }
  to { background-position: -84px 0; }
}

@keyframes emberTrailBurnFront {
  from { opacity: 0.76; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1.08); }
}

@keyframes emberTrailCorePulse {
  from { filter: saturate(0.96) brightness(0.98); transform: scale(0.985); }
  to { filter: saturate(1.08) brightness(1.05); transform: scale(1.015); }
}

@media (prefers-reduced-motion: reduce) {
  .thinking-bar-flame-fuse { animation-duration: var(--timer-duration), 0.001ms !important; }
  .thinking-bar-flame-fuse .ember-trail-rope { animation: quiz-timer-drain var(--timer-duration) linear var(--timer-start) both !important; }
  .thinking-bar-flame-fuse .ember-trail-marker { animation: quiz-timer-marker-slide var(--timer-duration) linear var(--timer-start) both !important; }
  .thinking-bar-flame-fuse .ember-trail-rope,
  .thinking-bar-flame-fuse .ember-trail-marker { animation-duration: var(--timer-duration) !important; }
  .thinking-bar-flame-fuse .marker-val { animation-duration: 1s !important; }
  .thinking-bar-flame-fuse .ember-trail-rope::before,
  .thinking-bar-flame-fuse .ember-trail-rope::after,
  .thinking-bar-flame-fuse .ember-flames i,
  .thinking-bar-flame-fuse .ember-core { animation: none !important; }
  .thinking-bar-flame-fuse .ember-particles { display: none; }
}

@media (max-width: 640px) {
  .thinking-bar-flame-fuse .ember-trail-track { --ember-edge-gap: 34px; height: 72px; }
  .thinking-bar-flame-fuse .ember-trail-marker { width: 138px; height: 138px; }
  .thinking-bar-flame-fuse .marker-val { font-size: 56px; }
}
`;
}
