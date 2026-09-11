import type { TransitionContext, TransitionImplementation } from "../transition.types.js";

export const bubbleSplashTransition: TransitionImplementation = {
  id: "bubble_splash",
  implementationRevision: "1.0.0",
  name: "Bubble Splash",
  placements: ["scene"],
  defaultDurationSeconds: 0.86,
  minDurationSeconds: 0.2,
  maxDurationSeconds: 1.5,
  cssClass: "transition-bubble_splash",
  handoff: { kind: "cover", progress: 0.5 },
  renderMarkup: (_context: TransitionContext) =>
    `<div class="splash-bed" data-layout-allow-occlusion data-layout-allow-overflow></div><i class="splash-bubble splash-bubble-a" data-layout-allow-occlusion data-layout-allow-overflow></i><i class="splash-bubble splash-bubble-b" data-layout-allow-occlusion data-layout-allow-overflow></i><i class="splash-bubble splash-bubble-c" data-layout-allow-occlusion data-layout-allow-overflow></i><i class="splash-bubble splash-bubble-d" data-layout-allow-occlusion data-layout-allow-overflow></i><i class="splash-bubble splash-bubble-e" data-layout-allow-occlusion data-layout-allow-overflow></i><i class="splash-bubble splash-bubble-f" data-layout-allow-occlusion data-layout-allow-overflow></i><div class="splash-brand" data-layout-ignore aria-hidden="true">★</div><div class="splash-particles" data-layout-ignore aria-hidden="true"><i>✦</i><i>•</i><i>✦</i><i>•</i></div><div class="splash-release" data-layout-allow-occlusion data-layout-allow-overflow></div>`,
  styles: `
/* Bubble Splash */
.transition-bubble_splash {
  background: transparent;
}

.splash-bed {
  position: absolute;
  inset: 0;
  background: var(--from, var(--trans-from-color, #F59E0B));
  opacity: 0;
  transform: scale(.96);
  animation: splash-bed .86s cubic-bezier(.22,.8,.3,1) var(--clip-start, var(--trans-start, 0s)) both;
}

.splash-bubble {
  position: absolute;
  display: block;
  width: 840px;
  height: 840px;
  border: 12px solid rgba(255,255,255,.72);
  border-radius: 46% 54% 58% 42%;
  background: var(--bubble-color, var(--from, var(--trans-from-color, #F59E0B)));
  box-shadow: 0 22px 0 rgba(13,35,71,.16), inset 0 10px 0 rgba(255,255,255,.18);
  opacity: 0;
  transform: scale(.12) rotate(-12deg);
  animation: bubble-splash-attack .86s cubic-bezier(.18,1.42,.34,1) var(--clip-start, var(--trans-start, 0s)) both;
}

.splash-bubble-a {
  left: -210px;
  top: -280px;
  --bubble-color: var(--from, var(--trans-from-color, #F59E0B));
}

.splash-bubble-b {
  right: -230px;
  top: -230px;
  --bubble-color: var(--to, var(--trans-to-color, #EF4444));
  animation-delay: calc(var(--clip-start, var(--trans-start, 0s)) + .04s);
}

.splash-bubble-c {
  left: 220px;
  bottom: -380px;
  --bubble-color: var(--to, var(--trans-to-color, #EF4444));
  animation-delay: calc(var(--clip-start, var(--trans-start, 0s)) + .08s);
}

.splash-bubble-d {
  right: 160px;
  bottom: -360px;
  --bubble-color: var(--from, var(--trans-from-color, #F59E0B));
  animation-delay: calc(var(--clip-start, var(--trans-start, 0s)) + .12s);
}

.splash-bubble-e {
  left: 590px;
  top: -430px;
  width: 700px;
  height: 700px;
  --bubble-color: var(--to, var(--trans-to-color, #EF4444));
  animation-delay: calc(var(--clip-start, var(--trans-start, 0s)) + .16s);
}

.splash-bubble-f {
  right: 500px;
  bottom: -430px;
  width: 680px;
  height: 680px;
  --bubble-color: var(--from, var(--trans-from-color, #F59E0B));
  animation-delay: calc(var(--clip-start, var(--trans-start, 0s)) + .2s);
}

.splash-brand {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 152px;
  height: 152px;
  border: 9px solid #fff;
  border-radius: 46px;
  background: var(--to, var(--trans-to-color, #EF4444));
  color: #fff;
  box-shadow: 0 18px 0 rgba(13,35,71,.27), inset 0 -8px 0 rgba(13,35,71,.12);
  font-size: 82px;
  opacity: 0;
  transform: translate(-50%,-50%) scale(0) rotate(-22deg);
  animation: splash-brand-hit .86s cubic-bezier(.18,1.42,.34,1) var(--clip-start, var(--trans-start, 0s)) both;
}

.splash-particles {
  position: absolute;
  top: 50%;
  left: 50%;
  color: #fff;
  font-size: 36px;
  text-shadow: 0 6px 0 rgba(13,35,71,.2);
}

.splash-particles i {
  position: absolute;
  font-style: normal;
  opacity: 0;
  animation: splash-particle .6s ease-out calc(var(--clip-start, var(--trans-start, 0s)) + .34s) both;
}

.splash-particles i:nth-child(1) { transform: translate(-190px,-80px); }
.splash-particles i:nth-child(2) { transform: translate(170px,-115px); color: #FFD34D; animation-delay: calc(var(--clip-start, var(--trans-start, 0s)) + .38s); }
.splash-particles i:nth-child(3) { transform: translate(190px,90px); animation-delay: calc(var(--clip-start, var(--trans-start, 0s)) + .42s); }
.splash-particles i:nth-child(4) { transform: translate(-160px,110px); color: #FFD34D; animation-delay: calc(var(--clip-start, var(--trans-start, 0s)) + .46s); }

.splash-release {
  position: absolute;
  inset: 0;
  border: 24px solid rgba(255,255,255,.34);
  opacity: 0;
  transform: scale(1.08);
  animation: splash-release .86s ease-out calc(var(--clip-start, var(--trans-start, 0s)) + .42s) both;
}

@keyframes splash-bed {
  0%, 28% { opacity: 0; transform: scale(.96); }
  48% { opacity: .94; transform: scale(1); }
  78% { opacity: .94; }
  100% { opacity: 0; transform: scale(1.04); }
}

@keyframes bubble-splash-attack {
  0% { opacity: 0; transform: scale(.12) rotate(-12deg); }
  34% { opacity: 1; transform: scale(1.04) rotate(4deg); }
  56% { opacity: 1; transform: scale(1.08) rotate(0); }
  100% { opacity: 0; transform: scale(1.22) rotate(8deg); }
}

@keyframes splash-brand-hit {
  0%, 32% { opacity: 0; transform: translate(-50%,-50%) scale(0) rotate(-22deg); }
  53% { opacity: 1; transform: translate(-50%,-50%) scale(1.16) rotate(8deg); }
  67% { opacity: 1; transform: translate(-50%,-50%) scale(1) rotate(0); }
  100% { opacity: 0; transform: translate(-50%,-50%) scale(.92) rotate(0); }
}

@keyframes splash-particle {
  0% { opacity: 0; }
  35% { opacity: 1; }
  100% { opacity: 0; transform: translate(0,0) scale(.4); }
}

@keyframes splash-release {
  0%, 55% { opacity: 0; transform: scale(1.08); }
  72% { opacity: .9; transform: scale(1); }
  100% { opacity: 0; transform: scale(.98); }
}
`.trim(),
};
