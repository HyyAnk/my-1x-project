import { ambientPhaseSeconds } from "../../../candyArcade.js";
import { renderSemanticBackgroundLayer } from "../semanticBackgroundLayer.js";
import type { BackgroundPerformanceMetadata, BackgroundRenderContext, QuizBackgroundVariant } from "../types.js";

const TREASURE_MAP_PERFORMANCE: BackgroundPerformanceMetadata = {
  layerCount: 6,
  willChangeCount: 2,
  animatedProperties: ["transform", "opacity"],
  usesContinuousMotion: true,
  reducedMotionSafe: true,
};

export function renderCompassRoseSvg(): string {
  return `<svg class="compass-rose-svg" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" data-layout-ignore aria-hidden="true"><defs><radialGradient id="roseGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FDE047" stop-opacity="0.25" /><stop offset="60%" stop-color="#D97706" stop-opacity="0.1" /><stop offset="100%" stop-color="#78350F" stop-opacity="0" /></radialGradient></defs><circle cx="250" cy="250" r="230" stroke="rgba(245, 158, 11, 0.2)" stroke-width="1.5" stroke-dasharray="8 6" /><circle cx="250" cy="250" r="215" stroke="rgba(212, 163, 115, 0.15)" stroke-width="1" /><circle cx="250" cy="250" r="170" fill="url(#roseGlow)" stroke="rgba(245, 158, 11, 0.25)" stroke-width="2" /><g stroke="rgba(245, 158, 11, 0.15)" stroke-width="1"><line x1="20" y1="250" x2="480" y2="250" /><line x1="250" y1="20" x2="250" y2="480" /><line x1="87" y1="87" x2="413" y2="413" stroke-dasharray="4 4" /><line x1="413" y1="87" x2="87" y2="413" stroke-dasharray="4 4" /></g><polygon points="250,30 262,238 250,250" fill="#DC2626" opacity="0.85" /><polygon points="250,30 238,238 250,250" fill="#991B1B" opacity="0.85" /><polygon points="250,470 238,262 250,250" fill="#B45309" opacity="0.8" /><polygon points="250,470 262,262 250,250" fill="#78350F" opacity="0.8" /><polygon points="470,250 262,238 250,250" fill="#F59E0B" opacity="0.8" /><polygon points="470,250 262,262 250,250" fill="#B45309" opacity="0.8" /><polygon points="30,250 238,262 250,250" fill="#F59E0B" opacity="0.8" /><polygon points="30,250 238,238 250,250" fill="#78350F" opacity="0.8" /><circle cx="250" cy="250" r="14" fill="#FDE047" stroke="#451A03" stroke-width="3" /></svg>`;
}

export function renderTreasureMapDecorations(questionIndex: number): string {
  const markings = [
    { text: "✦", top: "16%", left: "8%", size: "28px", color: "#FDE047" },
    { text: "•", top: "34%", left: "4%", size: "18px", color: "#F59E0B" },
    { text: "⚓", top: "78%", left: "10%", size: "32px", color: "rgba(212, 163, 115, 0.4)" },
    { text: "✦", top: "20%", right: "12%", size: "24px", color: "#FDE047" },
    { text: "•", top: "42%", right: "6%", size: "16px", color: "#F59E0B" },
    { text: "✕", bottom: "18%", right: "14%", size: "30px", color: "#DC2626" },
  ];
  return `<div class="treasure-decorations" data-layout-ignore aria-hidden="true">${markings
    .map(
      (m, idx) =>
        `<span class="map-decor decor-${idx + 1}" style="top:${m.top ?? "auto"};${m.left ? `left:${m.left};` : `right:${m.right};`}${m.bottom ? `bottom:${m.bottom};` : ""}font-size:${m.size};color:${m.color};--decor-phase:${ambientPhaseSeconds("drift", idx, String(questionIndex))}s;">${m.text}</span>`,
    )
    .join("")}</div>`;
}

export function renderTreasureMapHtml(context: BackgroundRenderContext): string {
  const rosePhase = ambientPhaseSeconds("drift", 0, String(context.questionIndex));
  return renderSemanticBackgroundLayer(
    "treasure_map",
    "bg-treasure-map",
    `<div class="map-base-gradient"></div><div class="map-parchment-texture"></div><div class="map-rhumb-lines"></div><div class="map-compass-rose-container" style="--rose-phase:${rosePhase}s;">${renderCompassRoseSvg()}</div><div class="map-vignette-overlay"></div>${renderTreasureMapDecorations(context.questionIndex)}`,
  );
}

export function renderTreasureMapCss(): string {
  return `
/* === Background Variant: Antique Treasure Map === */
.bg-treasure-map {
  position: absolute;
  inset: 0;
  contain: layout paint;
  overflow: hidden;
}

.map-base-gradient {
  position: absolute;
  z-index: 0;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 45%,
    #42240E 0%,
    #291406 50%,
    #150903 85%,
    #0A0401 100%
  );
}

.map-parchment-texture {
  position: absolute;
  z-index: 1;
  inset: 0;
  opacity: 0.12;
  background-image:
    repeating-linear-gradient(
      0deg,
      rgba(255, 235, 195, 0.08) 0px,
      rgba(255, 235, 195, 0.08) 1px,
      transparent 1px,
      transparent 4px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(255, 235, 195, 0.06) 0px,
      rgba(255, 235, 195, 0.06) 1px,
      transparent 1px,
      transparent 4px
    );
  pointer-events: none;
}

.map-rhumb-lines {
  position: absolute;
  z-index: 2;
  inset: 0;
  opacity: 0.15;
  background-image:
    radial-gradient(circle at 25% 30%, transparent 0, transparent 180px, rgba(245, 158, 11, 0.3) 181px, transparent 182px),
    radial-gradient(circle at 75% 70%, transparent 0, transparent 220px, rgba(245, 158, 11, 0.25) 221px, transparent 222px);
  pointer-events: none;
}

.map-compass-rose-container {
  position: absolute;
  z-index: 3;
  top: 50%;
  left: 50%;
  width: 720px;
  height: 720px;
  transform: translate(-50%, -50%);
  opacity: 0.45;
  pointer-events: none;
  animation: compass-rose-spin 180s linear var(--rose-phase, 0s) infinite both;
  will-change: transform;
}

.map-compass-rose-container .compass-rose-svg {
  width: 100%;
  height: 100%;
}

.map-vignette-overlay {
  position: absolute;
  z-index: 4;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 50%,
    transparent 45%,
    rgba(10, 4, 1, 0.5) 75%,
    rgba(10, 4, 1, 0.85) 100%
  );
  pointer-events: none;
}

.treasure-decorations {
  position: absolute;
  z-index: 5;
  inset: 0;
  pointer-events: none;
}

.map-decor {
  position: absolute;
  display: block;
  font-style: normal;
  animation: map-decor-drift 6s ease-in-out var(--decor-phase, 0s) infinite alternate both;
  will-change: transform, opacity;
  text-shadow: 0 0 10px currentColor, 0 2px 4px rgba(0, 0, 0, 0.8);
}

@keyframes compass-rose-spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes map-decor-drift {
  0% { transform: translateY(0) scale(1); opacity: 0.6; }
  50% { transform: translateY(-6px) scale(1.06); opacity: 0.95; }
  100% { transform: translateY(4px) scale(0.96); opacity: 0.5; }
}

@media (prefers-reduced-motion: reduce) {
  .map-compass-rose-container,
  .map-decor {
    animation: none !important;
  }
}
`;
}

export const treasureMapVariant: QuizBackgroundVariant = {
  id: "treasure_map",
  displayName: "Antique Treasure Map",
  description:
    "Aged sepia parchment nautical chart with rotating compass rose, latitude rhumb lines, island archipelago contours, and floating amber dust motes.",
  performance: TREASURE_MAP_PERFORMANCE,
  renderHtml: renderTreasureMapHtml,
  renderCss: renderTreasureMapCss,
};
