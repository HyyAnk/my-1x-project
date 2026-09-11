import type { TransitionContext, TransitionImplementation } from "../transition.types.js";

export const cutTransition: TransitionImplementation = {
  id: "cut",
  implementationRevision: "1.0.0",
  name: "Direct Cut",
  placements: ["intro", "scene"],
  defaultDurationSeconds: 0,
  minDurationSeconds: 0,
  maxDurationSeconds: 0,
  cssClass: "transition-cut",
  handoff: { kind: "cut" },
  renderMarkup: (_context: TransitionContext) => "",
  styles: `
/* Direct Cut */
.transition-cut {
  display: none;
  opacity: 0;
  pointer-events: none;
}
`.trim(),
};
