import { calculateThinkingBarTiming, type ThinkingBarRenderInput, type ThinkingBarVariant } from "../types.js";

export const capsuleLiquidVariant: ThinkingBarVariant = {
  id: "capsule_liquid",
  displayName: "Neon Jelly Liquid",
  description: "Glowing translucent capsule filled with bubbling neon fluid draining down with dynamic color shift.",
  renderHtml(input: ThinkingBarRenderInput): string {
    const timing = calculateThinkingBarTiming(input);
    return `<div class="thinking-bar thinking-bar-capsule-liquid" ${timing.styleAttr}><div class="capsule-track" aria-label="Quiz liquid timer" data-layout-allow-overflow><div class="capsule-glass-tube"><div class="capsule-liquid-fill"><div class="liquid-wave wave-front"></div><div class="liquid-wave wave-back"></div><div class="liquid-bubbles" data-layout-ignore aria-hidden="true"><span class="bub bub-1"></span><span class="bub bub-2"></span><span class="bub bub-3"></span><span class="bub bub-4"></span><span class="bub bub-5"></span></div></div><div class="capsule-glass-glare" data-layout-ignore aria-hidden="true"></div></div><span class="capsule-timer-marker" data-layout-allow-occlusion data-layout-allow-overlap><div class="capsule-orb-aura"></div><div class="capsule-orb-core"><span class="capsule-bubble-icon">🫧</span></div><b class="marker-val val-query" data-layout-allow-overlap>?</b><b class="marker-val val-5" data-layout-allow-overlap>5</b><b class="marker-val val-4" data-layout-allow-overlap>4</b><b class="marker-val val-3" data-layout-allow-overlap>3</b><b class="marker-val val-2" data-layout-allow-overlap>2</b><b class="marker-val val-1" data-layout-allow-overlap>1</b></span></div></div>`;
  },
  renderCss(): string {
    return `
.thinking-bar-capsule-liquid .capsule-track { position: relative; z-index: 0; width: 100%; height: 60px; overflow: visible; border: 5px solid rgba(255,255,255,0.9); border-radius: 9999px; background: rgba(10, 25, 55, 0.75); box-shadow: inset 0 4px 12px rgba(0, 240, 255, 0.25), inset 0 -4px 8px rgba(0,0,0,0.5), 0 10px 28px rgba(0,0,0,0.35), 0 0 24px rgba(0, 220, 255, 0.35); }
.thinking-bar-capsule-liquid .capsule-glass-tube { position: absolute; inset: 2px; border-radius: 9999px; overflow: hidden; }
.thinking-bar-capsule-liquid .capsule-liquid-fill { position: absolute; top: 0; left: 0; bottom: 0; width: 100%; border-radius: 9999px; background: linear-gradient(90deg, #ff1744 0%, #ff9100 25%, #00e676 60%, #00e5ff 100%); background-size: 1540px 100%; background-position: left center; z-index: 1; animation: quiz-timer-drain var(--timer-duration) linear var(--clip-start) both; }
.thinking-bar-capsule-liquid .liquid-wave { position: absolute; top: 0; bottom: 0; right: 0; width: 40px; pointer-events: none; opacity: 0.8; }
.thinking-bar-capsule-liquid .liquid-bubbles { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
.thinking-bar-capsule-liquid .bub { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.7); box-shadow: 0 0 6px rgba(255,255,255,0.9); animation: liquidBubbleRise 2.2s infinite ease-in-out; }
.thinking-bar-capsule-liquid .bub-1 { width: 10px; height: 10px; left: 15%; bottom: 6px; animation-delay: 0s; }
.thinking-bar-capsule-liquid .bub-2 { width: 14px; height: 14px; left: 35%; bottom: 8px; animation-delay: 0.6s; }
.thinking-bar-capsule-liquid .bub-3 { width: 8px; height: 8px; left: 55%; bottom: 4px; animation-delay: 1.1s; }
.thinking-bar-capsule-liquid .bub-4 { width: 12px; height: 12px; left: 75%; bottom: 10px; animation-delay: 0.3s; }
.thinking-bar-capsule-liquid .bub-5 { width: 16px; height: 16px; left: 90%; bottom: 6px; animation-delay: 1.7s; }
.thinking-bar-capsule-liquid .capsule-glass-glare { position: absolute; top: 2px; left: 10px; right: 10px; height: 35%; border-radius: 9999px; background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 70%, transparent 100%); pointer-events: none; z-index: 4; }
.thinking-bar-capsule-liquid .capsule-timer-marker { position: absolute; top: 50%; left: 100%; display: grid; place-items: center; width: 172px; height: 172px; transform: translate(-50%,-50%); animation: quiz-timer-marker-slide var(--timer-duration) linear var(--clip-start) both, liquidOrbFloat 3s ease-in-out infinite alternate; z-index: 6; }
.thinking-bar-capsule-liquid .capsule-orb-aura { position: absolute; inset: 12px; border-radius: 50%; background: radial-gradient(circle, rgba(0,229,255,0.85) 0%, rgba(0,229,255,0.3) 55%, transparent 75%); filter: blur(4px); animation: liquidPulseAura 1.8s ease-in-out infinite alternate; }
.thinking-bar-capsule-liquid .capsule-orb-core { position: absolute; inset: 24px; border-radius: 50%; border: 5px solid #FFFFFF; background: linear-gradient(145deg, #00f0ff 0%, #0080ff 60%, #7000ff 100%); box-shadow: inset 0 4px 6px rgba(255,255,255,0.8), 0 10px 24px rgba(0,0,0,0.35); display: grid; place-items: center; }
.thinking-bar-capsule-liquid .capsule-bubble-icon { font-size: 40px; line-height: 1; opacity: 0.9; }
@keyframes liquidBubbleRise { 0% { transform: translateY(0) scale(0.8); opacity: 0; } 50% { opacity: 0.9; } 100% { transform: translateY(-38px) scale(1.2); opacity: 0; } }
@keyframes liquidOrbFloat { 0% { transform: translate(-50%,-54%) scale(1); } 100% { transform: translate(-50%,-46%) scale(1.04); } }
@keyframes liquidPulseAura { 0% { transform: scale(0.92); opacity: 0.6; } 100% { transform: scale(1.15); opacity: 1; } }
`;
  },
};
