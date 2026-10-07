import { sanitizeTransitionColor } from "../primitives/escapeTransitionMarkup.js";
import type { TransitionContext, TransitionImplementation } from "../transition.types.js";

export const morphWipeTransition: TransitionImplementation = {
  id: "morph_wipe",
  implementationRevision: "1.0.0",
  name: "Morph Wipe",
  placements: ["intro", "scene"],
  defaultDurationSeconds: 0.6,
  minDurationSeconds: 0.3,
  maxDurationSeconds: 1.5,
  cssClass: "transition-morph-wipe",
  handoff: { kind: "cover", progress: 0.5 },
  renderMarkup: (context: TransitionContext) =>
    `<div class="intro-transition transition-morph-wipe" style="--trans-from-color:${sanitizeTransitionColor(
      context.fromColor,
    )};--trans-to-color:${sanitizeTransitionColor(context.toColor)};">` +
    `<div class="morph-wipe-aperture"></div>` +
    `<div class="morph-wipe-flash"></div>` +
    `</div>`,
  styles: `
/* Morph Wipe Transition */
.transition-morph-wipe {
  overflow: hidden;
}

.morph-wipe-aperture {
  position: absolute;
  inset: -20%;
  background: radial-gradient(circle, var(--trans-to-color, #7C3AED) 0%, var(--trans-from-color, #EC4899) 75%);
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  transform: scale(0) rotate(0deg);
  opacity: 0;
  animation: morph-aperture-expand var(--trans-dur, 0.6s) cubic-bezier(0.2, 0.9, 0.25, 1) var(--trans-start, 0s) forwards;
}

.morph-wipe-flash {
  position: absolute;
  inset: 0;
  background: #ffffff;
  opacity: 0;
  pointer-events: none;
  animation: morph-flash-burst 0.2s ease-out calc(var(--trans-start, 0s) + 0.3s) forwards;
}

@keyframes morph-aperture-expand {
  0% { transform: scale(0) rotate(-45deg); opacity: 0; }
  50% { transform: scale(2.2) rotate(45deg); opacity: 1; }
  100% { transform: scale(3.5) rotate(90deg); opacity: 0; }
}

@keyframes morph-flash-burst {
  0% { opacity: 0; }
  50% { opacity: 0.75; }
  100% { opacity: 0; }
}
`.trim(),
};
