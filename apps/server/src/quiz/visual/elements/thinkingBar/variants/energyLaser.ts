import { calculateThinkingBarTiming, type ThinkingBarRenderInput, type ThinkingBarVariant } from "../types.js";

export const energyLaserVariant: ThinkingBarVariant = {
  id: "energy_laser",
  displayName: "Cyber Plasma Bar",
  description: "Sci-Fi high-voltage plasma laser beam with pulsing electric arcs and intense charge decay.",
  renderHtml(input: ThinkingBarRenderInput): string {
    const timing = calculateThinkingBarTiming(input);
    return `<div class="thinking-bar thinking-bar-energy-laser" ${timing.styleAttr}><div class="laser-track" aria-label="Quiz laser timer" data-layout-allow-overflow><div class="laser-grid-bg" data-layout-ignore aria-hidden="true"></div><div class="laser-beam-progress"><div class="laser-core-line"></div><div class="laser-energy-pulse"></div></div><div class="laser-ticks" data-layout-ignore aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><span class="laser-reactor-marker" data-layout-allow-occlusion data-layout-allow-overlap><div class="reactor-hex-aura"></div><div class="reactor-hex-frame"><div class="reactor-spark-icon">⚡</div></div><b class="marker-val val-query" data-layout-allow-overlap>?</b><b class="marker-val val-5" data-layout-allow-overlap>5</b><b class="marker-val val-4" data-layout-allow-overlap>4</b><b class="marker-val val-3" data-layout-allow-overlap>3</b><b class="marker-val val-2" data-layout-allow-overlap>2</b><b class="marker-val val-1" data-layout-allow-overlap>1</b></span></div></div>`;
  },
  renderCss(): string {
    return `
.thinking-bar-energy-laser .laser-track { position: relative; z-index: 0; width: 100%; height: 56px; overflow: visible; border: 4px solid #00F0FF; border-radius: 12px; background: rgba(5, 12, 30, 0.88); box-shadow: 0 0 16px rgba(0, 240, 255, 0.5), inset 0 0 12px rgba(0, 240, 255, 0.25), 0 12px 30px rgba(0,0,0,0.5); }
.thinking-bar-energy-laser .laser-grid-bg { position: absolute; inset: 0; background-image: repeating-linear-gradient(90deg, rgba(0,240,255,0.08) 0px, rgba(0,240,255,0.08) 20px, transparent 20px, transparent 40px); pointer-events: none; border-radius: 8px; }
.thinking-bar-energy-laser .laser-beam-progress { position: absolute; top: 3px; left: 3px; bottom: 3px; width: calc(100% - 6px); border-radius: 8px; background: linear-gradient(90deg, #FF0055 0%, #FF5500 20%, #FFE600 50%, #00F0FF 100%); background-size: 1540px 100%; background-position: left center; z-index: 1; animation: quiz-timer-drain var(--timer-duration) linear var(--clip-start) both; overflow: hidden; }
.thinking-bar-energy-laser .laser-core-line { position: absolute; top: 50%; left: 0; right: 0; height: 6px; transform: translateY(-50%); background: #FFFFFF; box-shadow: 0 0 12px #FFFFFF, 0 0 24px #00F0FF; opacity: 0.9; }
.thinking-bar-energy-laser .laser-energy-pulse { position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%); animation: laserPulseScan 1.2s infinite linear; }
.thinking-bar-energy-laser .laser-ticks { position: absolute; inset: 0; display: flex; justify-content: space-between; padding: 0 20px; align-items: center; pointer-events: none; z-index: 3; }
.thinking-bar-energy-laser .laser-ticks span { width: 3px; height: 16px; background: rgba(0,240,255,0.6); box-shadow: 0 0 6px #00F0FF; border-radius: 2px; }
.thinking-bar-energy-laser .laser-reactor-marker { position: absolute; top: 50%; left: 100%; display: grid; place-items: center; width: 176px; height: 176px; transform: translate(-50%,-50%); animation: quiz-timer-marker-slide var(--timer-duration) linear var(--clip-start) both, laserReactorGlow 1.6s ease-in-out infinite alternate; z-index: 6; }
.thinking-bar-energy-laser .reactor-hex-aura { position: absolute; inset: 10px; border-radius: 24px; background: radial-gradient(circle, rgba(0,240,255,0.9) 0%, rgba(255,0,85,0.4) 50%, transparent 75%); filter: blur(6px); }
.thinking-bar-energy-laser .reactor-hex-frame { position: absolute; inset: 26px; border: 5px solid #00F0FF; border-radius: 26px; background: linear-gradient(135deg, #0A1935 0%, #170030 100%); box-shadow: 0 0 20px #00F0FF, inset 0 0 14px rgba(0,240,255,0.6); display: grid; place-items: center; }
.thinking-bar-energy-laser .reactor-spark-icon { font-size: 38px; line-height: 1; color: #FFE600; text-shadow: 0 0 12px #FFE600, 0 0 24px #FF5500; animation: laserSparkFlicker 0.4s infinite alternate; }
@keyframes laserPulseScan { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
@keyframes laserReactorGlow { 0% { transform: translate(-50%,-50%) scale(0.96); filter: drop-shadow(0 0 10px rgba(0,240,255,0.6)); } 100% { transform: translate(-50%,-50%) scale(1.05); filter: drop-shadow(0 0 24px rgba(255,0,128,0.8)); } }
@keyframes laserSparkFlicker { 0% { opacity: 0.7; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1.1); } }
`;
  },
};
