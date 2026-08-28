import { calculateThinkingBarTiming, type ThinkingBarRenderInput, type ThinkingBarVariant } from "../types.js";

export const flameFuseVariant: ThinkingBarVariant = {
  id: "flame_fuse",
  displayName: "Dynamite Fuse Spark",
  description: "Thrilling dynamite burning rope fuse with animated ember sparks racing towards the finale point.",
  renderHtml(input: ThinkingBarRenderInput): string {
    const timing = calculateThinkingBarTiming(input);
    return `<div class="thinking-bar thinking-bar-flame-fuse" ${timing.styleAttr}><div class="fuse-track" aria-label="Quiz fuse timer" data-layout-allow-overflow><div class="fuse-rope-wrap"><div class="fuse-rope-unburned"></div></div><div class="fuse-bomb-end" data-layout-ignore aria-hidden="true"><span class="bomb-icon">💣</span></div><span class="fuse-spark-marker" data-layout-allow-occlusion data-layout-allow-overlap><div class="flame-aura"></div><div class="flame-core"><span class="flame-fire-icon">🔥</span><div class="spark-bits" data-layout-ignore aria-hidden="true"><i>✦</i><i>•</i><i>★</i></div></div><b class="marker-val val-query" data-layout-allow-overlap>?</b><b class="marker-val val-5" data-layout-allow-overlap>5</b><b class="marker-val val-4" data-layout-allow-overlap>4</b><b class="marker-val val-3" data-layout-allow-overlap>3</b><b class="marker-val val-2" data-layout-allow-overlap>2</b><b class="marker-val val-1" data-layout-allow-overlap>1</b></span></div></div>`;
  },
  renderCss(): string {
    return `
.thinking-bar-flame-fuse .fuse-track { position: relative; z-index: 0; width: 100%; height: 56px; overflow: visible; display: flex; align-items: center; }
.thinking-bar-flame-fuse .fuse-rope-wrap { position: relative; flex: 1; height: 32px; overflow: hidden; border-radius: 16px; border: 4px solid #4A2810; background: #241407; box-shadow: inset 0 3px 6px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.35); }
.thinking-bar-flame-fuse .fuse-rope-unburned { position: absolute; top: 0; left: 0; bottom: 0; width: 100%; border-radius: 12px; background: repeating-linear-gradient(45deg, #D4A373 0px, #D4A373 10px, #8B5A2B 10px, #8B5A2B 20px); z-index: 1; animation: quiz-timer-drain var(--timer-duration) linear var(--clip-start) both; }
.thinking-bar-flame-fuse .fuse-bomb-end { margin-left: 12px; width: 68px; height: 68px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #555 0%, #111 70%); border: 4px solid #000; box-shadow: 0 8px 16px rgba(0,0,0,0.4), inset 0 4px 6px rgba(255,255,255,0.3); display: grid; place-items: center; flex: 0 0 auto; animation: bombThrob 1.4s ease-in-out infinite alternate; }
.thinking-bar-flame-fuse .bomb-icon { font-size: 38px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); }
.thinking-bar-flame-fuse .fuse-spark-marker { position: absolute; top: 50%; left: calc(100% - 80px); display: grid; place-items: center; width: 176px; height: 176px; transform: translate(-50%,-50%); animation: quiz-timer-marker-slide var(--timer-duration) linear var(--clip-start) both, flameWobble 0.3s ease-in-out infinite alternate; z-index: 6; }
.thinking-bar-flame-fuse .flame-aura { position: absolute; inset: 12px; border-radius: 50%; background: radial-gradient(circle, rgba(255,100,0,0.9) 0%, rgba(255,200,0,0.4) 50%, transparent 75%); filter: blur(6px); animation: flameAuraPulse 0.5s infinite alternate; }
.thinking-bar-flame-fuse .flame-core { position: absolute; inset: 24px; border-radius: 50%; border: 5px solid #FFF4B8; background: linear-gradient(145deg, #FFDD00 0%, #FF5500 60%, #CC0000 100%); box-shadow: 0 0 20px #FF7700, inset 0 4px 8px #FFF; display: grid; place-items: center; }
.thinking-bar-flame-fuse .flame-fire-icon { font-size: 42px; line-height: 1; }
.thinking-bar-flame-fuse .spark-bits i { position: absolute; font-style: normal; color: #FFE600; text-shadow: 0 0 6px #FF5500; font-size: 16px; animation: sparkBitFly 0.6s infinite ease-out; }
.thinking-bar-flame-fuse .spark-bits i:nth-child(1) { top: -8px; left: 20%; animation-delay: 0.1s; }
.thinking-bar-flame-fuse .spark-bits i:nth-child(2) { top: -12px; right: 25%; animation-delay: 0.3s; }
.thinking-bar-flame-fuse .spark-bits i:nth-child(3) { bottom: -6px; left: 40%; animation-delay: 0.5s; }
@keyframes bombThrob { 0% { transform: scale(1); } 100% { transform: scale(1.12); } }
@keyframes flameWobble { 0% { transform: translate(-50%,-53%) rotate(-4deg); } 100% { transform: translate(-50%,-47%) rotate(4deg); } }
@keyframes flameAuraPulse { 0% { transform: scale(0.9); opacity: 0.7; } 100% { transform: scale(1.15); opacity: 1; } }
@keyframes sparkBitFly { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-24px) scale(0.3); opacity: 0; } }
`;
  },
};
