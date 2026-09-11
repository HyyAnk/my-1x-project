import { renderBrushMarkup } from "../primitives/brushMarkup.js";
import type { TransitionContext, TransitionImplementation } from "../transition.types.js";

export const brushWaveTransition: TransitionImplementation = {
  id: "brush_wave",
  implementationRevision: "1.0.0",
  name: "Brush Wave",
  placements: ["scene"],
  defaultDurationSeconds: 0.8,
  minDurationSeconds: 0.2,
  maxDurationSeconds: 1.5,
  cssClass: "transition-brush_wave",
  handoff: { kind: "cover", progress: 0.5 },
  renderMarkup: (_context: TransitionContext) => renderBrushMarkup(false),
  styles: `
/* Brush Wave */
.brush {
  position: absolute;
  inset: -13% -35%;
  border-radius: 48% 52% 43% 57%;
  background: var(--from, var(--trans-from-color, #F59E0B));
  transform: translateX(-115%) rotate(-8deg);
  animation: brush-wave .8s cubic-bezier(.25,.8,.35,1) var(--clip-start, var(--trans-start, 0s)) both;
}

.brush-two {
  background: var(--to, var(--trans-to-color, #EF4444));
  transform: translateX(-115%) rotate(8deg) scale(.82);
  animation-delay: calc(var(--clip-start, var(--trans-start, 0s)) + .08s);
}

@keyframes brush-wave {
  0% { transform: translateX(-115%); }
  48% { transform: translateX(-10%); }
  100% { transform: translateX(115%); }
}
`.trim(),
};
