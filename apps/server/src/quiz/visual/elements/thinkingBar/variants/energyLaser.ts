import { calculateThinkingBarTiming, type ThinkingBarRenderInput, type ThinkingBarVariant } from "../types.js";

const REACTOR_HUD_SVG = `<svg class="laser-reactor-svg" viewBox="0 0 160 160" aria-hidden="true" data-layout-ignore><defs><linearGradient id="cyberFrameGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00F0FF" /><stop offset="50%" stop-color="#7000FF" /><stop offset="100%" stop-color="#FF0077" /></linearGradient><radialGradient id="cyberAperture" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#050C1E" /><stop offset="75%" stop-color="#0A1633" /><stop offset="100%" stop-color="#0D224E" /></radialGradient></defs><polygon points="80,12 138,45 138,115 80,148 22,115 22,45" fill="rgba(0,240,255,0.15)" stroke="url(#cyberFrameGrad)" stroke-width="6" stroke-linejoin="round" filter="drop-shadow(0 0 12px rgba(0,240,255,0.85))" /><circle cx="80" cy="80" r="46" fill="url(#cyberAperture)" stroke="#00F0FF" stroke-width="3" /><circle cx="80" cy="80" r="50" fill="none" stroke="#FF0077" stroke-width="2" stroke-dasharray="8 6" opacity="0.8" /><line x1="80" y1="26" x2="80" y2="34" stroke="#00F0FF" stroke-width="3" stroke-linecap="round" /><line x1="80" y1="126" x2="80" y2="134" stroke="#00F0FF" stroke-width="3" stroke-linecap="round" /><line x1="26" y1="80" x2="34" y2="80" stroke="#00F0FF" stroke-width="3" stroke-linecap="round" /><line x1="126" y1="80" x2="134" y2="80" stroke="#00F0FF" stroke-width="3" stroke-linecap="round" /></svg>`;

export const energyLaserVariant: ThinkingBarVariant = {
  id: "energy_laser",
  displayName: "Cyber Plasma Bar",
  description: "Sci-Fi high-voltage plasma laser beam with pulsing electric arcs and intense charge decay.",
  renderHtml(input: ThinkingBarRenderInput): string {
    const timing = calculateThinkingBarTiming(input);
    return `<div class="thinking-bar thinking-bar-energy-laser" ${timing.styleAttr}><div class="laser-track" aria-label="Quiz laser timer" data-layout-allow-overflow><div class="laser-grid-bg" data-layout-ignore aria-hidden="true"></div><div class="laser-beam-progress"><div class="laser-core-line"></div><div class="laser-energy-pulse"></div></div><div class="laser-ticks" data-layout-ignore aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><span class="laser-reactor-marker" data-layout-allow-occlusion data-layout-allow-overlap>${REACTOR_HUD_SVG}<div class="laser-sparks-fx" data-layout-ignore aria-hidden="true"><i>⚡</i><i>✦</i></div><b class="marker-val val-query" data-layout-allow-overlap>?</b><b class="marker-val val-5" data-layout-allow-overlap>5</b><b class="marker-val val-4" data-layout-allow-overlap>4</b><b class="marker-val val-3" data-layout-allow-overlap>3</b><b class="marker-val val-2" data-layout-allow-overlap>2</b><b class="marker-val val-1" data-layout-allow-overlap>1</b></span></div></div>`;
  },
  renderCss(): string {
    return `
.thinking-bar-energy-laser .laser-track { position: relative; z-index: 0; width: 100%; height: 56px; overflow: visible; border: 4px solid #00F0FF; border-radius: 14px; background: rgba(4, 10, 26, 0.92); box-shadow: 0 0 18px rgba(0, 240, 255, 0.55), inset 0 0 14px rgba(0, 240, 255, 0.3), 0 12px 32px rgba(0,0,0,0.6); }
.thinking-bar-energy-laser .laser-grid-bg { position: absolute; inset: 0; background-image: repeating-linear-gradient(90deg, rgba(0,240,255,0.09) 0px, rgba(0,240,255,0.09) 18px, transparent 18px, transparent 36px); pointer-events: none; border-radius: 10px; }
.thinking-bar-energy-laser .laser-beam-progress { position: absolute; top: 4px; left: 4px; bottom: 4px; width: calc(100% - 8px); border-radius: 8px; background: linear-gradient(90deg, #FF0055 0%, #FF5500 20%, #FFE600 50%, #00F0FF 100%); background-size: 1540px 100%; background-position: left center; z-index: 1; animation: quiz-timer-drain var(--timer-duration) linear var(--clip-start) both; overflow: hidden; }
.thinking-bar-energy-laser .laser-core-line { position: absolute; top: 50%; left: 0; right: 0; height: 6px; transform: translateY(-50%); background: #FFFFFF; box-shadow: 0 0 14px #FFFFFF, 0 0 28px #00F0FF; opacity: 0.95; }
.thinking-bar-energy-laser .laser-energy-pulse { position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%); animation: laserPulseScan 1.2s infinite linear; }
.thinking-bar-energy-laser .laser-ticks { position: absolute; inset: 0; display: flex; justify-content: space-between; padding: 0 22px; align-items: center; pointer-events: none; z-index: 3; }
.thinking-bar-energy-laser .laser-ticks span { width: 3px; height: 18px; background: rgba(0,240,255,0.7); box-shadow: 0 0 8px #00F0FF; border-radius: 2px; }
.thinking-bar-energy-laser .laser-reactor-marker { position: absolute; top: 50%; left: 100%; display: grid; place-items: center; width: 176px; height: 176px; transform: translate(-50%,-50%); animation: quiz-timer-marker-slide var(--timer-duration) linear var(--clip-start) both; z-index: 7; }
.thinking-bar-energy-laser .laser-reactor-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.thinking-bar-energy-laser .laser-sparks-fx { position: absolute; inset: 0; pointer-events: none; z-index: 6; }
.thinking-bar-energy-laser .laser-sparks-fx i { position: absolute; font-style: normal; font-size: 18px; color: #FFE600; text-shadow: 0 0 10px #00F0FF; animation: laserSparkFlicker 0.6s infinite alternate; }
.thinking-bar-energy-laser .laser-sparks-fx i:nth-child(1) { top: 6px; right: 18px; }
.thinking-bar-energy-laser .laser-sparks-fx i:nth-child(2) { bottom: 8px; left: 16px; animation-delay: 0.3s; }
@keyframes laserPulseScan { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
@keyframes laserSparkFlicker { 0% { opacity: 0.3; transform: scale(0.85); } 100% { opacity: 1; transform: scale(1.15); } }
`;
  },
};
