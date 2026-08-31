import { ambientPhaseSeconds } from "../../../candyArcade.js";
import { renderSemanticBackgroundLayer } from "../semanticBackgroundLayer.js";
import type { BackgroundPerformanceMetadata, BackgroundRenderContext, QuizBackgroundVariant } from "../types.js";

const CANDY_RAYS_PERFORMANCE: BackgroundPerformanceMetadata = {
  layerCount: 6,
  willChangeCount: 3,
  animatedProperties: ["transform"],
  usesContinuousMotion: true,
  reducedMotionSafe: true,
};

export function renderCandyRaysDecorations(questionIndex: number): string {
  const symbols = ["✦", "•", "○", "★", "✧", "⚡", "•"];
  return `<div class="scene-decor" data-layout-ignore aria-hidden="true">${symbols
    .map(
      (symbol, index) =>
        `<i class="decor-${index + 1}" data-layout-ignore aria-hidden="true" style="--decor-phase:${ambientPhaseSeconds("drift", index, String(questionIndex))}s">${symbol}</i>`,
    )
    .join("")}</div>`;
}

export function renderCandyRaysHtml(context: BackgroundRenderContext): string {
  return renderSemanticBackgroundLayer(
    "candy_rays",
    "bg-candy-rays",
    `<div class="bg-gradient"></div><div class="bg-rays"></div><div class="bg-pattern pattern-circles"></div><div class="bg-pattern pattern-sprinkles"></div><div class="bg-shape shape-a" data-layout-allow-overflow></div>${renderCandyRaysDecorations(context.questionIndex)}`,
  );
}

export function renderCandyRaysCss(): string {
  return `
.bg-candy-rays { position: absolute; inset: 0; contain: layout paint; transform: translate3d(0,0,0); }
.bg-gradient { position: absolute; z-index: 0; inset: 0; background: linear-gradient(135deg, var(--bg-primary), var(--bg-secondary)); transform: translate3d(0,0,0); }
.bg-gradient::after { position: absolute; z-index: 0; top: 3%; left: 9%; width: 460px; height: 250px; border-radius: 50%; background: rgba(255,255,255,.16); content: ""; transform: rotate(-15deg); }
.bg-rays { position: absolute; z-index: 1; inset: -30%; opacity: .065; background: repeating-conic-gradient(from 8deg, rgba(255,255,255,.9) 0 7deg, transparent 7deg 18deg); animation: ray-spin 150s linear var(--clip-start) infinite both; will-change: transform; transform: translate3d(0,0,0); }
.bg-pattern { position: absolute; z-index: 1; opacity: .085; pointer-events: none; }
.pattern-circles { inset: 0; background-image: repeating-linear-gradient(45deg, transparent 0 23px, rgba(255,255,255,.9) 24px 27px, transparent 28px 52px); background-size: 82px 82px; animation: drift var(--scene-duration) linear var(--clip-start) 1 both; will-change: transform; }
.pattern-sprinkles { right: -110px; bottom: -135px; width: 620px; height: 620px; border: 35px dotted rgba(255,255,255,.7); border-radius: 50%; transform: rotate(-14deg); }
.bg-shape { position: absolute; z-index: 1; border-radius: 48% 52% 43% 57%; background: rgba(255,255,255,.11); animation: ambient-drift var(--scene-duration) ease-in-out var(--clip-start) 1 alternate both; will-change: transform; }
.shape-a { top: 17%; right: 7%; width: 310px; height: 190px; transform: rotate(-15deg); }
.shape-b { bottom: 10%; left: -4%; width: 360px; height: 250px; border-radius: 63% 37% 54% 46%; animation-delay: -7s; }
.shape-c { right: 24%; bottom: -8%; width: 290px; height: 210px; opacity: .7; animation-delay: -12s; }
.scene-decor { position: absolute; z-index: 2; inset: 0; pointer-events: none; color: rgba(255,255,255,.62); }
.scene-decor i { position: absolute; display: block; font-style: normal; animation: decor-drift var(--scene-duration) ease-in-out var(--clip-start) 1 alternate both; }
.decor-1 { top: 21%; left: 5%; font-size: 34px; color: var(--accent); }
.decor-2 { top: 40%; left: 3%; font-size: 26px; }
.decor-3 { top: 13%; right: 12%; font-size: 48px; color: var(--accent); }
.decor-4 { right: 5%; bottom: 30%; font-size: 42px; color: rgba(255,255,255,.48); }
.decor-5 { left: 18%; bottom: 11%; font-size: 31px; color: #FFD34D; }
.decor-6 { right: 24%; top: 28%; font-size: 25px; color: #FFD34D; }
.decor-7 { left: 30%; top: 8%; font-size: 18px; }
@keyframes ray-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes drift { to { background-position: 230px 160px; } }
@keyframes ambient-drift { to { transform: translate(24px,-19px) rotate(8deg); } }
@keyframes decor-drift { 50% { transform: translate(4px,-7px) rotate(2deg); } }
@media (prefers-reduced-motion: reduce) {
  .bg-rays, .pattern-circles, .bg-shape, .scene-decor i { animation: none !important; }
}
`;
}

export const candyRaysVariant: QuizBackgroundVariant = {
  id: "candy_rays",
  displayName: "Candy Rays",
  description: "Vibrant rotating candy rays with sprinkles, floating shapes, and sparkle stars.",
  performance: CANDY_RAYS_PERFORMANCE,
  renderHtml: renderCandyRaysHtml,
  renderCss: renderCandyRaysCss,
};
