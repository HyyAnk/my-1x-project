import type { CounterBadgeRenderInput, CounterBadgeVariant } from "../types.js";

export const spaceRadarVariant: CounterBadgeVariant = {
  id: "space_radar",
  displayName: "Space Radar Scope",
  description:
    "Circular tactical radar sweep display tracking quiz question progression with concentric grid rings and glowing sweep ping.",
  renderHtml(input: CounterBadgeRenderInput): string {
    return `<div class="cb-space-radar" data-counter-badge data-layout-allow-occlusion><div class="radar-mount" aria-hidden="true"><span class="radar-mast mast-left"></span><div class="radar-dish-sensor"><span class="radar-beacon"></span></div><span class="radar-mast mast-right"></span></div><div class="radar-scope-housing" data-counter-badge-body><span class="radar-reticle reticle-tl" data-layout-ignore aria-hidden="true">⌜</span><span class="radar-reticle reticle-br" data-layout-ignore aria-hidden="true">⌟</span><div class="radar-telemetry-grid" aria-hidden="true"><span class="radar-grid-ring ring-outer"></span><span class="radar-grid-ring ring-inner"></span><span class="radar-axis axis-h"></span><span class="radar-axis axis-v"></span><div class="radar-sweep-arm"></div></div><div class="radar-inner-screen"><span class="question-number-val radar-num">${input.questionNumber}</span></div><span class="radar-blip blip-tr" data-layout-ignore aria-hidden="true"></span><span class="radar-spark spark-bl" data-layout-ignore aria-hidden="true">✦</span></div></div>`;
  },
  renderCss(): string {
    return `
.cb-space-radar { --counter-badge-mount-height: 64px; --counter-badge-body-height: 148px; position: relative; z-index: 6; display: flex; flex-direction: column; align-items: center; width: 240px; transform-origin: 50% 0; animation: space-radar-enter .64s cubic-bezier(.18,1.42,.34,1) var(--clip-start, 0s) both, space-radar-hover 4.2s ease-in-out calc(var(--clip-start, 0s) + .64s) infinite alternate both; contain: layout style; will-change: transform; }
.cb-space-radar .radar-mount { position: relative; display: flex; justify-content: space-between; align-items: flex-start; width: 160px; height: 64px; pointer-events: none; }
.cb-space-radar .radar-mast { width: 8px; height: calc(100% + 8px); margin-top: -8px; border-radius: 4px; background: linear-gradient(180deg, var(--bg-accent, #00f0ff) 0%, var(--bg-primary, #0a1128) 50%, var(--bg-accent, #00f0ff) 100%); box-shadow: 0 0 8px var(--bg-accent, rgba(0,240,255,0.6)); }
.cb-space-radar .radar-dish-sensor { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 44px; height: 12px; border: 1.5px solid var(--bg-accent, #00f0ff); border-radius: 6px; background: var(--bg-primary, #060d1f); box-shadow: 0 0 8px var(--bg-accent, rgba(0,240,255,0.5)); display: grid; place-items: center; }
.cb-space-radar .radar-beacon { width: 6px; height: 6px; border-radius: 50%; background: #ff3366; box-shadow: 0 0 6px #ff3366; animation: radar-beacon-blink 1.4s ease-in-out infinite; }
.cb-space-radar .radar-scope-housing { position: relative; width: 236px; height: 148px; min-height: 148px; padding: 8px; border: 4.5px solid var(--bg-accent, #00f0ff); border-radius: 28px; background: radial-gradient(circle at 50% 50%, var(--bg-secondary, #0c1836) 0%, var(--bg-primary, #040817) 100%); box-shadow: inset 0 0 16px var(--bg-accent, rgba(0,240,255,0.4)), inset 0 3px 0 rgba(255,255,255,0.3), 0 10px 0 rgba(2,6,18,0.7), 0 18px 28px rgba(0,0,0,0.5); display: grid; place-items: center; overflow: hidden; }
.cb-space-radar .radar-telemetry-grid { position: absolute; inset: 8px; border-radius: 20px; overflow: hidden; pointer-events: none; }
.cb-space-radar .radar-grid-ring { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border-radius: 50%; }
.cb-space-radar .ring-outer { width: 130px; height: 130px; border: 1px dashed var(--bg-accent, rgba(0,240,255,0.3)); }
.cb-space-radar .ring-inner { width: 80px; height: 80px; border: 1px dotted var(--bg-accent, rgba(0,240,255,0.25)); }
.cb-space-radar .radar-axis { position: absolute; background: var(--bg-accent, rgba(0,240,255,0.2)); }
.cb-space-radar .axis-h { top: 50%; left: 0; right: 0; height: 1px; transform: translateY(-50%); }
.cb-space-radar .axis-v { left: 50%; top: 0; bottom: 0; width: 1px; transform: translateX(-50%); }
.cb-space-radar .radar-sweep-arm { position: absolute; top: 50%; left: 50%; width: 160px; height: 160px; margin-top: -80px; margin-left: -80px; border-radius: 50%; background: conic-gradient(from 0deg, transparent 0deg, transparent 280deg, var(--bg-accent, rgba(0,240,255,0.4)) 360deg); animation: radar-sweep-spin 3.2s linear infinite; pointer-events: none; }
.cb-space-radar .radar-reticle { position: absolute; font-family: monospace; font-size: 22px; font-weight: 900; line-height: 1; pointer-events: none; z-index: 3; }
.cb-space-radar .reticle-tl { top: 2px; left: 4px; color: var(--bg-accent, #00f0ff); text-shadow: 0 0 8px var(--bg-accent, #00f0ff); }
.cb-space-radar .reticle-br { bottom: 2px; right: 4px; color: var(--bg-secondary, #7928ca); text-shadow: 0 0 8px var(--bg-secondary, #7928ca); }
.cb-space-radar .radar-blip { position: absolute; width: 8px; height: 8px; border-radius: 50%; background: #00ff88; box-shadow: 0 0 8px #00ff88; animation: radar-blip-pulse 1.8s ease-in-out infinite; z-index: 2; pointer-events: none; }
.cb-space-radar .blip-tr { top: 24px; right: 36px; }
.cb-space-radar .radar-spark { position: absolute; pointer-events: none; z-index: 3; }
.cb-space-radar .spark-bl { bottom: 14px; left: 18px; color: var(--bg-accent, #00f0ff); font-size: 16px; text-shadow: 0 0 8px var(--bg-accent, #00f0ff); }
.cb-space-radar .radar-inner-screen { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; min-height: 110px; border-radius: 20px; border: 2px solid var(--bg-accent, rgba(0,240,255,0.4)); background: radial-gradient(circle at 50% 50%, rgba(0,240,255,0.12) 0%, rgba(4,8,23,0.85) 85%); box-shadow: inset 0 0 14px rgba(0,0,0,0.8); }
.cb-space-radar .question-number-val.radar-num { font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: 76px; font-weight: 900; line-height: 1; color: #ffffff; text-shadow: 0 4px 0 #040d1a, 0 0 12px var(--bg-accent, #00f0ff), 0 0 24px var(--bg-accent, rgba(0,240,255,0.6)); letter-spacing: -1px; }
@keyframes space-radar-enter { 0% { transform: translateY(-70px) scale(0.92); opacity: 0; } 70% { transform: translateY(6px) scale(1.02); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
@keyframes space-radar-hover { 0% { transform: translateY(0); } 100% { transform: translateY(-6px); } }
@keyframes radar-sweep-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes radar-beacon-blink { 0%, 100% { opacity: 0.3; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.15); } }
@keyframes radar-blip-pulse { 0%, 100% { opacity: 0.2; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1.3); } }
`;
  },
};
