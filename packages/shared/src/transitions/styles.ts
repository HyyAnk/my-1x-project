/**
 * Shared CSS Motion & Transition Engine.
 * Single Source of Truth (SSOT) for video compositions and web previews.
 */

export const TRANSITION_STYLES_CSS = `
/* ==========================================================================
   Antigravity Video Studio — Shared Motion & Transition Engine
   ========================================================================== */

:root {
  --trans-dur: 0.8s;
  --trans-start: 0s;
  --trans-from-color: var(--from, #F59E0B);
  --trans-to-color: var(--to, #EF4444);
}

/* Base Transition Wrappers */
.intro-transition {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 100;
}

.candy-transition { position: absolute; z-index: var(--candy-layer-transition); inset: 0; overflow: hidden; background: transparent; pointer-events: none; }

/* Direct Cut (Instant snap) */
.transition-cut {
  display: none;
  opacity: 0;
  pointer-events: none;
}

/* Smooth Crossfade */
.transition-crossfade {
  background: #000;
  opacity: 0;
  animation: crossfade-out var(--trans-dur, 0.8s) ease-in var(--trans-start, 0s) forwards;
}

@keyframes crossfade-out {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

/* Curtain Swipe */
.transition-swipe {
  overflow: hidden;
}

.swipe-curtain {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--trans-from-color, #1E293B), var(--trans-to-color, #0F172A));
  transform: translateX(-100%);
  animation: swipe-in var(--trans-dur, 0.8s) cubic-bezier(0.4, 0, 0.2, 1) var(--trans-start, 0s) forwards;
}

@keyframes swipe-in {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(0); }
}

/* Stinger Swipe */
.transition-stinger {
  overflow: hidden;
}

.stinger-slash {
  position: absolute;
  inset: -50%;
  background: var(--trans-from-color, #F59E0B);
  transform: skewX(-25deg) translateX(-150%);
  animation: stinger-wipe var(--trans-dur, 0.8s) cubic-bezier(0.2, 0.8, 0.2, 1) var(--trans-start, 0s) forwards;
}

.stinger-slash.slash-b {
  background: var(--trans-to-color, #EF4444);
  animation-delay: calc(var(--trans-start, 0s) + 0.08s);
}

.stinger-flash {
  position: absolute;
  inset: 0;
  background: #FFFFFF;
  opacity: 0;
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

/* Scene Transitions */
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

/* Scene Keyframes */
@keyframes brush-wave {
  0% { transform: translateX(-115%); }
  48% { transform: translateX(-10%); }
  100% { transform: translateX(115%); }
}

@keyframes mark-pop {
  0%, 18% { transform: translate(-50%,-50%) scale(0) rotate(-26deg); }
  52% { transform: translate(-50%,-50%) scale(1.15) rotate(8deg); }
  74%, 100% { transform: translate(-50%,-50%) scale(1) rotate(0); }
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
`.trim();

/**
 * Returns the unified transition CSS string.
 */
export function getTransitionStylesCss(): string {
  return TRANSITION_STYLES_CSS;
}

/**
 * Injects the unified transition styles into document head if not already present.
 */
export function injectTransitionStyles(targetDocument?: Document): void {
  const doc = targetDocument ?? (typeof document !== "undefined" ? document : undefined);
  if (!doc?.head) return;
  const styleId = "studio-transition-motion-engine";
  if (doc.getElementById(styleId)) return;
  const style = doc.createElement("style");
  style.id = styleId;
  style.textContent = TRANSITION_STYLES_CSS;
  doc.head.appendChild(style);
}
