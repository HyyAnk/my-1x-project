import { ambientPhaseSeconds } from "../../../candyArcade.js";
import { renderSemanticBackgroundLayer } from "../semanticBackgroundLayer.js";
import type { BackgroundPerformanceMetadata, BackgroundRenderContext, QuizBackgroundVariant } from "../types.js";

const AURORA_GLOW_PERFORMANCE: BackgroundPerformanceMetadata = {
  layerCount: 5,
  willChangeCount: 2,
  animatedProperties: ["transform", "opacity"],
  usesContinuousMotion: true,
  reducedMotionSafe: true,
};

export function renderAuroraStardust(questionIndex: number): string {
  const sparkles = [
    { symbol: "✧", top: "14%", left: "8%", size: "26px", color: "var(--accent)" },
    { symbol: "✦", top: "28%", right: "12%", size: "22px", color: "#FFFDF0" },
    { symbol: "★", top: "68%", left: "12%", size: "28px", color: "var(--surface-accent)" },
    { symbol: "•", top: "82%", right: "16%", size: "18px", color: "#FFD34D" },
    { symbol: "✧", top: "42%", left: "22%", size: "20px", color: "#FFFDF0" },
    { symbol: "✦", top: "18%", right: "32%", size: "24px", color: "var(--accent)" },
  ];
  return sparkles
    .map(
      (s, index) =>
        `<i class="aurora-sparkle-${index + 1}" data-layout-ignore aria-hidden="true" style="top:${s.top};${s.left ? `left:${s.left};` : `right:${s.right};`}font-size:${s.size};color:${s.color};--stardust-phase:${ambientPhaseSeconds("drift", index, String(questionIndex))}s;">${s.symbol}</i>`,
    )
    .join("");
}

export function renderAuroraGlowHtml(context: BackgroundRenderContext): string {
  const qIdx = context.questionIndex;
  const phase1 = ambientPhaseSeconds("float", 0, String(qIdx));
  const phase2 = ambientPhaseSeconds("breathe", 1, String(qIdx));
  const phase3 = ambientPhaseSeconds("tilt", 2, String(qIdx));

  return renderSemanticBackgroundLayer(
    "aurora_glow",
    "bg-aurora-glow",
    `<div class="aurora-gradient-base"></div><div class="aurora-mesh-curtain"></div><div class="aurora-orb aurora-orb-1" style="--aurora-phase:${phase1}s"></div><div class="aurora-orb aurora-orb-2" style="--aurora-phase:${phase2}s"></div><div class="aurora-orb aurora-orb-3" style="--aurora-phase:${phase3}s"></div><div class="aurora-stardust">${renderAuroraStardust(qIdx)}</div>`,
  );
}

export function renderAuroraGlowCss(): string {
  return `
.bg-aurora-glow { position: absolute; inset: 0; contain: layout paint; }
.aurora-gradient-base { position: absolute; z-index: 0; inset: 0; background: radial-gradient(120% 120% at 50% 10%, var(--bg-primary) 0%, var(--bg-secondary) 100%); }
.aurora-mesh-curtain { position: absolute; z-index: 1; inset: -20%; background: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,255,255,0.18) 0%, transparent 60%); pointer-events: none; }
.aurora-orb { position: absolute; border-radius: 50%; filter: blur(55px); opacity: 0.42; will-change: transform; pointer-events: none; }
.aurora-orb-1 { z-index: 1; top: -12%; left: 8%; width: 680px; height: 440px; background: radial-gradient(circle, var(--accent) 0%, transparent 70%); animation: aurora-float-1 22s ease-in-out var(--aurora-phase, 0s) infinite alternate both; }
.aurora-orb-2 { z-index: 1; bottom: -8%; right: 6%; width: 720px; height: 480px; background: radial-gradient(circle, var(--surface-accent) 0%, transparent 70%); animation: aurora-float-2 26s ease-in-out var(--aurora-phase, 0s) infinite alternate both; }
.aurora-orb-3 { z-index: 1; top: 32%; left: 38%; width: 560px; height: 380px; background: radial-gradient(circle, rgba(255,255,255,0.32) 0%, transparent 70%); animation: aurora-float-3 19s ease-in-out var(--aurora-phase, 0s) infinite alternate both; }
.aurora-stardust { position: absolute; z-index: 2; inset: 0; pointer-events: none; color: rgba(255,255,255,0.7); }
.aurora-stardust i { position: absolute; display: block; font-style: normal; animation: aurora-shimmer 4.2s ease-in-out var(--stardust-phase, 0s) infinite alternate both; will-change: transform, opacity; }
@keyframes aurora-float-1 {
  0% { transform: translate(0,0) scale(1); }
  50% { transform: translate(48px, 28px) scale(1.08); }
  100% { transform: translate(75px, 45px) scale(1.14); }
}
@keyframes aurora-float-2 {
  0% { transform: translate(0,0) scale(1); }
  50% { transform: translate(-35px, -24px) scale(1.06); }
  100% { transform: translate(-60px, -40px) scale(1.1); }
}
@keyframes aurora-float-3 {
  0% { transform: translate(0,0) scale(1); }
  50% { transform: translate(-20px, 30px) scale(0.95); }
  100% { transform: translate(-40px, 50px) scale(0.9); }
}
@keyframes aurora-shimmer {
  0%, 100% { opacity: 0.35; transform: scale(0.85); }
  50% { opacity: 0.95; transform: scale(1.18); }
}
@media (prefers-reduced-motion: reduce) {
  .aurora-orb, .aurora-stardust i { animation: none !important; }
}
`;
}

export const auroraGlowVariant: QuizBackgroundVariant = {
  id: "aurora_glow",
  displayName: "Aurora Glow",
  description: "Soft undulating aurora glow with luminous ambient orbs and gentle stardust.",
  performance: AURORA_GLOW_PERFORMANCE,
  renderHtml: renderAuroraGlowHtml,
  renderCss: renderAuroraGlowCss,
};
