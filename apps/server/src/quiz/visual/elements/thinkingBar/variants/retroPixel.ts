import { calculateThinkingBarTiming, type ThinkingBarRenderInput, type ThinkingBarVariant } from "../types.js";

const PIXEL_HEART_SVG = `<svg class="pixel-heart-svg" viewBox="0 0 160 160" aria-hidden="true" data-layout-ignore shape-rendering="crispEdges"><defs><linearGradient id="pixelHeartGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FF2A6D" /><stop offset="100%" stop-color="#D30040" /></linearGradient></defs><rect x="36" y="24" width="36" height="36" fill="#000" /><rect x="88" y="24" width="36" height="36" fill="#000" /><rect x="24" y="36" width="112" height="60" fill="#000" /><rect x="36" y="96" width="88" height="24" fill="#000" /><rect x="52" y="120" width="56" height="16" fill="#000" /><rect x="68" y="136" width="24" height="12" fill="#000" /><rect x="40" y="28" width="28" height="28" fill="url(#pixelHeartGrad)" /><rect x="92" y="28" width="28" height="28" fill="url(#pixelHeartGrad)" /><rect x="28" y="40" width="104" height="52" fill="url(#pixelHeartGrad)" /><rect x="40" y="92" width="80" height="24" fill="url(#pixelHeartGrad)" /><rect x="56" y="116" width="48" height="16" fill="url(#pixelHeartGrad)" /><rect x="72" y="132" width="16" height="12" fill="url(#pixelHeartGrad)" /><rect x="40" y="32" width="12" height="12" fill="#FFF" /><rect x="32" y="44" width="12" height="12" fill="#FFF" /><rect x="48" y="48" width="64" height="64" rx="8" fill="#120208" stroke="#000" stroke-width="4" /></svg>`;

export const retroPixelVariant: ThinkingBarVariant = {
  id: "retro_pixel",
  displayName: "8-Bit Arcade Heart/Blocks",
  description: "Nostalgic 8-bit chunky pixel arcade gauge with segment ticks and retro gaming font indicators.",
  renderHtml(input: ThinkingBarRenderInput): string {
    const timing = calculateThinkingBarTiming(input);
    return `<div class="thinking-bar thinking-bar-retro-pixel" ${timing.styleAttr}><div class="pixel-track" aria-label="Quiz 8-bit timer" data-layout-allow-overflow><div class="pixel-progress-wrap"><div class="pixel-progress-bar"></div></div><div class="pixel-blocks-grid" data-layout-ignore aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><span class="pixel-heart-marker" data-layout-allow-occlusion data-layout-allow-overlap>${PIXEL_HEART_SVG}<div class="pixel-spark-bits" data-layout-ignore aria-hidden="true"><i>★</i><i>✦</i></div><b class="marker-val val-query" data-layout-allow-overlap>?</b><b class="marker-val val-5" data-layout-allow-overlap>5</b><b class="marker-val val-4" data-layout-allow-overlap>4</b><b class="marker-val val-3" data-layout-allow-overlap>3</b><b class="marker-val val-2" data-layout-allow-overlap>2</b><b class="marker-val val-1" data-layout-allow-overlap>1</b></span></div></div>`;
  },
  renderCss(): string {
    return `
.thinking-bar-retro-pixel .pixel-track { position: relative; z-index: 0; width: 100%; height: 58px; overflow: visible; border: 6px solid #0D0D0D; border-radius: 6px; background: #1A1A1A; box-shadow: 0 8px 0 #000000, inset 0 4px 0 #333333, 0 12px 28px rgba(0,0,0,0.5); image-rendering: pixelated; }
.thinking-bar-retro-pixel .pixel-progress-wrap { position: absolute; inset: 4px; overflow: hidden; border-radius: 2px; }
.thinking-bar-retro-pixel .pixel-progress-bar { position: absolute; top: 0; left: 0; bottom: 0; width: 100%; background: linear-gradient(90deg, #E60000 0%, #FF8800 25%, #FFE600 60%, #00DD00 100%); background-size: 1540px 100%; background-position: left center; z-index: 1; animation: quiz-timer-drain var(--timer-duration) linear var(--clip-start) both; }
.thinking-bar-retro-pixel .pixel-blocks-grid { position: absolute; inset: 0; display: flex; z-index: 3; pointer-events: none; }
.thinking-bar-retro-pixel .pixel-blocks-grid span { flex: 1; border-right: 5px solid #0D0D0D; }
.thinking-bar-retro-pixel .pixel-blocks-grid span:last-child { border-right: none; }
.thinking-bar-retro-pixel .pixel-heart-marker { position: absolute; top: 50%; left: 100%; display: grid; place-items: center; width: 172px; height: 172px; transform: translate(-50%,-50%); animation: quiz-timer-marker-slide var(--timer-duration) linear var(--clip-start) both; z-index: 7; }
.thinking-bar-retro-pixel .pixel-heart-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; animation: pixelBounce 0.8s steps(2, jump-none) infinite alternate; }
.thinking-bar-retro-pixel .pixel-spark-bits { position: absolute; inset: 0; pointer-events: none; z-index: 6; }
.thinking-bar-retro-pixel .pixel-spark-bits i { position: absolute; font-style: normal; font-size: 16px; color: #FFE600; text-shadow: 2px 2px 0 #000; }
.thinking-bar-retro-pixel .pixel-spark-bits i:nth-child(1) { top: 2px; right: 18px; }
.thinking-bar-retro-pixel .pixel-spark-bits i:nth-child(2) { bottom: 12px; left: 16px; }
@keyframes pixelBounce { 0% { transform: translateY(-4px); } 100% { transform: translateY(4px); } }
`;
  },
};

