import { calculateThinkingBarTiming, type ThinkingBarRenderInput, type ThinkingBarVariant } from "../types.js";

const BOMB_TARGET_SVG = `<svg class="fuse-bomb-svg" viewBox="0 0 120 120" aria-hidden="true" data-layout-ignore><defs><radialGradient id="bombIronSphere" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#718096" /><stop offset="25%" stop-color="#2D3748" /><stop offset="65%" stop-color="#1A202C" /><stop offset="100%" stop-color="#0A0E17" /></radialGradient><linearGradient id="brassNeckGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ECC94B" /><stop offset="50%" stop-color="#D69E2E" /><stop offset="100%" stop-color="#744210" /></linearGradient><radialGradient id="fuseEntryGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FF4500" /><stop offset="100%" stop-color="rgba(255,69,0,0)" /></radialGradient></defs><rect x="50" y="8" width="20" height="14" rx="4" fill="url(#brassNeckGrad)" /><ellipse cx="60" cy="8" rx="8" ry="4" fill="#744210" /><circle cx="60" cy="68" r="44" fill="url(#bombIronSphere)" stroke="#171923" stroke-width="3" filter="drop-shadow(0 10px 20px rgba(0,0,0,0.7))" /><ellipse cx="44" cy="50" rx="14" ry="8" transform="rotate(-35 44 50)" fill="rgba(255,255,255,0.45)" /><circle cx="60" cy="74" r="16" fill="#E53E3E" stroke="#FFFFFF" stroke-width="2.5" /><path d="M60 65 L60 76 M60 80 L60 82" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" /><circle cx="60" cy="8" r="7" fill="url(#fuseEntryGlow)" /></svg>`;

const INFERNO_FLAME_SVG = `<svg class="fuse-flame-svg" viewBox="0 0 180 180" aria-hidden="true" data-layout-ignore><defs><radialGradient id="infernoOuterGrad" cx="50%" cy="65%" r="60%"><stop offset="0%" stop-color="#FFF500" /><stop offset="25%" stop-color="#FF8C00" /><stop offset="60%" stop-color="#FF1E00" /><stop offset="90%" stop-color="#990000" /><stop offset="100%" stop-color="rgba(153,0,0,0)" /></radialGradient><linearGradient id="fireRimGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FFFFFF" /><stop offset="40%" stop-color="#FFD700" /><stop offset="100%" stop-color="#FF3300" /></linearGradient><radialGradient id="obsidianChamber" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#140602" /><stop offset="70%" stop-color="#280C04" /><stop offset="100%" stop-color="#4A1507" /></radialGradient></defs><path class="flame-outer-body" d="M90 6 C108 38 148 58 152 98 C158 138 128 168 90 168 C52 168 22 138 28 98 C32 58 72 38 90 6 Z" fill="url(#infernoOuterGrad)" filter="drop-shadow(0 0 18px rgba(255,85,0,0.95))" /><path class="flame-inner-tongue" d="M90 28 C102 52 132 68 134 100 C138 128 116 150 90 150 C64 150 42 128 46 100 C48 68 78 52 90 28 Z" fill="url(#infernoOuterGrad)" opacity="0.9" /><circle cx="90" cy="104" r="46" fill="url(#obsidianChamber)" stroke="url(#fireRimGrad)" stroke-width="5" /><circle cx="90" cy="104" r="50" fill="none" stroke="#FF9900" stroke-width="2" stroke-dasharray="6 6" /></svg>`;

export const flameFuseVariant: ThinkingBarVariant = {
  id: "flame_fuse",
  displayName: "Dynamite Fuse Spark",
  description: "Thrilling dynamite burning rope fuse with animated ember sparks racing towards the finale point.",
  renderHtml(input: ThinkingBarRenderInput): string {
    const timing = calculateThinkingBarTiming(input);
    return `<div class="thinking-bar thinking-bar-flame-fuse" ${timing.styleAttr}><div class="fuse-track" aria-label="Quiz fuse timer" data-layout-allow-overflow><div class="fuse-bomb-target" data-layout-ignore aria-hidden="true">${BOMB_TARGET_SVG}</div><div class="fuse-rope-channel"><div class="fuse-rope-burnt"></div><div class="fuse-rope-unburnt"></div></div><span class="fuse-spark-marker" data-layout-allow-occlusion data-layout-allow-overlap>${INFERNO_FLAME_SVG}<div class="spark-bits" data-layout-ignore aria-hidden="true"><i>✦</i><i>•</i><i>★</i><i>✦</i><i>•</i></div><b class="marker-val val-query" data-layout-allow-overlap>?</b><b class="marker-val val-5" data-layout-allow-overlap>5</b><b class="marker-val val-4" data-layout-allow-overlap>4</b><b class="marker-val val-3" data-layout-allow-overlap>3</b><b class="marker-val val-2" data-layout-allow-overlap>2</b><b class="marker-val val-1" data-layout-allow-overlap>1</b></span></div></div>`;
  },
  renderCss(): string {
    return `
.thinking-bar-flame-fuse .fuse-track { position: relative; z-index: 0; width: 100%; height: 64px; overflow: visible; display: flex; align-items: center; }
.thinking-bar-flame-fuse .fuse-bomb-target { position: absolute; left: -28px; top: 50%; width: 92px; height: 92px; transform: translateY(-50%); z-index: 5; animation: bombThrob 1.4s ease-in-out infinite alternate; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.6)); }
.thinking-bar-flame-fuse .fuse-bomb-svg { width: 100%; height: 100%; overflow: visible; }
.thinking-bar-flame-fuse .fuse-rope-channel { position: relative; width: 100%; height: 30px; margin-left: 42px; border-radius: 15px; overflow: hidden; border: 4px solid #331A0D; background: #120904; box-shadow: inset 0 3px 8px rgba(0,0,0,0.8), 0 8px 24px rgba(0,0,0,0.45); }
.thinking-bar-flame-fuse .fuse-rope-burnt { position: absolute; inset: 0; background: repeating-linear-gradient(90deg, #181818 0px, #181818 8px, #0D0D0D 8px, #0D0D0D 16px); box-shadow: inset 0 2px 8px rgba(255,69,0,0.35); opacity: 0.9; }
.thinking-bar-flame-fuse .fuse-rope-unburnt { position: absolute; top: 0; left: 0; bottom: 0; width: 100%; border-radius: 11px; background: repeating-linear-gradient(45deg, #D4A373 0px, #D4A373 14px, #9C6634 14px, #9C6634 28px); box-shadow: inset 0 3px 6px rgba(255,255,255,0.4), inset 0 -3px 6px rgba(0,0,0,0.3); z-index: 2; animation: quiz-timer-drain var(--timer-duration) linear var(--clip-start) both; }
.thinking-bar-flame-fuse .fuse-spark-marker { position: absolute; top: 50%; left: 100%; display: grid; place-items: center; width: 180px; height: 180px; transform: translate(-50%,-50%); animation: quiz-timer-marker-slide var(--timer-duration) linear var(--clip-start) both, flameWobble 0.35s ease-in-out infinite alternate; z-index: 7; }
.thinking-bar-flame-fuse .fuse-flame-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.thinking-bar-flame-fuse .flame-outer-body { transform-origin: 50% 70%; animation: flameAuraPulse 0.5s ease-in-out infinite alternate; }
.thinking-bar-flame-fuse .flame-inner-tongue { transform-origin: 50% 70%; animation: flameAuraPulse 0.35s ease-in-out infinite alternate; }
.thinking-bar-flame-fuse .spark-bits { position: absolute; inset: 0; pointer-events: none; z-index: 6; }
.thinking-bar-flame-fuse .spark-bits i { position: absolute; font-style: normal; color: #FFE600; text-shadow: 0 0 8px #FF5500, 0 0 16px #FF0000; font-size: 18px; animation: sparkBitFly 0.75s infinite ease-out; }
.thinking-bar-flame-fuse .spark-bits i:nth-child(1) { top: -6px; left: 24%; animation-delay: 0.05s; }
.thinking-bar-flame-fuse .spark-bits i:nth-child(2) { top: -12px; right: 26%; animation-delay: 0.2s; }
.thinking-bar-flame-fuse .spark-bits i:nth-child(3) { bottom: 16px; left: 18%; animation-delay: 0.4s; font-size: 14px; }
.thinking-bar-flame-fuse .spark-bits i:nth-child(4) { top: 22px; right: 18%; animation-delay: 0.55s; }
.thinking-bar-flame-fuse .spark-bits i:nth-child(5) { bottom: 26px; right: 22%; animation-delay: 0.7s; font-size: 14px; }
.thinking-bar-flame-fuse .marker-val { text-shadow: 0 0 14px #FF5500, 0 0 28px #FF1100, 0 3px 6px rgba(0,0,0,0.95); }
@keyframes bombThrob { 0% { transform: translateY(-50%) scale(1); } 100% { transform: translateY(-50%) scale(1.14); filter: drop-shadow(0 0 18px rgba(255,69,0,0.75)); } }
@keyframes flameWobble { 0% { transform: translate(-50%,-52%) rotate(-3.5deg); } 100% { transform: translate(-50%,-48%) rotate(3.5deg); } }
@keyframes flameAuraPulse { 0% { transform: scale(0.94); opacity: 0.88; } 100% { transform: scale(1.08); opacity: 1; } }
@keyframes sparkBitFly { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-32px) scale(0.2); opacity: 0; } }
`;
  },
};
