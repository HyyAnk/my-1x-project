import { sanitizeTransitionColor } from "../primitives/escapeTransitionMarkup.js";
import type { TransitionContext, TransitionImplementation } from "../transition.types.js";

export const energySlashTransition: TransitionImplementation = {
  id: "energy_slash",
  implementationRevision: "1.0.0",
  name: "Energy Slash",
  placements: ["intro", "scene"],
  defaultDurationSeconds: 0.55,
  minDurationSeconds: 0.25,
  maxDurationSeconds: 1.2,
  cssClass: "transition-energy-slash",
  handoff: { kind: "cover", progress: 0.5 },
  renderMarkup: (context: TransitionContext) =>
    `<div class="intro-transition transition-energy-slash" style="--trans-from-color:${sanitizeTransitionColor(
      context.fromColor,
    )};--trans-to-color:${sanitizeTransitionColor(context.toColor)};">` +
    `<div class="energy-slash-blade blade-cyan"></div>` +
    `<div class="energy-slash-blade blade-magenta"></div>` +
    `<div class="energy-slash-burst"></div>` +
    `</div>`,
  styles: `
/* Energy Slash Transition with Chromatic Aberration */
.transition-energy-slash {
  overflow: hidden;
}

.energy-slash-blade {
  position: absolute;
  inset: -60%;
  transform: skewX(-32deg) translateX(-160%);
  animation: energy-slash-wipe var(--trans-dur, 0.55s) cubic-bezier(0.12, 0.95, 0.2, 1) var(--trans-start, 0s) forwards;
}

.energy-slash-blade.blade-cyan {
  background: linear-gradient(135deg, #00FFFF 0%, rgba(255, 255, 255, 0.9) 50%, var(--trans-to-color, #7C3AED) 100%);
  border-right: 5px solid #00FFFF;
  filter: drop-shadow(-8px 0 16px #00FFFF);
}

.energy-slash-blade.blade-magenta {
  background: linear-gradient(135deg, #FF007F 0%, rgba(255, 255, 255, 0.9) 50%, var(--trans-from-color, #EC4899) 100%);
  border-right: 5px solid #FF007F;
  filter: drop-shadow(8px 0 16px #FF007F);
  animation-delay: calc(var(--trans-start, 0s) + 0.05s);
}

.energy-slash-burst {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, #ffffff 0%, transparent 75%);
  opacity: 0;
  pointer-events: none;
  animation: energy-flash 0.2s ease-out calc(var(--trans-start, 0s) + 0.28s) forwards;
}

@keyframes energy-slash-wipe {
  0% { transform: skewX(-32deg) translateX(-160%); }
  50% { transform: skewX(-32deg) translateX(0%); }
  100% { transform: skewX(-32deg) translateX(160%); }
}

@keyframes energy-flash {
  0% { opacity: 0; }
  50% { opacity: 0.85; }
  100% { opacity: 0; }
}
`.trim(),
};
