import { ambientPhaseSeconds } from "../../../candyArcade.js";
import { renderSemanticBackgroundLayer } from "../semanticBackgroundLayer.js";
import type { BackgroundPerformanceMetadata, BackgroundRenderContext, QuizBackgroundVariant } from "../types.js";

const COSMIC_STARFIELD_PERFORMANCE: BackgroundPerformanceMetadata = {
  layerCount: 6,
  willChangeCount: 3,
  animatedProperties: ["transform", "opacity"],
  usesContinuousMotion: true,
  reducedMotionSafe: true,
};

export function renderCosmicStars(questionIndex: number): string {
  const stars = [
    { symbol: "✦", top: "12%", left: "14%", size: "19px", color: "var(--bg-accent, #FFF2A8)" },
    { symbol: "★", top: "22%", right: "18%", size: "16px", color: "#FFFFFF" },
    { symbol: "✧", top: "35%", left: "8%", size: "22px", color: "var(--accent, #90E0EF)" },
    { symbol: "•", top: "18%", left: "42%", size: "9px", color: "#FFFFFF" },
    { symbol: "✦", top: "72%", left: "19%", size: "17px", color: "#FFDF70" },
    { symbol: "✧", top: "68%", right: "12%", size: "24px", color: "var(--bg-accent, #F72585)" },
    { symbol: "•", top: "82%", right: "32%", size: "10px", color: "#CAF0F8" },
    { symbol: "★", top: "45%", right: "8%", size: "18px", color: "#FFFFFF" },
  ];
  return `<div class="cosmic-stars-layer" data-layout-ignore aria-hidden="true">${stars
    .map(
      (s, idx) =>
        `<i class="cosmic-star star-${idx + 1}" style="top:${s.top};${s.left ? `left:${s.left};` : `right:${s.right};`}font-size:${s.size};color:${s.color};--star-phase:${ambientPhaseSeconds("drift", idx, String(questionIndex))}s;">${s.symbol}</i>`,
    )
    .join("")}</div>`;
}

export function renderConstellationsSvg(): string {
  return `<svg class="cosmic-constellations-svg" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg" data-layout-ignore aria-hidden="true"><g stroke="rgba(255,255,255,0.18)" stroke-width="1.2" stroke-dasharray="3 5"><line x1="268" y1="130" x2="420" y2="210" /><line x1="420" y1="210" x2="560" y2="175" /><line x1="1520" y1="240" x2="1680" y2="190" /><line x1="1680" y1="190" x2="1760" y2="340" /><line x1="364" y1="778" x2="480" y2="860" /><line x1="1310" y1="886" x2="1480" y2="820" /></g></svg>`;
}

export function renderCosmicStarfieldHtml(context: BackgroundRenderContext): string {
  const qIdx = context.questionIndex;
  const nebula1Phase = ambientPhaseSeconds("float", 0, String(qIdx));
  const nebula2Phase = ambientPhaseSeconds("breathe", 1, String(qIdx));
  const warpPhase = ambientPhaseSeconds("tilt", 2, String(qIdx));

  return renderSemanticBackgroundLayer(
    "cosmic_starfield",
    "bg-cosmic-starfield",
    `<div class="cosmic-void-base"></div><div class="cosmic-nebula nebula-alpha" style="--nebula-phase:${nebula1Phase}s;"></div><div class="cosmic-nebula nebula-beta" style="--nebula-phase:${nebula2Phase}s;"></div><div class="cosmic-constellation-wrap" style="--warp-phase:${warpPhase}s;">${renderConstellationsSvg()}</div><div class="cosmic-dust-stream"></div>${renderCosmicStars(qIdx)}`,
  );
}

export function renderCosmicStarfieldCss(): string {
  return `
.bg-cosmic-starfield { position: absolute; inset: 0; contain: layout paint; overflow: hidden; }
.cosmic-void-base { position: absolute; z-index: 0; inset: 0; background: radial-gradient(130% 120% at 50% 15%, var(--bg-primary) 0%, var(--bg-secondary) 100%); }
.cosmic-void-base::after { position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, transparent 40%, rgba(0, 0, 0, 0.45) 100%); content: ""; pointer-events: none; }
.cosmic-nebula { position: absolute; z-index: 1; border-radius: 50%; filter: blur(110px); mix-blend-mode: screen; opacity: 0.52; will-change: transform; pointer-events: none; }
.nebula-alpha { top: -15%; left: 10%; width: 900px; height: 560px; background: radial-gradient(ellipse at center, var(--bg-accent, var(--accent, #7209B7)) 0%, rgba(255, 255, 255, 0.2) 35%, transparent 70%); animation: cosmic-nebula-float 24s ease-in-out var(--nebula-phase, 0s) infinite alternate both; }
.nebula-beta { bottom: -15%; right: 5%; width: 850px; height: 520px; background: radial-gradient(ellipse at center, var(--surface-accent, #4CC9F0) 0%, rgba(255, 255, 255, 0.18) 30%, transparent 70%); animation: cosmic-nebula-float 20s ease-in-out var(--nebula-phase, 0s) infinite alternate-reverse both; }
.cosmic-constellation-wrap { position: absolute; z-index: 2; inset: 0; pointer-events: none; opacity: 0.75; animation: cosmic-drift-subtle 28s ease-in-out var(--warp-phase, 0s) infinite alternate both; will-change: transform; }
.cosmic-constellations-svg { width: 100%; height: 100%; }
.cosmic-dust-stream { position: absolute; z-index: 2; inset: -25%; opacity: 0.08; background: repeating-radial-gradient(ellipse at 40% 60%, rgba(255, 255, 255, 0.8) 0, transparent 4px, transparent 45px); pointer-events: none; }
.cosmic-stars-layer { position: absolute; z-index: 3; inset: 0; pointer-events: none; }
.cosmic-star { position: absolute; display: block; font-style: normal; line-height: 1; filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.9)); animation: cosmic-star-pulse 3.6s ease-in-out var(--star-phase, 0s) infinite alternate both; will-change: transform, opacity; }
@keyframes cosmic-nebula-float { 0% { transform: translate(0, 0) scale(1); } 50% { transform: translate(35px, 20px) scale(1.08); } 100% { transform: translate(60px, -25px) scale(1.15); } }
@keyframes cosmic-drift-subtle { 0% { transform: translateY(0) scale(1); } 100% { transform: translateY(-16px) scale(1.02); } }
@keyframes cosmic-star-pulse { 0% { opacity: 0.25; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.2) rotate(10deg); } 100% { opacity: 0.45; transform: scale(0.95) rotate(-5deg); } }
@media (prefers-reduced-motion: reduce) {
  .cosmic-nebula, .cosmic-constellation-wrap, .cosmic-star { animation: none !important; }
}
`;
}

export const cosmicStarfieldVariant: QuizBackgroundVariant = {
  id: "cosmic_starfield",
  displayName: "Cosmic Starfield",
  description: "Deep space cosmic starfield with twinkling starlight, glowing constellations, and celestial nebula glow.",
  performance: COSMIC_STARFIELD_PERFORMANCE,
  renderHtml: renderCosmicStarfieldHtml,
  renderCss: renderCosmicStarfieldCss,
};
