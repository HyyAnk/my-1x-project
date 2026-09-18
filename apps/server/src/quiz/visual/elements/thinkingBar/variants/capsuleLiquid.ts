import { calculateThinkingBarTiming, type ThinkingBarRenderInput, type ThinkingBarVariant } from "../types.js";

const CRYSTAL_ORB_SVG = `<svg class="capsule-orb-svg" viewBox="0 0 180 180" aria-hidden="true" data-layout-ignore><defs><radialGradient id="manaAuraGrad" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(0,240,255,0.45)" /><stop offset="65%" stop-color="rgba(112,0,255,0.2)" /><stop offset="100%" stop-color="rgba(0,0,0,0)" /></radialGradient><linearGradient id="chromeRingGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF" /><stop offset="35%" stop-color="#CBD5E1" /><stop offset="70%" stop-color="#00F0FF" /><stop offset="100%" stop-color="#334155" /></linearGradient><radialGradient id="crystalChamberAperture" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#020914" /><stop offset="75%" stop-color="#041830" /><stop offset="100%" stop-color="#072B54" /></radialGradient><linearGradient id="specularDomeGlare" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="rgba(255,255,255,0.85)" /><stop offset="60%" stop-color="rgba(255,255,255,0.25)" /><stop offset="100%" stop-color="rgba(255,255,255,0)" /></linearGradient></defs><circle cx="90" cy="90" r="84" fill="url(#manaAuraGrad)" /><circle cx="90" cy="90" r="64" fill="#040F22" stroke="url(#chromeRingGrad)" stroke-width="6" filter="drop-shadow(0 0 16px rgba(0,240,255,0.85))" /><circle cx="90" cy="90" r="48" fill="url(#crystalChamberAperture)" stroke="#00F0FF" stroke-width="3.5" /><path d="M54 70 C58 52 72 46 90 46 C108 46 122 52 126 70 C112 60 68 60 54 70 Z" fill="url(#specularDomeGlare)" /><circle cx="90" cy="28" r="3.5" fill="#00FF9D" /><circle cx="90" cy="152" r="3.5" fill="#00FF9D" /><circle cx="28" cy="90" r="3.5" fill="#00FF9D" /><circle cx="152" cy="90" r="3.5" fill="#00FF9D" /><circle cx="68" cy="114" r="4" fill="rgba(255,255,255,0.7)" /><circle cx="114" cy="110" r="3" fill="rgba(0,240,255,0.8)" /></svg>`;

export const capsuleLiquidVariant: ThinkingBarVariant = {
  id: "capsule_liquid",
  displayName: "Neon Jelly Liquid",
  description: "Glowing translucent capsule filled with bubbling neon fluid draining down with dynamic color shift.",
  renderHtml(input: ThinkingBarRenderInput): string {
    const timing = calculateThinkingBarTiming(input);
    return `<div class="thinking-bar thinking-bar-capsule-liquid" ${timing.styleAttr}><div class="capsule-track" role="img" aria-label="Quiz countdown from 5 to 1" data-layout-allow-overflow><div class="capsule-metal-cap cap-left" data-layout-ignore aria-hidden="true"><span class="cap-rivet"></span></div><div class="capsule-glass-chamber"><div class="capsule-liquid-fill"><div class="liquid-current current-a" data-layout-ignore aria-hidden="true"></div><div class="liquid-current current-b" data-layout-ignore aria-hidden="true"></div><div class="liquid-wave-front" data-layout-ignore aria-hidden="true"></div><div class="liquid-bubbles" data-layout-ignore aria-hidden="true"><span class="bub bub-1"></span><span class="bub bub-2"></span><span class="bub bub-3"></span><span class="bub bub-4"></span><span class="bub bub-5"></span></div></div><div class="flask-volume-ticks" data-layout-ignore aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><div class="capsule-glass-glare" data-layout-ignore aria-hidden="true"></div><div class="capsule-bottom-reflection" data-layout-ignore aria-hidden="true"></div></div><div class="capsule-metal-cap cap-right" data-layout-ignore aria-hidden="true"><span class="cap-rivet"></span></div><span class="capsule-timer-marker" data-layout-allow-occlusion data-layout-allow-overlap><span class="capsule-energy-orbit" data-layout-ignore aria-hidden="true"><i></i><i></i><i></i></span>${CRYSTAL_ORB_SVG}<div class="mana-sparkles-fx" data-layout-ignore aria-hidden="true"><i>✦</i><i>•</i><i>✦</i></div><b class="marker-val val-query" data-layout-allow-overlap>?</b><b class="marker-val val-5" data-layout-allow-overlap>5</b><b class="marker-val val-4" data-layout-allow-overlap>4</b><b class="marker-val val-3" data-layout-allow-overlap>3</b><b class="marker-val val-2" data-layout-allow-overlap>2</b><b class="marker-val val-1" data-layout-allow-overlap>1</b></span></div></div>`;
  },
  renderCss(): string {
    return `
.thinking-bar-capsule-liquid .capsule-track {
  position: relative; z-index: 0; display: flex; align-items: center; width: 100%; height: 64px; overflow: visible;
  border: 4px solid rgba(255, 255, 255, 0.9); border-radius: 9999px; background: rgba(6, 16, 40, 0.92);
  box-shadow: inset 0 4px 14px rgba(0, 240, 255, 0.35), inset 0 -4px 10px rgba(0, 0, 0, 0.6), 0 12px 32px rgba(0, 0, 0, 0.5), 0 0 28px rgba(0, 220, 255, 0.45);
  animation: jellyChamberCharge var(--timer-duration) linear var(--timer-start) both;
}
.thinking-bar-capsule-liquid .capsule-metal-cap { display: grid; place-items: center; width: 28px; height: 100%; flex: 0 0 28px; background: linear-gradient(180deg, #E2E8F0 0%, #64748B 50%, #1E293B 100%); z-index: 4; }
.thinking-bar-capsule-liquid .cap-left { border-right: 2px solid rgba(0, 240, 255, 0.5); border-radius: 9999px 0 0 9999px; }
.thinking-bar-capsule-liquid .cap-right { border-left: 2px solid rgba(0, 240, 255, 0.5); border-radius: 0 9999px 9999px 0; }
.thinking-bar-capsule-liquid .cap-rivet { width: 8px; height: 8px; border-radius: 50%; background: #00FF9D; box-shadow: 0 0 8px #00FF9D; animation: jellyRivetSignal 0.9s ease-in-out var(--timer-start) 14 alternate both; }
.thinking-bar-capsule-liquid .capsule-glass-chamber { position: relative; flex: 1; height: 100%; overflow: hidden; background: radial-gradient(ellipse at center, #0B224C 0%, #030B1C 100%); }
.thinking-bar-capsule-liquid .capsule-liquid-fill {
  position: absolute; inset: 0 auto 0 0; width: 100%; overflow: hidden; border-radius: 9999px; z-index: 1;
  background: linear-gradient(90deg, #FF007F 0%, #7000FF 30%, #00F0FF 70%, #00FF9D 100%); background-size: 1540px 100%;
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.6);
  animation: quiz-timer-drain var(--timer-duration) linear var(--timer-start) both, jellyLiquidFlow var(--timer-duration) linear var(--timer-start) both;
  will-change: width, filter;
}
.thinking-bar-capsule-liquid .liquid-current { position: absolute; inset: -26px -38%; pointer-events: none; mix-blend-mode: screen; }
.thinking-bar-capsule-liquid .current-a { background: repeating-linear-gradient(112deg, transparent 0 42px, rgba(255, 255, 255, 0.2) 52px 66px, transparent 76px 126px); animation: jellyCurrentSweep var(--timer-duration) linear var(--timer-start) both; }
.thinking-bar-capsule-liquid .current-b { background: repeating-radial-gradient(ellipse at center, rgba(0, 255, 157, 0.2) 0 8px, transparent 15px 42px); opacity: 0.8; animation: jellyCurrentCounterflow var(--timer-duration) ease-in-out var(--timer-start) both; }
.thinking-bar-capsule-liquid .liquid-wave-front { position: absolute; top: -12px; right: -13px; bottom: -12px; width: 48px; border-radius: 48% 58% 52% 44%; background: radial-gradient(ellipse at 34% 50%, rgba(255, 255, 255, 0.95) 0 10%, rgba(0, 240, 255, 0.72) 24%, rgba(112, 0, 255, 0.42) 52%, transparent 74%); filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.9)); pointer-events: none; animation: jellyWaveWobble 1.05s ease-in-out var(--timer-start) 12 alternate both; z-index: 4; }
.thinking-bar-capsule-liquid .liquid-wave-front::before, .thinking-bar-capsule-liquid .liquid-wave-front::after { position: absolute; left: 8px; width: 22px; height: 22px; border-radius: 50%; background: rgba(255, 255, 255, 0.48); box-shadow: 0 0 12px rgba(0, 240, 255, 0.9); content: ""; }
.thinking-bar-capsule-liquid .liquid-wave-front::before { top: 5px; }
.thinking-bar-capsule-liquid .liquid-wave-front::after { bottom: 3px; left: 15px; width: 14px; height: 14px; }
.thinking-bar-capsule-liquid .liquid-bubbles { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
.thinking-bar-capsule-liquid .bub { --bubble-drift: 0px; position: absolute; border: 2px solid rgba(255, 255, 255, 0.8); border-radius: 50%; background: rgba(255, 255, 255, 0.28); box-shadow: 0 0 9px rgba(255, 255, 255, 0.95), inset 2px 2px 3px rgba(255, 255, 255, 0.5); animation: liquidBubbleRise 1.25s ease-in var(--timer-start) 12 both; }
.thinking-bar-capsule-liquid .bub-1 { --bubble-drift: -12px; left: 15%; bottom: 2px; width: 10px; height: 10px; }
.thinking-bar-capsule-liquid .bub-2 { --bubble-drift: 9px; left: 38%; bottom: 6px; width: 14px; height: 14px; animation-delay: calc(var(--timer-start) + 0.25s); }
.thinking-bar-capsule-liquid .bub-3 { --bubble-drift: -6px; left: 62%; bottom: 1px; width: 8px; height: 8px; animation-delay: calc(var(--timer-start) + 0.55s); }
.thinking-bar-capsule-liquid .bub-4 { --bubble-drift: 14px; left: 80%; bottom: 7px; width: 12px; height: 12px; animation-delay: calc(var(--timer-start) + 0.15s); }
.thinking-bar-capsule-liquid .bub-5 { --bubble-drift: -10px; left: 93%; bottom: 3px; width: 16px; height: 16px; animation-delay: calc(var(--timer-start) + 0.75s); }
.thinking-bar-capsule-liquid .flask-volume-ticks { position: absolute; inset: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; pointer-events: none; z-index: 3; }
.thinking-bar-capsule-liquid .flask-volume-ticks span { width: 2px; height: 16px; background: rgba(255, 255, 255, 0.4); box-shadow: 0 0 4px rgba(255, 255, 255, 0.6); }
.thinking-bar-capsule-liquid .capsule-glass-glare { position: absolute; top: 2px; right: 8px; left: 8px; height: 32%; border-radius: 9999px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.15) 65%, transparent 100%); pointer-events: none; z-index: 5; }
.thinking-bar-capsule-liquid .capsule-bottom-reflection { position: absolute; right: 16px; bottom: 2px; left: 16px; height: 20%; border-radius: 9999px; background: linear-gradient(0deg, rgba(255, 255, 255, 0.3) 0%, transparent 100%); pointer-events: none; z-index: 5; }
.thinking-bar-capsule-liquid .capsule-timer-marker { position: absolute; top: 50%; left: 100%; display: grid; place-items: center; width: clamp(154px, 12vw, 180px); height: clamp(154px, 12vw, 180px); transform: translate(-50%, -50%); animation: quiz-timer-marker-slide var(--timer-duration) linear var(--timer-start) both; will-change: left; z-index: 7; }
.thinking-bar-capsule-liquid .capsule-energy-orbit { position: absolute; inset: 8%; border: 2px solid rgba(0, 240, 255, 0.55); border-right-color: #00FF9D; border-bottom-color: rgba(255, 0, 127, 0.85); border-radius: 50%; box-shadow: 0 0 15px rgba(0, 240, 255, 0.65); animation: jellyOrbitSpin var(--timer-duration) linear var(--timer-start) both; z-index: 3; }
.thinking-bar-capsule-liquid .capsule-energy-orbit i { position: absolute; width: 9px; height: 9px; border-radius: 50%; background: #FFF; box-shadow: 0 0 12px #00F0FF, 0 0 22px #7000FF; }
.thinking-bar-capsule-liquid .capsule-energy-orbit i:nth-child(1) { top: -5px; left: 50%; }
.thinking-bar-capsule-liquid .capsule-energy-orbit i:nth-child(2) { right: 5px; bottom: 18%; width: 6px; height: 6px; background: #00FF9D; }
.thinking-bar-capsule-liquid .capsule-energy-orbit i:nth-child(3) { bottom: 9%; left: 4px; width: 7px; height: 7px; background: #FF4FB0; }
.thinking-bar-capsule-liquid .capsule-orb-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; animation: jellyOrbBreathe var(--timer-duration) ease-in-out var(--timer-start) both; z-index: 4; }
.thinking-bar-capsule-liquid .mana-sparkles-fx { position: absolute; inset: 0; pointer-events: none; animation: jellySparkOrbit var(--timer-duration) linear var(--timer-start) both; z-index: 6; }
.thinking-bar-capsule-liquid .mana-sparkles-fx i { position: absolute; color: #FFF; font-size: 16px; font-style: normal; text-shadow: 0 0 10px #00F0FF; }
.thinking-bar-capsule-liquid .mana-sparkles-fx i:nth-child(1) { top: 6px; right: 24px; }
.thinking-bar-capsule-liquid .mana-sparkles-fx i:nth-child(2) { bottom: 12px; left: 20px; color: #00FF9D; font-size: 18px; }
.thinking-bar-capsule-liquid .mana-sparkles-fx i:nth-child(3) { top: 22px; left: 18px; font-size: 14px; }
.thinking-bar-capsule-liquid .marker-val { text-shadow: 0 0 14px #00F0FF, 0 0 28px #00D5FF, 0 3px 6px rgba(0, 0, 0, 0.95); }
@keyframes jellyChamberCharge { 0%, 52% { box-shadow: inset 0 4px 14px rgba(0, 240, 255, 0.35), inset 0 -4px 10px rgba(0, 0, 0, 0.6), 0 12px 32px rgba(0, 0, 0, 0.5), 0 0 28px rgba(0, 220, 255, 0.45); } 78% { box-shadow: inset 0 4px 18px rgba(112, 0, 255, 0.55), inset 0 -4px 10px rgba(0, 0, 0, 0.6), 0 12px 32px rgba(0, 0, 0, 0.5), 0 0 36px rgba(112, 0, 255, 0.65); } 100% { box-shadow: inset 0 4px 20px rgba(255, 0, 127, 0.65), inset 0 -4px 10px rgba(0, 0, 0, 0.6), 0 12px 32px rgba(0, 0, 0, 0.5), 0 0 44px rgba(255, 0, 127, 0.75); } }
@keyframes jellyLiquidFlow { 0% { background-position: 0% 50%; filter: saturate(1) brightness(1); } 55% { filter: saturate(1.18) brightness(1.08); } 100% { background-position: 100% 50%; filter: saturate(1.42) brightness(1.16) hue-rotate(-24deg); } }
@keyframes jellyCurrentSweep { from { transform: translateX(0) skewX(-8deg); } to { transform: translateX(38%) skewX(8deg); } }
@keyframes jellyCurrentCounterflow { 0%, 100% { transform: translateX(7%) scaleY(0.82); opacity: 0.42; } 50% { transform: translateX(-10%) scaleY(1.2); opacity: 0.86; } }
@keyframes jellyWaveWobble { from { transform: translateY(-4px) rotate(-5deg) scaleY(0.9); } to { transform: translateY(4px) rotate(5deg) scaleY(1.12); } }
@keyframes liquidBubbleRise { 0% { opacity: 0; transform: translate(0, 6px) scale(0.55); } 18% { opacity: 0.92; } 78% { opacity: 0.78; } 100% { opacity: 0; transform: translate(var(--bubble-drift), -48px) scale(1.25); } }
@keyframes jellyRivetSignal { from { opacity: 0.55; transform: scale(0.76); } to { opacity: 1; transform: scale(1.2); box-shadow: 0 0 14px #00FF9D, 0 0 24px rgba(0, 240, 255, 0.75); } }
@keyframes jellyOrbitSpin { from { transform: rotate(0deg) scale(0.96); } 45% { transform: rotate(420deg) scale(1.04); } to { transform: rotate(900deg) scale(0.98); } }
@keyframes jellyOrbBreathe { 0%, 100% { transform: translateY(0) scale(0.98); filter: saturate(1); } 20% { transform: translateY(-4px) scale(1.04); } 45% { transform: translateY(3px) scale(1); filter: saturate(1.15); } 72% { transform: translateY(-5px) scale(1.06); filter: saturate(1.28); } 88% { transform: translateY(2px) scale(1.02); } }
@keyframes jellySparkOrbit { from { transform: rotate(0deg); opacity: 0.72; } 50% { opacity: 1; } to { transform: rotate(-720deg); opacity: 0.78; } }
@media (prefers-reduced-motion: reduce) {
  .thinking-bar-capsule-liquid { animation-duration: var(--timer-duration), .001ms !important; }
  .thinking-bar-capsule-liquid .capsule-liquid-fill { animation: quiz-timer-drain var(--timer-duration) linear var(--timer-start) both !important; }
  .thinking-bar-capsule-liquid .capsule-timer-marker { animation: quiz-timer-marker-slide var(--timer-duration) linear var(--timer-start) both !important; }
  .thinking-bar-capsule-liquid .marker-val { animation-duration: 1s !important; }
  .thinking-bar-capsule-liquid .capsule-track, .thinking-bar-capsule-liquid .cap-rivet, .thinking-bar-capsule-liquid .liquid-wave-front, .thinking-bar-capsule-liquid .capsule-energy-orbit, .thinking-bar-capsule-liquid .capsule-orb-svg, .thinking-bar-capsule-liquid .mana-sparkles-fx { animation: none !important; }
  .thinking-bar-capsule-liquid .liquid-current, .thinking-bar-capsule-liquid .liquid-bubbles, .thinking-bar-capsule-liquid .mana-sparkles-fx, .thinking-bar-capsule-liquid .capsule-energy-orbit { display: none; }
}
@media (max-width: 640px) {
  .thinking-bar-capsule-liquid .capsule-track { height: 56px; }
  .thinking-bar-capsule-liquid .capsule-metal-cap { width: 22px; flex-basis: 22px; }
  .thinking-bar-capsule-liquid .capsule-timer-marker { width: 138px; height: 138px; }
  .thinking-bar-capsule-liquid .liquid-wave-front { width: 40px; }
  .thinking-bar-capsule-liquid .marker-val { font-size: 54px; }
}
`;
  },
};
