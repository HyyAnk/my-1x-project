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
  transform: translate(var(--mascot-placement-offset-x, 0px), var(--mascot-placement-offset-y, 0px));
  transform-origin: 0 0;
}
.candy-mascot-container.mascot-v2-container.anchor-bottom_left { left: 0; bottom: 0; }
.candy-mascot-container.mascot-v2-container.anchor-bottom_right { right: 0; bottom: 0; }
.candy-mascot-container.mascot-v2-container.mascot-intro,
.candy-mascot-container.mascot-v2-container.mascot-outro { bottom: 0; }

/* 9:16 portrait viewport safe-zone integration */
#stage[data-aspect-ratio="9:16"] .quiz-question-clip .candy-mascot-container.mascot-v2-container,
#stage[data-aspect-ratio="9:16"] .candy-scene:not(.candy-intro):not(.candy-outro) .candy-mascot-container.mascot-v2-container {
  bottom: var(--safe-zone-bottom, 440px);
}
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.anchor-bottom_left {
  left: 36px;
}
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.anchor-bottom_right {
  right: var(--safe-zone-right, 140px);
}
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.mascot-intro,
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.mascot-outro {
  bottom: 24px;
}
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.mascot-intro.anchor-bottom_left,
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.mascot-outro.anchor-bottom_left {
  left: 24px;
}
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.mascot-intro.anchor-bottom_right,
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.mascot-outro.anchor-bottom_right {
  right: 24px;
}
.candy-mascot-container.mascot-v2-container .mascot-v2-state {
  position: absolute;
  inset: 0;
  width: 220px;
  height: 220px;
  opacity: 0;
  pointer-events: none;
  will-change: opacity;
  animation: mascot-v2-state-window var(--mascot-state-span, .04s) linear var(--mascot-state-delay, 0s) 1 forwards;
}
.candy-mascot-container.mascot-v2-container .mascot-v2-enter {
  position: absolute;
  inset: 0;
  width: 220px;
  height: 220px;
  transform-origin: var(--mascot-pivot-x, 110px) var(--mascot-pivot-y, 220px);
  will-change: transform, opacity;
}
.candy-mascot-container.mascot-v2-container .mascot-v2-enter.enter-pop {
  animation: mascot-v2-enter-pop 0.38s cubic-bezier(0.18, 1.42, 0.34, 1) var(--mascot-enter-delay, 0s) 1 both;
}
.candy-mascot-container.mascot-v2-container .mascot-v2-enter.enter-fade {
  animation: mascot-v2-enter-fade 0.22s ease-out var(--mascot-enter-delay, 0s) 1 both;
}
.candy-mascot-container.mascot-v2-container .mascot-v2-enter.enter-slide {
  animation: mascot-v2-enter-slide 0.28s cubic-bezier(0.22, 0.8, 0.3, 1) var(--mascot-enter-delay, 0s) 1 both;
}
.candy-mascot-container.mascot-v2-container .mascot-v2-enter.enter-none {
  animation: none;
}
.candy-mascot-container.mascot-v2-container .mascot-reveal-fx {
  position: absolute;
  inset: 0;
  width: 220px;
  height: 220px;
  pointer-events: none;
  z-index: 10;
  overflow: visible;
}
.candy-mascot-container.mascot-v2-container .mascot-fx-bloom {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200px;
  height: 200px;
  margin-top: -100px;
  margin-left: -100px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(255, 224, 102, 0.65) 35%, rgba(255, 180, 0, 0) 70%);
  opacity: 0;
  transform: scale(0.3);
  transform-origin: center center;
  mix-blend-mode: screen;
  will-change: transform, opacity;
  animation: mascot-fx-bloom-flash 0.32s ease-out var(--mascot-fx-delay, 0s) 1 forwards;
}
.candy-mascot-container.mascot-v2-container .mascot-fx-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 140px;
  height: 140px;
  margin-top: -70px;
  margin-left: -70px;
  border-radius: 50%;
  border: 4px solid #FFD43F;
  box-shadow: 0 0 16px rgba(255, 212, 63, 0.8), inset 0 0 12px rgba(255, 230, 109, 0.6);
  opacity: 0;
  transform: scale(0.2);
  transform-origin: center center;
  will-change: transform, opacity;
  animation: mascot-fx-ring-burst 0.42s cubic-bezier(0.12, 0.8, 0.32, 1) var(--mascot-fx-delay, 0s) 1 forwards;
}
.candy-mascot-container.mascot-v2-container .mascot-fx-ring.ring-1 {
  border-color: #FFD43F;
  box-shadow: 0 0 20px rgba(255, 212, 63, 0.9), inset 0 0 10px rgba(255, 255, 255, 0.8);
}
.candy-mascot-container.mascot-v2-container .mascot-fx-ring.ring-2 {
  border-color: #5CE1E6;
  border-width: 3px;
  box-shadow: 0 0 18px rgba(92, 225, 230, 0.85), inset 0 0 8px rgba(255, 255, 255, 0.6);
  animation-delay: calc(var(--mascot-fx-delay, 0s) + 0.07s);
}
.candy-mascot-container.mascot-v2-container .mascot-fx-sparkle {
  position: absolute;
  font-style: normal;
  line-height: 1;
  pointer-events: none;
  opacity: 0;
  will-change: transform, opacity;
  animation: mascot-fx-sparkle-pop 0.44s cubic-bezier(0.18, 1.42, 0.34, 1) var(--mascot-fx-delay, 0s) 1 forwards;
}
.candy-mascot-container.mascot-v2-container .mascot-fx-sparkle.sp-1 {
  top: 15%;
  left: 15%;
  color: #FFD43F;
  font-size: 26px;
  text-shadow: 0 0 10px rgba(255, 212, 63, 0.9);
  --sparkle-target-x: -24px;
  --sparkle-target-y: -28px;
}
.candy-mascot-container.mascot-v2-container .mascot-fx-sparkle.sp-2 {
  top: 18%;
  right: 15%;
  color: #5CE1E6;
  font-size: 22px;
  text-shadow: 0 0 8px rgba(92, 225, 230, 0.9);
  animation-delay: calc(var(--mascot-fx-delay, 0s) + 0.04s);
  --sparkle-target-x: 26px;
  --sparkle-target-y: -22px;
}
.candy-mascot-container.mascot-v2-container .mascot-fx-sparkle.sp-3 {
  bottom: 22%;
  left: 12%;
  color: #FF66A1;
  font-size: 20px;
  text-shadow: 0 0 8px rgba(255, 102, 161, 0.9);
  animation-delay: calc(var(--mascot-fx-delay, 0s) + 0.06s);
  --sparkle-target-x: -20px;
  --sparkle-target-y: 18px;
}
.candy-mascot-container.mascot-v2-container .mascot-fx-sparkle.sp-4 {
  bottom: 20%;
  right: 14%;
  color: #FFE66D;
  font-size: 24px;
  text-shadow: 0 0 10px rgba(255, 230, 109, 0.9);
  animation-delay: calc(var(--mascot-fx-delay, 0s) + 0.08s);
  --sparkle-target-x: 22px;
  --sparkle-target-y: 20px;
}
.candy-mascot-container.mascot-v2-container .mascot-v2-motion {
  position: absolute;
  inset: 0;
  width: 220px;
  height: 220px;
  will-change: transform;
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
  transform-origin: var(--mascot-frame-pivot-x, 110px) var(--mascot-frame-pivot-y, 220px);
  transform: translate(var(--mascot-pivot-compensation-x, 0px), var(--mascot-pivot-compensation-y, 0px)) translate(var(--mascot-registration-x, 0px), var(--mascot-registration-y, 0px)) scaleX(var(--mascot-flip-sign, 1)) scale(var(--mascot-scale, 1));
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
.candy-mascot-container.mascot-v2-container .mascot-v2-animation-art {
  background-repeat: no-repeat;
  background-size: 400% 300%;
}
.candy-mascot-container.mascot-v2-container video.mascot-v2-animation-video {
  object-fit: contain;
  background: transparent;
  border: none;
  outline: none;
  background-image: none;
}
.candy-mascot-container.mascot-v2-container img.mascot-v2-frame {
  object-fit: contain;
  background-image: none;
}
.candy-mascot-container.mascot-v2-preview .mascot-v2-animation-art {
  animation: none !important;
  background-size: auto;
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
.candy-mascot-container.mascot-v2-preview .mascot-reveal-fx {
  display: none !important;
}
.candy-mascot-container.mascot-v2-preview .mascot-v2-enter {
  animation: none !important;
}
@keyframes mascot-v2-enter-pop {
  0% {
    transform: scale(0.86);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.07);
    opacity: 1;
  }
  75% {
    transform: scale(0.98);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes mascot-v2-enter-fade {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes mascot-v2-enter-slide {
  0% { transform: translateY(18px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes mascot-fx-bloom-flash {
  0% {
    opacity: 0.95;
    transform: scale(0.35);
  }
  30% {
    opacity: 0.8;
    transform: scale(1.15);
  }
  100% {
    opacity: 0;
    transform: scale(1.4);
  }
}
@keyframes mascot-fx-ring-burst {
  0% {
    opacity: 0.95;
    transform: scale(0.25);
  }
  40% {
    opacity: 0.85;
  }
  100% {
    opacity: 0;
    transform: scale(1.65);
  }
}
@keyframes mascot-fx-sparkle-pop {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.2) rotate(0deg);
  }
  30% {
    opacity: 1;
    transform: translate(calc(var(--sparkle-target-x) * 0.5), calc(var(--sparkle-target-y) * 0.5)) scale(1.2) rotate(45deg);
  }
  100% {
    opacity: 0;
    transform: translate(var(--sparkle-target-x), var(--sparkle-target-y)) scale(0.6) rotate(90deg);
  }
}
@keyframes mascot-v2-state-window {
  0%, 99.9% { opacity: 1; }
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
@keyframes mascot-v2-atlas-loop {
  0%, 8.332% { background-position: 0% 0%; }
  8.333%, 16.665% { background-position: 33.3333% 0%; }
  16.666%, 24.999% { background-position: 66.6667% 0%; }
  25%, 33.332% { background-position: 100% 0%; }
  33.333%, 41.665% { background-position: 0% 50%; }
  41.666%, 49.999% { background-position: 33.3333% 50%; }
  50%, 58.332% { background-position: 66.6667% 50%; }
  58.333%, 66.665% { background-position: 100% 50%; }
  66.666%, 74.999% { background-position: 0% 100%; }
  75%, 83.332% { background-position: 33.3333% 100%; }
  83.333%, 91.665% { background-position: 66.6667% 100%; }
  91.666%, 100% { background-position: 100% 100%; }
}
@keyframes mascot-v2-atlas-oneshot {
  0%, 8.332% { background-position: 0% 0%; }
  8.333%, 16.665% { background-position: 33.3333% 0%; }
  16.666%, 24.999% { background-position: 66.6667% 0%; }
  25%, 33.332% { background-position: 100% 0%; }
  33.333%, 41.665% { background-position: 0% 50%; }
  41.666%, 49.999% { background-position: 33.3333% 50%; }
  50%, 58.332% { background-position: 66.6667% 50%; }
  58.333%, 66.665% { background-position: 100% 50%; }
  66.666%, 74.999% { background-position: 0% 100%; }
  75%, 83.332% { background-position: 33.3333% 100%; }
  83.333%, 91.665% { background-position: 66.6667% 100%; }
  91.666%, 100% { background-position: 100% 100%; }
}
@keyframes mascot-single-breathe { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) scale(1); } 100% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 6px)) scale(1.025, 0.98); } }
@keyframes mascot-single-sway { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) rotate(-2.5deg); } 100% { transform: translate(calc(var(--action-offset-x, 0px) + 4px), calc(var(--action-offset-y, 0px) - 8px)) rotate(3.5deg); } }
@keyframes mascot-single-jump { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) scale(1, 0.95); } 40% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 22px)) scale(1.04, 1.05) rotate(2deg); } 100% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 28px)) scale(1.06, 1.06) rotate(-2deg); } }
@keyframes mascot-single-shake { 0%, 100% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) rotate(0deg); } 25% { transform: translate(calc(var(--action-offset-x, 0px) - 5px), var(--action-offset-y, 0px)) rotate(-4deg); } 75% { transform: translate(calc(var(--action-offset-x, 0px) + 5px), var(--action-offset-y, 0px)) rotate(4deg); } }
@keyframes mascot-single-pulse { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) scale(1); } 100% { transform: translate(calc(var(--action-offset-x, 0px) + 6px), calc(var(--action-offset-y, 0px) - 4px)) scale(1.03); } }
@keyframes mascot-single-wave { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) rotate(-3deg); } 100% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 10px)) rotate(4deg) scale(1.03); } }
@keyframes mascot-single-float { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) translateY(0) rotate(0deg); } 50% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 14px)) rotate(1.5deg); } 100% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 6px)) rotate(-1.5deg); } }
@media (prefers-reduced-motion: reduce) {
  .candy-mascot-container.mascot-v2-container .mascot-v2-motion,
  .candy-mascot-container.mascot-v2-container .mascot-v2-frame,
  .candy-mascot-container.mascot-v2-container .mascot-v2-enter,
  .candy-mascot-container.mascot-v2-container .mascot-reveal-fx {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
  }
}
`;
}
