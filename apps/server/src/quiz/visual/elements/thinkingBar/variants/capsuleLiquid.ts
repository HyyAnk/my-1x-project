import { calculateThinkingBarTiming, type ThinkingBarRenderInput, type ThinkingBarVariant } from "../types.js";

const LIQUID_ORB_SVG = `<svg class="capsule-orb-svg" viewBox="0 0 160 160" aria-hidden="true" data-layout-ignore><defs><radialGradient id="glassSphereGrad" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="rgba(255,255,255,0.9)" /><stop offset="25%" stop-color="rgba(0,229,255,0.4)" /><stop offset="70%" stop-color="rgba(0,100,255,0.2)" /><stop offset="100%" stop-color="rgba(112,0,255,0.5)" /></radialGradient><radialGradient id="liquidAperture" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#051329" /><stop offset="75%" stop-color="#0A2244" /><stop offset="100%" stop-color="#0F3866" /></radialGradient><linearGradient id="glassRimGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF" /><stop offset="50%" stop-color="#00F0FF" /><stop offset="100%" stop-color="#7000FF" /></linearGradient></defs><circle cx="80" cy="80" r="68" fill="rgba(0,229,255,0.2)" filter="drop-shadow(0 0 16px rgba(0,229,255,0.7))" /><circle cx="80" cy="80" r="54" fill="url(#liquidAperture)" stroke="url(#glassRimGrad)" stroke-width="5" /><ellipse cx="62" cy="50" rx="16" ry="8" transform="rotate(-30 62 50)" fill="rgba(255,255,255,0.6)" /><circle cx="80" cy="80" r="54" fill="url(#glassSphereGrad)" /><circle cx="80" cy="80" r="58" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" /></svg>`;

export const capsuleLiquidVariant: ThinkingBarVariant = {
  id: "capsule_liquid",
  displayName: "Neon Jelly Liquid",
  description: "Glowing translucent capsule filled with bubbling neon fluid draining down with dynamic color shift.",
  renderHtml(input: ThinkingBarRenderInput): string {
    const timing = calculateThinkingBarTiming(input);
    return `<div class="thinking-bar thinking-bar-capsule-liquid" ${timing.styleAttr}><div class="capsule-track" aria-label="Quiz liquid timer" data-layout-allow-overflow><div class="capsule-glass-tube"><div class="capsule-liquid-fill"><div class="liquid-wave wave-front"></div><div class="liquid-bubbles" data-layout-ignore aria-hidden="true"><span class="bub bub-1"></span><span class="bub bub-2"></span><span class="bub bub-3"></span><span class="bub bub-4"></span></div></div><div class="capsule-glass-glare" data-layout-ignore aria-hidden="true"></div></div><span class="capsule-timer-marker" data-layout-allow-occlusion data-layout-allow-overlap>${LIQUID_ORB_SVG}<div class="liquid-droplets" data-layout-ignore aria-hidden="true"><i>🫧</i><i>✦</i></div><b class="marker-val val-query" data-layout-allow-overlap>?</b><b class="marker-val val-5" data-layout-allow-overlap>5</b><b class="marker-val val-4" data-layout-allow-overlap>4</b><b class="marker-val val-3" data-layout-allow-overlap>3</b><b class="marker-val val-2" data-layout-allow-overlap>2</b><b class="marker-val val-1" data-layout-allow-overlap>1</b></span></div></div>`;
  },
  renderCss(): string {
    return `
.thinking-bar-capsule-liquid .capsule-track { position: relative; z-index: 0; width: 100%; height: 60px; overflow: visible; border: 5px solid rgba(255,255,255,0.95); border-radius: 9999px; background: rgba(8, 20, 48, 0.85); box-shadow: inset 0 4px 14px rgba(0, 240, 255, 0.3), inset 0 -4px 10px rgba(0,0,0,0.6), 0 10px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0, 220, 255, 0.4); }
.thinking-bar-capsule-liquid .capsule-glass-tube { position: absolute; inset: 3px; border-radius: 9999px; overflow: hidden; }
.thinking-bar-capsule-liquid .capsule-liquid-fill { position: absolute; top: 0; left: 0; bottom: 0; width: 100%; border-radius: 9999px; background: linear-gradient(90deg, #FF1744 0%, #FF9100 25%, #00E676 60%, #00E5FF 100%); background-size: 1540px 100%; background-position: left center; z-index: 1; animation: quiz-timer-drain var(--timer-duration) linear var(--clip-start) both; overflow: hidden; }
.thinking-bar-capsule-liquid .liquid-wave { position: absolute; top: 0; bottom: 0; right: 0; width: 32px; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 100%); pointer-events: none; }
.thinking-bar-capsule-liquid .liquid-bubbles { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
.thinking-bar-capsule-liquid .bub { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.75); box-shadow: 0 0 8px rgba(255,255,255,0.95); animation: liquidBubbleRise 2.2s infinite ease-in-out; }
.thinking-bar-capsule-liquid .bub-1 { width: 10px; height: 10px; left: 15%; bottom: 6px; animation-delay: 0s; }
.thinking-bar-capsule-liquid .bub-2 { width: 14px; height: 14px; left: 40%; bottom: 8px; animation-delay: 0.6s; }
.thinking-bar-capsule-liquid .bub-3 { width: 8px; height: 8px; left: 65%; bottom: 4px; animation-delay: 1.1s; }
.thinking-bar-capsule-liquid .bub-4 { width: 12px; height: 12px; left: 85%; bottom: 10px; animation-delay: 0.3s; }
.thinking-bar-capsule-liquid .capsule-glass-glare { position: absolute; top: 2px; left: 12px; right: 12px; height: 35%; border-radius: 9999px; background: linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.1) 70%, transparent 100%); pointer-events: none; z-index: 4; }
.thinking-bar-capsule-liquid .capsule-timer-marker { position: absolute; top: 50%; left: 100%; display: grid; place-items: center; width: 172px; height: 172px; transform: translate(-50%,-50%); animation: quiz-timer-marker-slide var(--timer-duration) linear var(--clip-start) both; z-index: 7; }
.thinking-bar-capsule-liquid .capsule-orb-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.thinking-bar-capsule-liquid .liquid-droplets { position: absolute; inset: 0; pointer-events: none; z-index: 6; }
.thinking-bar-capsule-liquid .liquid-droplets i { position: absolute; font-style: normal; font-size: 16px; color: #FFF; text-shadow: 0 0 10px #00E5FF; }
.thinking-bar-capsule-liquid .liquid-droplets i:nth-child(1) { top: 4px; right: 20px; font-size: 14px; }
.thinking-bar-capsule-liquid .liquid-droplets i:nth-child(2) { bottom: 12px; left: 18px; font-size: 18px; }
@keyframes liquidBubbleRise { 0% { transform: translateY(0) scale(0.8); opacity: 0; } 50% { opacity: 0.9; } 100% { transform: translateY(-38px) scale(1.2); opacity: 0; } }
`;
  },
};

