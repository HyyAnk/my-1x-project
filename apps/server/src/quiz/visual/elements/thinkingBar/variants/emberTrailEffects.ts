export function emberTrailEffectsCss(): string {
  return `
.thinking-bar-flame-fuse .ember-flames {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.thinking-bar-flame-fuse .ember-flames i {
  --flame-from: -7deg;
  --flame-to: -3deg;
  position: absolute;
  top: 43%;
  left: 58%;
  width: 42%;
  height: 18%;
  border-radius: 35% 90% 90% 35%;
  background: linear-gradient(90deg, #fff2a8 0, #ff9b2f 35%, rgba(239, 64, 20, 0.5) 68%, transparent 100%);
  filter: drop-shadow(0 0 7px rgba(255, 105, 28, 0.72));
  transform: translateY(-50%) rotate(-7deg);
  transform-origin: left center;
  animation: emberTrailFlameDance 0.56s ease-in-out var(--timer-start) infinite alternate both;
}

.thinking-bar-flame-fuse .ember-flames i:nth-child(2) {
  --flame-from: 8deg;
  --flame-to: 4deg;
  top: 56%;
  width: 32%;
  height: 13%;
  opacity: 0.72;
  transform: translateY(-50%) rotate(8deg);
  animation-delay: calc(var(--timer-start) + 0.18s);
  animation-duration: 0.68s;
}

.thinking-bar-flame-fuse .ember-particles {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
}

.thinking-bar-flame-fuse .ember-particles i {
  --spark-x: 36px;
  --spark-y: -24px;
  position: absolute;
  top: 40%;
  left: 66%;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fff4a8;
  box-shadow: 0 0 7px rgba(255, 100, 28, 0.9);
  animation: emberTrailParticleBurst 1.35s ease-out var(--timer-start) infinite both;
}

.thinking-bar-flame-fuse .ember-particles i:nth-child(2) { --spark-x: 48px; --spark-y: 14px; top: 55%; animation-delay: calc(var(--timer-start) + 0.34s); animation-duration: 1.55s; }
.thinking-bar-flame-fuse .ember-particles i:nth-child(3) { --spark-x: 30px; --spark-y: -38px; top: 35%; animation-delay: calc(var(--timer-start) + 0.72s); animation-duration: 1.7s; }
.thinking-bar-flame-fuse .ember-particles i:nth-child(4) { --spark-x: 54px; --spark-y: -8px; top: 49%; animation-delay: calc(var(--timer-start) + 1.04s); animation-duration: 1.48s; }

@keyframes emberTrailFlameDance {
  from { opacity: 0.72; transform: translateY(-50%) rotate(var(--flame-from)) scaleX(0.82); }
  to { opacity: 0.96; transform: translateY(-50%) rotate(var(--flame-to)) scaleX(1.06); }
}

@keyframes emberTrailParticleBurst {
  0%, 12% { opacity: 0; transform: translate(0, 0) scale(0.35); }
  24% { opacity: 0.82; transform: translate(6px, -3px) scale(1); }
  100% { opacity: 0; transform: translate(var(--spark-x), var(--spark-y)) scale(0.2); }
}
`;
}
