import { calculateThinkingBarTiming, type ThinkingBarRenderInput, type ThinkingBarVariant } from "../types.js";

const BOMB_SVG = `<svg class="fuse-bomb-svg" viewBox="0 0 100 100" aria-hidden="true" data-layout-ignore><defs><radialGradient id="bombGrad" cx="35%" cy="35%" r="65%"><stop offset="0%" stop-color="#4A5568" /><stop offset="45%" stop-color="#1A202C" /><stop offset="100%" stop-color="#0A0D14" /></radialGradient><linearGradient id="bombCapGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F6E05E" /><stop offset="100%" stop-color="#D69E2E" /></linearGradient></defs><rect x="42" y="6" width="16" height="12" rx="3" fill="url(#bombCapGrad)" stroke="#744210" stroke-width="2" /><circle cx="50" cy="58" r="38" fill="url(#bombGrad)" stroke="#2D3748" stroke-width="4" /><ellipse cx="36" cy="42" rx="10" ry="6" transform="rotate(-30 36 42)" fill="rgba(255,255,255,0.4)" /><circle cx="50" cy="58" r="14" fill="#C53030" opacity="0.85" /><text x="50" y="63" font-size="14" font-weight="900" text-anchor="middle" fill="#FFFFFF">!</text></svg>`;

const FLAME_MARKER_SVG = `<svg class="fuse-flame-svg" viewBox="0 0 160 160" aria-hidden="true" data-layout-ignore><defs><radialGradient id="flameOuterGrad" cx="50%" cy="65%" r="55%"><stop offset="0%" stop-color="#FFDD00" /><stop offset="40%" stop-color="#FF6B00" /><stop offset="85%" stop-color="#E53E3E" /><stop offset="100%" stop-color="rgba(197,48,48,0)" /></radialGradient><radialGradient id="flameCenterAperture" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#1A0B02" /><stop offset="80%" stop-color="#3D1A04" /><stop offset="100%" stop-color="#7B241C" /></radialGradient></defs><path class="flame-outer-pulse" d="M80 8 C95 38 126 55 130 88 C135 122 110 148 80 148 C50 148 25 122 30 88 C34 55 65 38 80 8 Z" fill="url(#flameOuterGrad)" filter="drop-shadow(0 0 16px rgba(255,107,0,0.85))" /><circle cx="80" cy="92" r="44" fill="url(#flameCenterAperture)" stroke="#FFD700" stroke-width="5" /><circle cx="80" cy="92" r="46" fill="none" stroke="#FF5500" stroke-width="2" stroke-dasharray="4 4" /></svg>`;

export const flameFuseVariant: ThinkingBarVariant = {
  id: "flame_fuse",
  displayName: "Dynamite Fuse Spark",
  description: "Thrilling dynamite burning rope fuse with animated ember sparks racing towards the finale point.",
  renderHtml(input: ThinkingBarRenderInput): string {
    const timing = calculateThinkingBarTiming(input);
    return `<div class="thinking-bar thinking-bar-flame-fuse" ${timing.styleAttr}><div class="fuse-track" aria-label="Quiz fuse timer" data-layout-allow-overflow><div class="fuse-bomb-target" data-layout-ignore aria-hidden="true">${BOMB_SVG}</div><div class="fuse-rope-channel"><div class="fuse-rope-burnt"></div><div class="fuse-rope-unburnt"></div></div><span class="fuse-spark-marker" data-layout-allow-occlusion data-layout-allow-overlap>${FLAME_MARKER_SVG}<div class="spark-bits" data-layout-ignore aria-hidden="true"><i>✦</i><i>•</i><i>★</i><i>✦</i></div><b class="marker-val val-query" data-layout-allow-overlap>?</b><b class="marker-val val-5" data-layout-allow-overlap>5</b><b class="marker-val val-4" data-layout-allow-overlap>4</b><b class="marker-val val-3" data-layout-allow-overlap>3</b><b class="marker-val val-2" data-layout-allow-overlap>2</b><b class="marker-val val-1" data-layout-allow-overlap>1</b></span></div></div>`;
  },
  renderCss(): string {
    return `
.thinking-bar-flame-fuse .fuse-track { position: relative; z-index: 0; width: 100%; height: 60px; overflow: visible; display: flex; align-items: center; }
.thinking-bar-flame-fuse .fuse-bomb-target { position: absolute; left: -24px; top: 50%; width: 84px; height: 84px; transform: translateY(-50%); z-index: 5; animation: bombThrob 1.4s ease-in-out infinite alternate; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.5)); }
.thinking-bar-flame-fuse .fuse-bomb-svg { width: 100%; height: 100%; overflow: visible; }
.thinking-bar-flame-fuse .fuse-rope-channel { position: relative; width: 100%; height: 28px; margin-left: 36px; border-radius: 14px; overflow: hidden; border: 4px solid #3B2314; background: #1C1008; box-shadow: inset 0 3px 6px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4); }
.thinking-bar-flame-fuse .fuse-rope-burnt { position: absolute; inset: 0; background: repeating-linear-gradient(90deg, #1A1A1A 0px, #1A1A1A 6px, #0D0D0D 6px, #0D0D0D 12px); opacity: 0.85; }
.thinking-bar-flame-fuse .fuse-rope-unburnt { position: absolute; top: 0; left: 0; bottom: 0; width: 100%; border-radius: 10px; background: repeating-linear-gradient(45deg, #D4A373 0px, #D4A373 12px, #9C6634 12px, #9C6634 24px); box-shadow: inset 0 2px 4px rgba(255,255,255,0.3); z-index: 2; animation: quiz-timer-drain var(--timer-duration) linear var(--clip-start) both; }
.thinking-bar-flame-fuse .fuse-spark-marker { position: absolute; top: 50%; left: 100%; display: grid; place-items: center; width: 176px; height: 176px; transform: translate(-50%,-50%); animation: quiz-timer-marker-slide var(--timer-duration) linear var(--clip-start) both, flameWobble 0.4s ease-in-out infinite alternate; z-index: 7; }
.thinking-bar-flame-fuse .fuse-flame-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.thinking-bar-flame-fuse .flame-outer-pulse { transform-origin: 50% 70%; animation: flameAuraPulse 0.6s ease-in-out infinite alternate; }
.thinking-bar-flame-fuse .spark-bits { position: absolute; inset: 0; pointer-events: none; z-index: 6; }
.thinking-bar-flame-fuse .spark-bits i { position: absolute; font-style: normal; color: #FFE600; text-shadow: 0 0 8px #FF5500, 0 0 14px #FF0000; font-size: 18px; animation: sparkBitFly 0.8s infinite ease-out; }
.thinking-bar-flame-fuse .spark-bits i:nth-child(1) { top: -4px; left: 22%; animation-delay: 0.05s; }
.thinking-bar-flame-fuse .spark-bits i:nth-child(2) { top: -10px; right: 24%; animation-delay: 0.25s; }
.thinking-bar-flame-fuse .spark-bits i:nth-child(3) { bottom: 12px; left: 18%; animation-delay: 0.45s; }
.thinking-bar-flame-fuse .spark-bits i:nth-child(4) { top: 18px; right: 16%; animation-delay: 0.65s; }
@keyframes bombThrob { 0% { transform: translateY(-50%) scale(1); } 100% { transform: translateY(-50%) scale(1.12); filter: drop-shadow(0 0 16px rgba(255,80,0,0.6)); } }
@keyframes flameWobble { 0% { transform: translate(-50%,-52%) rotate(-3deg); } 100% { transform: translate(-50%,-48%) rotate(3deg); } }
@keyframes flameAuraPulse { 0% { transform: scale(0.95); opacity: 0.85; } 100% { transform: scale(1.08); opacity: 1; } }
@keyframes sparkBitFly { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-28px) scale(0.2); opacity: 0; } }
`;
  },
};

