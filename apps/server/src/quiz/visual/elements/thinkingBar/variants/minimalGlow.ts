import { calculateThinkingBarTiming, type ThinkingBarRenderInput, type ThinkingBarVariant } from "../types.js";

const MINIMAL_DISC_SVG = `<svg class="minimal-disc-svg" viewBox="0 0 160 160" aria-hidden="true" data-layout-ignore><defs><linearGradient id="minimalRimGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF" /><stop offset="60%" stop-color="#E2E8F0" /><stop offset="100%" stop-color="#94A3B8" /></linearGradient><radialGradient id="minimalCoreGrad" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#0F172A" /><stop offset="80%" stop-color="#1E293B" /><stop offset="100%" stop-color="#334155" /></radialGradient></defs><circle cx="80" cy="80" r="66" fill="rgba(56,189,248,0.15)" filter="drop-shadow(0 0 18px rgba(56,189,248,0.65))" /><circle cx="80" cy="80" r="52" fill="url(#minimalCoreGrad)" stroke="url(#minimalRimGrad)" stroke-width="4.5" /><circle cx="80" cy="80" r="58" fill="none" stroke="rgba(56,189,248,0.5)" stroke-width="2" stroke-dasharray="6 6" /><circle cx="80" cy="80" r="42" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" /></svg>`;

export const minimalGlowVariant: ThinkingBarVariant = {
  id: "minimal_glow",
  displayName: "Modern Sleek Highlight",
  description: "Ultra-clean modern frosted-glass pill with smooth running neon accent line and elegant typography.",
  renderHtml(input: ThinkingBarRenderInput): string {
    const timing = calculateThinkingBarTiming(input);
    return `<div class="thinking-bar thinking-bar-minimal-glow" ${timing.styleAttr}><div class="minimal-track" aria-label="Quiz modern timer" data-layout-allow-overflow><div class="minimal-progress-bar"><div class="minimal-glow-edge"></div></div><span class="minimal-timer-marker" data-layout-allow-occlusion data-layout-allow-overlap>${MINIMAL_DISC_SVG}<div class="minimal-sparkles" data-layout-ignore aria-hidden="true"><i>✦</i><i>✦</i></div><b class="marker-val val-query" data-layout-allow-overlap>?</b><b class="marker-val val-5" data-layout-allow-overlap>5</b><b class="marker-val val-4" data-layout-allow-overlap>4</b><b class="marker-val val-3" data-layout-allow-overlap>3</b><b class="marker-val val-2" data-layout-allow-overlap>2</b><b class="marker-val val-1" data-layout-allow-overlap>1</b></span></div></div>`;
  },
  renderCss(): string {
    return `
.thinking-bar-minimal-glow .minimal-track { position: relative; z-index: 0; width: 100%; height: 52px; overflow: visible; border: 3.5px solid rgba(255, 255, 255, 0.6); border-radius: 9999px; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(14px); box-shadow: 0 10px 32px rgba(0,0,0,0.35), inset 0 2px 6px rgba(255,255,255,0.25); }
.thinking-bar-minimal-glow .minimal-progress-bar { position: absolute; top: 3px; left: 3px; bottom: 3px; width: calc(100% - 6px); border-radius: 9999px; background: linear-gradient(90deg, #F43F5E 0%, #FB923C 25%, #FACC15 50%, #38BDF8 80%, #818CF8 100%); background-size: 1540px 100%; background-position: left center; z-index: 1; animation: quiz-timer-drain var(--timer-duration) linear var(--clip-start) both; overflow: hidden; }
.thinking-bar-minimal-glow .minimal-glow-edge { position: absolute; top: 0; bottom: 0; right: 0; width: 18px; background: #FFFFFF; box-shadow: 0 0 16px #FFFFFF, 0 0 28px #38BDF8; }
.thinking-bar-minimal-glow .minimal-timer-marker { position: absolute; top: 50%; left: 100%; display: grid; place-items: center; width: 164px; height: 164px; transform: translate(-50%,-50%); animation: quiz-timer-marker-slide var(--timer-duration) linear var(--clip-start) both; z-index: 7; }
.thinking-bar-minimal-glow .minimal-disc-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; animation: minimalBreathe 2.4s ease-in-out infinite alternate; }
.thinking-bar-minimal-glow .minimal-sparkles { position: absolute; inset: 0; pointer-events: none; z-index: 6; }
.thinking-bar-minimal-glow .minimal-sparkles i { position: absolute; font-style: normal; font-size: 16px; color: #FFF; text-shadow: 0 0 8px #38BDF8; }
.thinking-bar-minimal-glow .minimal-sparkles i:nth-child(1) { top: 6px; right: 20px; }
.thinking-bar-minimal-glow .minimal-sparkles i:nth-child(2) { bottom: 8px; left: 18px; }
@keyframes minimalBreathe { 0% { transform: scale(0.96); filter: drop-shadow(0 0 8px rgba(56,189,248,0.4)); } 100% { transform: scale(1.04); filter: drop-shadow(0 0 20px rgba(129,140,248,0.7)); } }
`;
  },
};

