import { ambientPhaseSeconds } from "../../../candyArcade.js";
import { renderSemanticBackgroundLayer } from "../semanticBackgroundLayer.js";
import type { BackgroundPerformanceMetadata, BackgroundRenderContext, QuizBackgroundVariant } from "../types.js";

const COMIC_BURST_PERFORMANCE: BackgroundPerformanceMetadata = {
  layerCount: 6,
  willChangeCount: 2,
  animatedProperties: ["transform", "opacity"],
  usesContinuousMotion: true,
  reducedMotionSafe: true,
};

export function renderComicBurstDecorations(questionIndex: number): string {
  const sparkSymbols = ["✦", "⚡", "★", "✧", "💥", "•"];
  return `<div class="comic-decorations" data-layout-ignore aria-hidden="true">${sparkSymbols
    .map(
      (symbol, index) =>
        `<i class="comic-spark-${index + 1}" data-layout-ignore aria-hidden="true" style="--spark-phase:${ambientPhaseSeconds("tilt", index, String(questionIndex))}s;">${symbol}</i>`,
    )
    .join("")}</div>`;
}

export function renderComicBurstHtml(context: BackgroundRenderContext): string {
  const qIdx = context.questionIndex;
  const rayPhase = ambientPhaseSeconds("drift", 0, String(qIdx));
  const burstPhase = ambientPhaseSeconds("breathe", 1, String(qIdx));

  return renderSemanticBackgroundLayer(
    "comic_burst",
    "bg-comic-burst",
    `<div class="comic-gradient-base"></div><div class="comic-sunburst-rays" style="--comic-ray-phase:${rayPhase}s;"></div><div class="comic-halftone-grid"></div><div class="comic-action-vignette"></div><div class="comic-speed-burst" style="--comic-burst-phase:${burstPhase}s;"></div>${renderComicBurstDecorations(qIdx)}`,
  );
}

export function renderComicBurstCss(): string {
  return `
.bg-comic-burst { position: absolute; inset: 0; contain: layout paint; overflow: hidden; }
.comic-gradient-base { position: absolute; z-index: 0; inset: 0; background: radial-gradient(circle at 50% 50%, var(--bg-primary) 0%, var(--bg-secondary) 85%); }
.comic-sunburst-rays { position: absolute; z-index: 1; inset: -50%; opacity: 0.16; background: repeating-conic-gradient(from 0deg at 50% 50%, var(--bg-accent, var(--accent, #ffffff)) 0deg 9deg, transparent 9deg 18deg); mix-blend-mode: overlay; animation: comic-burst-spin 120s linear var(--comic-ray-phase, 0s) infinite both; will-change: transform; }
.comic-halftone-grid { position: absolute; z-index: 2; inset: 0; opacity: 0.12; background-image: radial-gradient(circle, var(--bg-accent, var(--accent, #000000)) 2.5px, transparent 3px); background-size: 26px 26px; pointer-events: none; }
.comic-action-vignette { position: absolute; z-index: 2; inset: 0; background: radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0, 0, 0, 0.28) 100%); pointer-events: none; }
.comic-speed-burst { position: absolute; z-index: 3; inset: -10%; opacity: 0.18; background: repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 40px, rgba(255, 255, 255, 0.22) 42px, transparent 44px); animation: comic-speed-pulse 3.6s ease-in-out var(--comic-burst-phase, 0s) infinite alternate both; will-change: transform, opacity; pointer-events: none; }
.comic-decorations { position: absolute; z-index: 4; inset: 0; pointer-events: none; color: var(--bg-accent, var(--accent, #FFD34D)); }
.comic-decorations i { position: absolute; display: block; font-style: normal; line-height: 1; filter: drop-shadow(2px 3px 0 #000000); animation: comic-spark-bob 3.2s ease-in-out var(--spark-phase, 0s) infinite alternate both; will-change: transform; }
.comic-spark-1 { top: 12%; left: 7%; font-size: 38px; color: #FFE600; }
.comic-spark-2 { top: 22%; right: 9%; font-size: 32px; color: #FF3B30; }
.comic-spark-3 { bottom: 18%; left: 8%; font-size: 42px; color: #FFCC00; }
.comic-spark-4 { bottom: 25%; right: 12%; font-size: 28px; color: #FFFFFF; }
.comic-spark-5 { top: 8%; right: 28%; font-size: 34px; }
.comic-spark-6 { bottom: 12%; left: 24%; font-size: 22px; color: #FFFFFF; }
@keyframes comic-burst-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes comic-speed-pulse { 0% { transform: scale(0.96); opacity: 0.12; } 100% { transform: scale(1.05); opacity: 0.24; } }
@keyframes comic-spark-bob { 0% { transform: translate(0, 0) scale(0.9) rotate(-6deg); } 100% { transform: translate(6px, -10px) scale(1.1) rotate(6deg); } }
@media (prefers-reduced-motion: reduce) {
  .comic-sunburst-rays, .comic-speed-burst, .comic-decorations i { animation: none !important; }
}
`;
}

export const comicBurstVariant: QuizBackgroundVariant = {
  id: "comic_burst",
  displayName: "Comic Action Burst",
  description: "Dynamic comic book action background with dramatic radial sunburst rays, speed dots, and pop-art energy.",
  performance: COMIC_BURST_PERFORMANCE,
  renderHtml: renderComicBurstHtml,
  renderCss: renderComicBurstCss,
};
