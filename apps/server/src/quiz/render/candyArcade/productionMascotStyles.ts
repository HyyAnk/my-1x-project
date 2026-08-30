/**
 * CSS for the production Mascot Render Contract V2 layer.
 *
 * The legacy candy mascot selectors remain in candyArcadeStyles for Sandbox
 * compatibility. These selectors are deliberately namespaced so production
 * composition output can move to the V2 transform hierarchy without changing
 * the preview renderer before Batch D.
 */
export function productionMascotCss(): string {
  return `
.candy-mascot-container.mascot-v2-container {
  position: absolute;
  z-index: var(--candy-layer-mascot);
  width: 220px;
  height: 220px;
  left: auto;
  right: auto;
  bottom: auto;
  overflow: visible;
  pointer-events: none;
  contain: layout style;
  transform: translate3d(var(--mascot-placement-offset-x, 0px), var(--mascot-placement-offset-y, 0px), 0);
  transform-origin: 0 0;
}
.candy-mascot-container.mascot-v2-container.anchor-bottom_left { left: 0; bottom: 0; }
.candy-mascot-container.mascot-v2-container.anchor-bottom_right { right: 0; bottom: 0; }
.candy-mascot-container.mascot-v2-container.mascot-intro,
.candy-mascot-container.mascot-v2-container.mascot-outro { bottom: 0; }
.candy-mascot-container.mascot-v2-container .mascot-v2-state {
  position: absolute;
  inset: 0;
  width: 220px;
  height: 220px;
  opacity: 0;
  pointer-events: none;
  will-change: opacity;
  animation: mascot-v2-state-window var(--mascot-state-span, .04s) linear var(--mascot-state-delay, 0s) 1 both;
}
.candy-mascot-container.mascot-v2-container .mascot-v2-motion {
  position: absolute;
  inset: 0;
  width: 220px;
  height: 220px;
  will-change: transform;
  backface-visibility: hidden;
  transform-origin: var(--mascot-pivot-x, 110px) var(--mascot-pivot-y, 220px);
  animation-name: mascot-v2-motion;
  animation-duration: var(--mascot-motion-cycle, 1s);
  animation-delay: var(--mascot-motion-delay, 0s);
  animation-iteration-count: var(--mascot-motion-iterations, 1);
  animation-timing-function: linear;
  animation-fill-mode: both;
}
.candy-mascot-container.mascot-v2-container .mascot-v2-motion.motion-none { animation-name: none; }
.candy-mascot-container.mascot-v2-container .mascot-v2-frame {
  position: absolute;
  inset: 0;
  width: 220px;
  height: 220px;
  will-change: transform;
  backface-visibility: hidden;
  transform-origin: var(--mascot-pivot-x, 110px) var(--mascot-pivot-y, 220px);
  transform: translate3d(var(--mascot-registration-x, 0px), var(--mascot-registration-y, 0px), 0) scaleX(var(--mascot-flip-sign, 1)) scale(var(--mascot-scale, 1));
  background-image: var(--mascot-art-url);
  background-repeat: no-repeat;
  background-position: center center;
  background-size: contain;
  filter: drop-shadow(0 14px 18px rgba(13,35,71,.35));
}
.candy-mascot-container.mascot-v2-container .mascot-v2-legacy-art {
  background-position: 0% 50%;
  background-size: calc(var(--mascot-legacy-frames, 1) * 100%) 100%;
}
.candy-mascot-container.mascot-v2-preview .mascot-v2-state {
  opacity: 1;
  animation: none;
}
.candy-mascot-container.mascot-v2-preview .mascot-v2-motion {
  animation-delay: 0s;
}
.candy-mascot-container.mascot-v2-preview .mascot-v2-state[data-mascot-playing="false"] .mascot-v2-motion {
  animation: none;
  transform: var(--mascot-preview-transform);
}
.candy-mascot-container.mascot-v2-preview .mascot-v2-state[data-mascot-playing="false"] .mascot-v2-legacy-art {
  animation: none !important;
  background-position: var(--mascot-preview-frame-position, 0%) 50%;
}
@keyframes mascot-v2-state-window {
  0% { opacity: 0; }
  0.1%, 99.9% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes mascot-v2-motion {
  0% { transform: var(--mascot-motion-kf-0); }
  25% { transform: var(--mascot-motion-kf-25); }
  50% { transform: var(--mascot-motion-kf-50); }
  75% { transform: var(--mascot-motion-kf-75); }
  100% { transform: var(--mascot-motion-kf-100); }
}
@keyframes mascot-v2-legacy-frame {
  from { background-position: 0% 50%; }
  to { background-position: 100% 50%; }
}
@media (prefers-reduced-motion: reduce) {
  .candy-mascot-container.mascot-v2-container .mascot-v2-motion,
  .candy-mascot-container.mascot-v2-container .mascot-v2-frame {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
  }
}
`;
}
