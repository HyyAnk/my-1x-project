import { calculateThinkingBarTiming, type ThinkingBarRenderInput, type ThinkingBarVariant } from "../types.js";

export const retroPixelVariant: ThinkingBarVariant = {
  id: "retro_pixel",
  displayName: "8-Bit Arcade Heart/Blocks",
  description: "Nostalgic 8-bit chunky pixel arcade gauge with segment ticks and retro gaming font indicators.",
  renderHtml(input: ThinkingBarRenderInput): string {
    const timing = calculateThinkingBarTiming(input);
    return `<div class="thinking-bar thinking-bar-retro-pixel" ${timing.styleAttr}><div class="pixel-track" aria-label="Quiz 8-bit timer" data-layout-allow-overflow><div class="pixel-progress-wrap"><div class="pixel-progress-bar"></div></div><div class="pixel-blocks-grid" data-layout-ignore aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><span class="pixel-heart-marker" data-layout-allow-occlusion data-layout-allow-overlap><div class="pixel-heart-box"><div class="pixel-heart-symbol">♥</div></div><b class="marker-val val-query" data-layout-allow-overlap>?</b><b class="marker-val val-5" data-layout-allow-overlap>5</b><b class="marker-val val-4" data-layout-allow-overlap>4</b><b class="marker-val val-3" data-layout-allow-overlap>3</b><b class="marker-val val-2" data-layout-allow-overlap>2</b><b class="marker-val val-1" data-layout-allow-overlap>1</b></span></div></div>`;
  },
  renderCss(): string {
    return `
.thinking-bar-retro-pixel .pixel-track { position: relative; z-index: 0; width: 100%; height: 56px; overflow: visible; border: 6px solid #111111; border-radius: 6px; background: #222222; box-shadow: 0 8px 0 #000000, inset 0 4px 0 #444444, 0 12px 24px rgba(0,0,0,0.4); image-rendering: pixelated; }
.thinking-bar-retro-pixel .pixel-progress-wrap { position: absolute; inset: 4px; overflow: hidden; border-radius: 2px; }
.thinking-bar-retro-pixel .pixel-progress-bar { position: absolute; top: 0; left: 0; bottom: 0; width: 100%; background: linear-gradient(90deg, #E60000 0%, #FF8800 25%, #FFE600 60%, #00DD00 100%); background-size: 1540px 100%; background-position: left center; z-index: 1; animation: quiz-timer-drain var(--timer-duration) linear var(--clip-start) both; }
.thinking-bar-retro-pixel .pixel-blocks-grid { position: absolute; inset: 0; display: flex; z-index: 3; pointer-events: none; }
.thinking-bar-retro-pixel .pixel-blocks-grid span { flex: 1; border-right: 4px solid #111111; }
.thinking-bar-retro-pixel .pixel-blocks-grid span:last-child { border-right: none; }
.thinking-bar-retro-pixel .pixel-heart-marker { position: absolute; top: 50%; left: 100%; display: grid; place-items: center; width: 172px; height: 172px; transform: translate(-50%,-50%); animation: quiz-timer-marker-slide var(--timer-duration) linear var(--clip-start) both, pixelBounce 0.8s steps(2, jump-none) infinite alternate; z-index: 6; }
.thinking-bar-retro-pixel .pixel-heart-box { position: absolute; inset: 26px; border: 6px solid #111111; border-radius: 8px; background: #FF2255; box-shadow: 0 6px 0 #000000, inset 0 4px 0 #FFAACC; display: grid; place-items: center; }
.thinking-bar-retro-pixel .pixel-heart-symbol { font-size: 44px; line-height: 1; color: #FFFFFF; text-shadow: 0 4px 0 #880022; }
@keyframes pixelBounce { 0% { transform: translate(-50%,-53%); } 100% { transform: translate(-50%,-47%); } }
`;
  },
};
