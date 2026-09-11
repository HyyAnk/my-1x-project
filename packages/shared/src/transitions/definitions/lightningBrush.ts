import { renderBrushMarkup } from "../primitives/brushMarkup.js";
import type { TransitionContext, TransitionImplementation } from "../transition.types.js";

export const lightningBrushTransition: TransitionImplementation = {
  id: "lightning_brush",
  implementationRevision: "1.0.0",
  name: "Lightning Brush",
  placements: ["scene"],
  defaultDurationSeconds: 0.8,
  minDurationSeconds: 0.2,
  maxDurationSeconds: 1.5,
  cssClass: "transition-lightning_brush",
  handoff: { kind: "cover", progress: 0.5 },
  renderMarkup: (_context: TransitionContext) => renderBrushMarkup(true),
  styles: `
/* Lightning Brush */
.transition-lightning_brush .brush {
  border: 18px solid rgba(255,255,255,.38);
}

.transition-mark {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 146px;
  height: 146px;
  border: 9px solid #fff;
  border-radius: 47px;
  background: var(--from, var(--trans-from-color, #F59E0B));
  color: #fff;
  box-shadow: 0 18px 0 rgba(13,35,71,.25);
  font-size: 82px;
  transform: translate(-50%,-50%) scale(0) rotate(-26deg);
  animation: mark-pop .8s cubic-bezier(.18,1.42,.34,1) var(--clip-start, var(--trans-start, 0s)) both;
}

@keyframes mark-pop {
  0%, 18% { transform: translate(-50%,-50%) scale(0) rotate(-26deg); }
  52% { transform: translate(-50%,-50%) scale(1.15) rotate(8deg); }
  74%, 100% { transform: translate(-50%,-50%) scale(1) rotate(0); }
}
`.trim(),
};
