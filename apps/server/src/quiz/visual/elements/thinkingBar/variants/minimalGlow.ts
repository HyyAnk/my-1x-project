import { calculateThinkingBarTiming, type ThinkingBarRenderInput, type ThinkingBarVariant } from "../types.js";

export const minimalGlowVariant: ThinkingBarVariant = {
  id: "minimal_glow",
  displayName: "Modern Sleek Highlight",
  description: "Ultra-clean modern frosted-glass pill with smooth running neon accent line and elegant typography.",
  renderHtml(input: ThinkingBarRenderInput): string {
    const timing = calculateThinkingBarTiming(input);
    return `<div class="thinking-bar thinking-bar-minimal-glow" ${timing.styleAttr}><div class="minimal-track" aria-label="Quiz modern timer" data-layout-allow-overflow><div class="minimal-progress-bar"><div class="minimal-glow-edge"></div></div><span class="minimal-timer-marker" data-layout-allow-occlusion data-layout-allow-overlap><div class="minimal-disc-aura"></div><div class="minimal-disc-core"><div class="minimal-pulse-ring"></div></div><b class="marker-val val-query" data-layout-allow-overlap>?</b><b class="marker-val val-5" data-layout-allow-overlap>5</b><b class="marker-val val-4" data-layout-allow-overlap>4</b><b class="marker-val val-3" data-layout-allow-overlap>3</b><b class="marker-val val-2" data-layout-allow-overlap>2</b><b class="marker-val val-1" data-layout-allow-overlap>1</b></span></div></div>`;
  },
  renderCss(): string {
    return `
.thinking-bar-minimal-glow .minimal-track { position: relative; z-index: 0; width: 100%; height: 50px; overflow: visible; border: 3px solid rgba(255, 255, 255, 0.4); border-radius: 9999px; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(12px); box-shadow: 0 10px 30px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2); }
.thinking-bar-minimal-glow .minimal-progress-bar { position: absolute; top: 3px; left: 3px; bottom: 3px; width: calc(100% - 6px); border-radius: 9999px; background: linear-gradient(90deg, #F43F5E 0%, #FB923C 25%, #FACC15 50%, #38BDF8 80%, #818CF8 100%); background-size: 1540px 100%; background-position: left center; z-index: 1; animation: quiz-timer-drain var(--timer-duration) linear var(--clip-start) both; overflow: hidden; }
.thinking-bar-minimal-glow .minimal-glow-edge { position: absolute; top: 0; bottom: 0; right: 0; width: 16px; background: #FFFFFF; box-shadow: 0 0 14px #FFFFFF, 0 0 24px #38BDF8; }
.thinking-bar-minimal-glow .minimal-timer-marker { position: absolute; top: 50%; left: 100%; display: grid; place-items: center; width: 164px; height: 164px; transform: translate(-50%,-50%); animation: quiz-timer-marker-slide var(--timer-duration) linear var(--clip-start) both, minimalBreathe 2.4s ease-in-out infinite alternate; z-index: 6; }
.thinking-bar-minimal-glow .minimal-disc-aura { position: absolute; inset: 16px; border-radius: 50%; background: radial-gradient(circle, rgba(56,189,248,0.7) 0%, rgba(129,140,248,0.3) 50%, transparent 75%); filter: blur(6px); }
.thinking-bar-minimal-glow .minimal-disc-core { position: absolute; inset: 28px; border-radius: 50%; border: 4px solid #FFFFFF; background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); box-shadow: 0 8px 24px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.4); display: grid; place-items: center; }
.thinking-bar-minimal-glow .minimal-pulse-ring { position: absolute; inset: -8px; border-radius: 50%; border: 2px solid rgba(56,189,248,0.6); animation: minimalRingExpand 2s infinite ease-out; }
@keyframes minimalBreathe { 0% { transform: translate(-50%,-50%) scale(0.96); } 100% { transform: translate(-50%,-50%) scale(1.04); } }
@keyframes minimalRingExpand { 0% { transform: scale(0.9); opacity: 0.8; } 100% { transform: scale(1.3); opacity: 0; } }
`;
  },
};
