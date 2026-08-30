import type { CounterBadgeRenderInput, CounterBadgeVariant } from "../types.js";

export const neonBadgeVariant: CounterBadgeVariant = {
  id: "neon_badge",
  displayName: "Cyber Neon Badge",
  description: "Futuristic high-voltage cyber plaque with glowing neon pylons and HUD readout.",
  renderHtml(input: CounterBadgeRenderInput): string {
    return `<div class="cb-neon-badge" data-layout-allow-occlusion><div class="neon-mount" aria-hidden="true"><span class="neon-pylon pylon-left"></span><div class="neon-mount-bar"></div><span class="neon-pylon pylon-right"></span></div><div class="neon-badge-plaque"><span class="neon-reticle reticle-tl" data-layout-ignore aria-hidden="true">⌜</span><span class="neon-reticle reticle-br" data-layout-ignore aria-hidden="true">⌟</span><div class="neon-inner-screen"><span class="question-number-val neon-num">${input.questionNumber}</span></div><span class="neon-spark spark-tr" data-layout-ignore aria-hidden="true">⚡</span><span class="neon-spark spark-bl" data-layout-ignore aria-hidden="true">✦</span></div></div>`;
  },
  renderCss(): string {
    return `
.cb-neon-badge { position: relative; z-index: 6; display: flex; flex-direction: column; align-items: center; width: 240px; transform-origin: 50% 0; animation: cyber-neon-enter .64s cubic-bezier(.18,1.42,.34,1) var(--clip-start, 0s) both, cyber-neon-float 3.8s ease-in-out calc(var(--clip-start, 0s) + .64s) infinite alternate both; }
.cb-neon-badge .neon-mount { position: relative; display: flex; justify-content: space-between; align-items: flex-start; width: 160px; height: 34px; pointer-events: none; }
.cb-neon-badge .neon-pylon { width: 8px; height: 100%; border-radius: 4px; background: linear-gradient(180deg, #00F0FF 0%, #152438 45%, #00F0FF 100%); box-shadow: 0 0 8px rgba(0,240,255,0.6); }
.cb-neon-badge .neon-mount-bar { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 70px; height: 10px; border: 1.5px solid #00F0FF; border-radius: 5px; background: #0A0E1A; box-shadow: 0 0 8px rgba(0,240,255,0.4); }
.cb-neon-badge .neon-badge-plaque { position: relative; width: 240px; height: 150px; min-height: 150px; padding: 9px; border: 4.5px solid #00F0FF; border-radius: 30px; background: linear-gradient(145deg, #121A2D 0%, #090E1A 50%, #1C0B24 100%); box-shadow: inset 0 3px 0 rgba(0,240,255,0.8), inset 0 -4px 0 rgba(255,0,122,0.75), 0 12px 0 rgba(8,16,33,0.7), 0 20px 32px rgba(0,0,0,0.4); display: grid; place-items: center; }
.cb-neon-badge .neon-reticle { position: absolute; font-family: monospace; font-size: 22px; font-weight: 900; line-height: 1; pointer-events: none; }
.cb-neon-badge .reticle-tl { top: -6px; left: -4px; color: #00F0FF; text-shadow: 0 0 8px #00F0FF; }
.cb-neon-badge .reticle-br { bottom: -6px; right: -4px; color: #FF007A; text-shadow: 0 0 8px #FF007A; }
.cb-neon-badge .neon-spark { position: absolute; pointer-events: none; }
.cb-neon-badge .spark-tr { top: -10px; right: -8px; color: #00F0FF; font-size: 24px; text-shadow: 0 0 10px #00F0FF; transform: rotate(12deg); }
.cb-neon-badge .spark-bl { bottom: -10px; left: -8px; color: #FF007A; font-size: 22px; text-shadow: 0 0 10px #FF007A; transform: rotate(-15deg); }
.cb-neon-badge .neon-inner-screen { position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; min-height: 112px; border-radius: 20px; border: 2.5px solid rgba(0,240,255,0.5); background: radial-gradient(circle at 50% 30%, rgba(0,240,255,0.14) 0%, #070B16 85%); box-shadow: inset 0 4px 12px rgba(0,0,0,0.85), inset 0 -2px 0 rgba(255,0,122,0.4); }
.cb-neon-badge .question-number-val.neon-num { font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: 76px; font-weight: 900; line-height: 1; color: #FFFFFF; text-shadow: 0 4px 0 #051A2E, 0 7px 0 #020C17, 0 0 10px rgba(0,240,255,0.8), 0 8px 18px rgba(0,0,0,0.7); letter-spacing: -1px; }
@keyframes cyber-neon-enter { 0% { transform: translateY(-70px); opacity: 0; } 70% { transform: translateY(6px); opacity: 1; } 100% { transform: translateY(0); opacity: 1; } }
@keyframes cyber-neon-float { 0% { transform: translateY(0); } 100% { transform: translateY(-6px); } }
`;
  },
};
