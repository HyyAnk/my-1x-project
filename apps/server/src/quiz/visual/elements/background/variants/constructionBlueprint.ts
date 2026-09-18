import { ambientPhaseSeconds } from "../../../candyArcade.js";
import { renderSemanticBackgroundLayer } from "../semanticBackgroundLayer.js";
import type { BackgroundPerformanceMetadata, BackgroundRenderContext, QuizBackgroundVariant } from "../types.js";

const CONSTRUCTION_BLUEPRINT_PERFORMANCE: BackgroundPerformanceMetadata = {
  layerCount: 6,
  willChangeCount: 2,
  animatedProperties: ["transform", "opacity"],
  usesContinuousMotion: true,
  reducedMotionSafe: true,
};

export function renderBlueprintCrosshairs(questionIndex: number): string {
  const markings = [
    { label: "+", top: "10%", left: "6%", size: "22px", note: "SEC.01" },
    { label: "+", top: "10%", right: "6%", size: "22px", note: "1920x1080" },
    { label: "+", bottom: "12%", left: "6%", size: "22px", note: "ELEV-04" },
    { label: "+", bottom: "12%", right: "6%", size: "22px", note: "AXIS-Z" },
    { label: "⊕", top: "48%", left: "3%", size: "18px", note: "DATUM" },
    { label: "⊕", top: "48%", right: "3%", size: "18px", note: "REF-B" },
  ];
  return `<div class="blueprint-markings" data-layout-ignore aria-hidden="true">${markings
    .map(
      (m, idx) =>
        `<span class="blueprint-mark mark-${idx + 1}" style="top:${m.top ?? "auto"};${m.left ? `left:${m.left};` : `right:${m.right};`}${m.bottom ? `bottom:${m.bottom};` : ""}--mark-phase:${ambientPhaseSeconds("breathe", idx, String(questionIndex))}s;"><i class="mark-cross">${m.label}</i><small class="mark-note">${m.note}</small></span>`,
    )
    .join("")}</div>`;
}

export function renderBlueprintGirdersSvg(): string {
  return `<svg class="blueprint-girders-svg" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg" data-layout-ignore aria-hidden="true"><defs><pattern id="girderHatch" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="20" stroke="rgba(255,255,255,0.06)" stroke-width="2" /></pattern></defs><path d="M-50 180 L800 -40 L800 20 L-50 240 Z" fill="url(#girderHatch)" stroke="rgba(255,255,255,0.12)" stroke-width="2" /><path d="M1120 1120 L1970 850 L1970 910 L1120 1180 Z" fill="url(#girderHatch)" stroke="rgba(255,255,255,0.12)" stroke-width="2" /><circle cx="375" cy="70" r="4" fill="rgba(255,255,255,0.25)" /><circle cx="1545" cy="985" r="4" fill="rgba(255,255,255,0.25)" /><line x1="0" y1="540" x2="1920" y2="540" stroke="rgba(255,255,255,0.07)" stroke-width="1" stroke-dasharray="14 10" /><line x1="960" y1="0" x2="960" y2="1080" stroke="rgba(255,255,255,0.07)" stroke-width="1" stroke-dasharray="14 10" /></svg>`;
}

export function renderConstructionBlueprintHtml(context: BackgroundRenderContext): string {
  const qIdx = context.questionIndex;
  const girderPhase = ambientPhaseSeconds("drift", 0, String(qIdx));
  const pulsePhase = ambientPhaseSeconds("tilt", 1, String(qIdx));

  return renderSemanticBackgroundLayer(
    "construction_blueprint",
    "bg-construction-blueprint",
    `<div class="blueprint-gradient-base"></div><div class="blueprint-grid-fine"></div><div class="blueprint-grid-major"></div><div class="blueprint-girders-container" style="--girder-phase:${girderPhase}s;">${renderBlueprintGirdersSvg()}</div><div class="blueprint-drafting-circles" style="--pulse-phase:${pulsePhase}s;"></div>${renderBlueprintCrosshairs(qIdx)}`,
  );
}

export function renderConstructionBlueprintCss(): string {
  return `
.bg-construction-blueprint { position: absolute; inset: 0; contain: layout paint; overflow: hidden; }
.blueprint-gradient-base { position: absolute; z-index: 0; inset: 0; background: radial-gradient(ellipse at 50% 40%, var(--bg-primary) 0%, var(--bg-secondary) 100%); }
.blueprint-grid-fine { position: absolute; z-index: 1; inset: 0; opacity: 0.13; background-image: linear-gradient(to right, rgba(255, 255, 255, 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.35) 1px, transparent 1px); background-size: 32px 32px; pointer-events: none; }
.blueprint-grid-major { position: absolute; z-index: 2; inset: 0; opacity: 0.22; background-image: linear-gradient(to right, rgba(255, 255, 255, 0.7) 1.5px, transparent 1.5px), linear-gradient(to bottom, rgba(255, 255, 255, 0.7) 1.5px, transparent 1.5px); background-size: 160px 160px; border: 1px solid rgba(255, 255, 255, 0.1); pointer-events: none; }
.blueprint-girders-container { position: absolute; z-index: 3; inset: 0; opacity: 0.7; pointer-events: none; animation: blueprint-girder-sway 18s ease-in-out var(--girder-phase, 0s) infinite alternate both; will-change: transform; }
.blueprint-girders-svg { width: 100%; height: 100%; }
.blueprint-drafting-circles { position: absolute; z-index: 3; top: 50%; left: 50%; width: 780px; height: 780px; transform: translate(-50%, -50%); border: 1.5px dashed rgba(255, 255, 255, 0.12); border-radius: 50%; pointer-events: none; animation: blueprint-circle-pulse 12s ease-in-out var(--pulse-phase, 0s) infinite alternate both; will-change: transform, opacity; }
.blueprint-drafting-circles::after { position: absolute; inset: 70px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 50%; content: ""; }
.blueprint-markings { position: absolute; z-index: 4; inset: 0; pointer-events: none; color: var(--bg-accent, var(--accent, rgba(255, 255, 255, 0.65))); font-family: monospace; }
.blueprint-mark { position: absolute; display: flex; flex-direction: column; align-items: center; gap: 2px; opacity: 0.65; animation: blueprint-mark-breathe 4.5s ease-in-out var(--mark-phase, 0s) infinite alternate both; will-change: opacity; }
.blueprint-mark .mark-cross { font-style: normal; font-size: 20px; line-height: 1; }
.blueprint-mark .mark-note { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255, 255, 255, 0.55); }
@keyframes blueprint-girder-sway { 0% { transform: translateY(0) scale(1); } 100% { transform: translateY(14px) scale(1.015); } }
@keyframes blueprint-circle-pulse { 0% { transform: translate(-50%, -50%) scale(0.98); opacity: 0.5; } 100% { transform: translate(-50%, -50%) scale(1.03); opacity: 0.85; } }
@keyframes blueprint-mark-breathe { 0% { opacity: 0.45; } 100% { opacity: 0.85; } }
@media (prefers-reduced-motion: reduce) {
  .blueprint-girders-container, .blueprint-drafting-circles, .blueprint-mark { animation: none !important; }
}
`;
}

export const constructionBlueprintVariant: QuizBackgroundVariant = {
  id: "construction_blueprint",
  displayName: "Construction Blueprint",
  description: "Technical architectural blueprint grid with subtle construction crosshairs, ruler measurements, and drafting lines.",
  performance: CONSTRUCTION_BLUEPRINT_PERFORMANCE,
  renderHtml: renderConstructionBlueprintHtml,
  renderCss: renderConstructionBlueprintCss,
};
