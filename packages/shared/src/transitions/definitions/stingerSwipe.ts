import { sanitizeTransitionColor } from "../primitives/escapeTransitionMarkup.js";
import type { TransitionContext, TransitionImplementation } from "../transition.types.js";

export const stingerSwipeTransition: TransitionImplementation = {
  id: "stinger_swipe",
  implementationRevision: "1.0.0",
  name: "Stinger Swipe",
  placements: ["intro"],
  defaultDurationSeconds: 0.5,
  minDurationSeconds: 0.2,
  maxDurationSeconds: 1.5,
  cssClass: "transition-stinger",
  handoff: { kind: "cover", progress: 0.5 },
  renderMarkup: (context: TransitionContext) =>
    `<div class="intro-transition transition-stinger" style="--trans-from-color:${sanitizeTransitionColor(context.fromColor)};--trans-to-color:${sanitizeTransitionColor(context.toColor)};"><div class="stinger-slash slash-a"></div><div class="stinger-slash slash-b"></div><div class="stinger-flash"></div></div>`,
  styles: `
/* Stinger Swipe */
.transition-stinger {
  overflow: hidden;
}

.stinger-slash {
  position: absolute;
  inset: -50%;
  background: linear-gradient(135deg, var(--trans-from-color, #F59E0B) 0%, rgba(255, 255, 255, 0.22) 48%, var(--trans-from-color, #F59E0B) 92%);
  transform: skewX(-25deg) translateX(-150%);
  border-right: 4px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 35px rgba(0, 0, 0, 0.45), inset 6px 0 16px rgba(255, 255, 255, 0.35);
  filter: drop-shadow(0 0 16px var(--trans-from-color, #F59E0B));
  animation: stinger-wipe var(--trans-dur, 0.8s) cubic-bezier(0.2, 0.8, 0.2, 1) var(--trans-start, 0s) forwards;
}

.stinger-slash.slash-b {
  background: linear-gradient(135deg, var(--trans-to-color, #EF4444) 0%, rgba(255, 255, 255, 0.28) 50%, var(--trans-to-color, #EF4444) 100%);
  border-right: 4px solid rgba(255, 255, 255, 0.95);
  filter: drop-shadow(0 0 20px var(--trans-to-color, #EF4444));
  animation-delay: calc(var(--trans-start, 0s) + 0.08s);
}

.stinger-flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, #FFFFFF 0%, rgba(255, 255, 255, 0.8) 40%, rgba(255, 255, 255, 0) 75%);
  opacity: 0;
  pointer-events: none;
  animation: stinger-flash-burst 0.25s ease-out calc(var(--trans-start, 0s) + 0.4s) forwards;
}

@keyframes stinger-wipe {
  0% { transform: skewX(-25deg) translateX(-150%); }
  50% { transform: skewX(-25deg) translateX(0); }
  100% { transform: skewX(-25deg) translateX(150%); }
}

@keyframes stinger-flash-burst {
  0% { opacity: 0; }
  50% { opacity: 0.9; }
  100% { opacity: 0; }
}
`.trim(),
};
