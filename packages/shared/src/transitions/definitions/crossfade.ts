import type { TransitionContext, TransitionImplementation } from "../transition.types.js";

export const crossfadeTransition: TransitionImplementation = {
  id: "crossfade",
  implementationRevision: "1.0.0",
  name: "Fade to Black",
  placements: ["intro"],
  defaultDurationSeconds: 0.5,
  minDurationSeconds: 0.2,
  maxDurationSeconds: 1.5,
  cssClass: "transition-crossfade",
  handoff: { kind: "fade-black", progress: 1.0 },
  renderMarkup: (_context: TransitionContext) =>
    `<div class="intro-transition transition-crossfade" style="--trans-start:0s;--trans-dur:var(--trans-dur, 0.5s);"></div>`,
  styles: `
/* Fade to Black (crossfade) */
.transition-crossfade {
  background: #000;
  opacity: 0;
  animation: crossfade-out var(--trans-dur, 0.8s) ease-in var(--trans-start, 0s) forwards;
}

@keyframes crossfade-out {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
`.trim(),
};
