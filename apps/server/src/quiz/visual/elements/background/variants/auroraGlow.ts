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
    { symbol: "✧", top: "14%", left: "8%", size: "14px", color: "var(--accent)" },
    { symbol: "✦", top: "26%", right: "14%", size: "13px", color: "#FFFDF0" },
    { symbol: "✧", top: "64%", left: "10%", size: "16px", color: "var(--surface-accent)" },
    { symbol: "•", top: "80%", right: "16%", size: "10px", color: "#FFD34D" },
    { symbol: "✧", top: "40%", left: "20%", size: "12px", color: "#FFFDF0" },
    { symbol: "✦", top: "16%", right: "30%", size: "15px", color: "var(--accent)" },
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
.bg-aurora-glow { position: absolute; inset: 0; contain: layout paint; overflow: hidden; }
.aurora-gradient-base { position: absolute; z-index: 0; inset: 0; background: radial-gradient(120% 120% at 50% 0%, var(--bg-primary) 0%, var(--bg-secondary) 100%); }
.aurora-gradient-base::after { position: absolute; inset: 0; background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 70%); content: ""; pointer-events: none; }
.aurora-mesh-curtain { position: absolute; z-index: 1; inset: -20%; background: repeating-linear-gradient(105deg, transparent 0%, transparent 6%, rgba(255,255,255,0.06) 8%, transparent 11%, transparent 17%, rgba(255,255,255,0.08) 20%, transparent 24%), radial-gradient(ellipse 85% 55% at 50% -10%, rgba(255,255,255,0.22) 0%, transparent 65%); mix-blend-mode: screen; filter: blur(14px); opacity: 0.8; pointer-events: none; }
.aurora-orb { position: absolute; border-radius: 45% 55% 62% 38% / 48% 52% 48% 52%; filter: blur(95px); mix-blend-mode: screen; opacity: 0.58; will-change: transform; pointer-events: none; }
.aurora-orb-1 { z-index: 1; top: -16%; left: 4%; width: 840px; height: 500px; background: radial-gradient(ellipse at 45% 50%, var(--accent) 0%, rgba(255,255,255,0.3) 25%, transparent 70%); animation: aurora-float-1 22s ease-in-out var(--aurora-phase, 0s) infinite alternate both; }
.aurora-orb-2 { z-index: 1; bottom: -14%; right: 2%; width: 880px; height: 520px; background: radial-gradient(ellipse at 55% 50%, var(--surface-accent) 0%, rgba(255,255,255,0.25) 30%, transparent 70%); animation: aurora-float-2 26s ease-in-out var(--aurora-phase, 0s) infinite alternate both; }
.aurora-orb-3 { z-index: 1; top: 24%; left: 32%; width: 660px; height: 440px; background: radial-gradient(circle, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.12) 35%, transparent 68%); animation: aurora-float-3 19s ease-in-out var(--aurora-phase, 0s) infinite alternate both; }
.aurora-stardust { position: absolute; z-index: 2; inset: 0; pointer-events: none; color: rgba(255,255,255,0.85); }
.aurora-stardust i { position: absolute; display: block; font-style: normal; line-height: 1; filter: drop-shadow(0 0 5px rgba(255,255,255,0.85)); animation: aurora-shimmer 3.8s ease-in-out var(--stardust-phase, 0s) infinite alternate both; will-change: transform, opacity; }
@keyframes aurora-float-1 {
  0% { transform: translate(0,0) rotate(0deg) scale(1); }
  50% { transform: translate(45px, 25px) rotate(4deg) scale(1.06); }
  100% { transform: translate(75px, 45px) rotate(-2deg) scale(1.12); }
}
@keyframes aurora-float-2 {
  0% { transform: translate(0,0) scale(1); }
  50% { transform: translate(-35px, -20px) rotate(-3deg) scale(1.05); }
  100% { transform: translate(-60px, -40px) rotate(3deg) scale(1.1); }
}
@keyframes aurora-float-3 {
  0% { transform: translate(0,0) scale(1); }
  50% { transform: translate(-20px, 25px) scale(1.08); }
  100% { transform: translate(-40px, 50px) scale(0.94); }
}
@keyframes aurora-shimmer {
  0%, 100% { opacity: 0.25; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1.15); filter: drop-shadow(0 0 8px #ffffff); }
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
