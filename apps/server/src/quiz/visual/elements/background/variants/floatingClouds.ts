import { ambientPhaseSeconds } from "../../../candyArcade.js";
import { renderSemanticBackgroundLayer } from "../semanticBackgroundLayer.js";
import type { BackgroundPerformanceMetadata, BackgroundRenderContext, QuizBackgroundVariant } from "../types.js";

const FLOATING_CLOUDS_PERFORMANCE: BackgroundPerformanceMetadata = {
  layerCount: 7,
  willChangeCount: 3,
  animatedProperties: ["transform", "opacity"],
  usesContinuousMotion: true,
  reducedMotionSafe: true,
};

// Sparkles are anchored to the scene margins so they never sit on top of the
// question title or the answer cards during reveal close-ups.
export function renderCloudSparkles(questionIndex: number): string {
  const sparkles = [
    { symbol: "✦", top: "7%", left: "2.5%", size: "22px", color: "var(--bg-accent, var(--accent, #FFD44D))" },
    { symbol: "✧", top: "4%", right: "3%", size: "16px", color: "#FFFFFF" },
    { symbol: "•", top: "26%", left: "1.5%", size: "11px", color: "rgba(255,255,255,0.85)" },
    { symbol: "✦", top: "58%", right: "1.5%", size: "20px", color: "var(--bg-accent, var(--accent, #FFD44D))" },
    { symbol: "✧", top: "82%", right: "4%", size: "15px", color: "#FFFFFF" },
    { symbol: "•", top: "88%", left: "4%", size: "10px", color: "rgba(255,255,255,0.75)" },
  ];
  return `<div class="cloud-shimmer-particles" data-layout-ignore aria-hidden="true">${sparkles
    .map(
      (s, idx) =>
        `<i class="cloud-sparkle-${idx + 1}" style="top:${s.top};${s.left ? `left:${s.left};` : `right:${s.right};`}font-size:${s.size};color:${s.color};--shimmer-phase:${ambientPhaseSeconds("drift", idx, String(questionIndex))}s;">${s.symbol}</i>`,
    )
    .join("")}</div>`;
}

// Clouds hug the scene edges (top strip above y=150, side margins, bottom
// corners) so the question box (x 380-1800 / y 52-220) and the answer cards
// (x 1140-1800 / y 272-741) always render over a calm sky region.
export function renderFloatingCloudsHtml(context: BackgroundRenderContext): string {
  const qIdx = context.questionIndex;
  const cloud1Phase = ambientPhaseSeconds("float", 0, String(qIdx));
  const cloud2Phase = ambientPhaseSeconds("breathe", 1, String(qIdx));
  const cloud3Phase = ambientPhaseSeconds("drift", 2, String(qIdx));

  return renderSemanticBackgroundLayer(
    "floating_clouds",
    "bg-floating-clouds",
    `<div class="sky-gradient-base"></div><div class="sky-sun-glow"></div><div class="sky-horizon-warm"></div><div class="cloud-layer cloud-layer-back" style="--cloud-phase:${cloud1Phase}s;"><span class="cloud-puff cloud-back-1"></span><span class="cloud-puff cloud-back-2"></span></div><div class="cloud-layer cloud-layer-mid" style="--cloud-phase:${cloud2Phase}s;"><span class="cloud-puff cloud-mid-1"></span><span class="cloud-puff cloud-mid-2"></span></div><div class="cloud-layer cloud-layer-front" style="--cloud-phase:${cloud3Phase}s;"><span class="cloud-puff cloud-front-1"></span><span class="cloud-puff cloud-front-2"></span></div>${renderCloudSparkles(qIdx)}`,
  );
}

export function renderFloatingCloudsCss(): string {
  return `
.bg-floating-clouds { position: absolute; inset: 0; contain: layout paint; overflow: hidden; }
.bg-floating-clouds .sky-gradient-base { position: absolute; z-index: 0; inset: 0; background: linear-gradient(180deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0) 42%), linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-primary) 46%, var(--bg-secondary) 100%); }
.bg-floating-clouds .sky-gradient-base::after { position: absolute; inset: 0; background: radial-gradient(90% 90% at 50% 40%, transparent 58%, rgba(21, 26, 48, 0.13) 100%); content: ""; pointer-events: none; }
.bg-floating-clouds .sky-sun-glow { position: absolute; z-index: 1; top: -190px; right: -170px; width: 680px; height: 680px; border-radius: 50%; background: radial-gradient(circle, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0.14) 36%, transparent 66%), radial-gradient(circle, var(--bg-accent, var(--accent, #FFD166)) 0%, transparent 58%); opacity: 0.24; pointer-events: none; }
.bg-floating-clouds .sky-horizon-warm { position: absolute; z-index: 1; left: -8%; right: -8%; bottom: -16%; height: 52%; background: radial-gradient(ellipse 62% 100% at 50% 100%, var(--bg-accent, var(--accent, rgba(255, 255, 255, 0.2))) 0%, transparent 72%); opacity: 0.13; pointer-events: none; }
.bg-floating-clouds .cloud-layer { position: absolute; inset: 0; pointer-events: none; will-change: transform; }
.bg-floating-clouds .cloud-layer-back { z-index: 2; opacity: 0.20; filter: blur(20px); animation: cloud-drift-back 40s ease-in-out var(--cloud-phase, 0s) infinite alternate both; }
.bg-floating-clouds .cloud-layer-mid { z-index: 3; opacity: 0.28; filter: blur(14px); animation: cloud-drift-mid 32s ease-in-out var(--cloud-phase, 0s) infinite alternate both; }
.bg-floating-clouds .cloud-layer-front { z-index: 4; opacity: 0.36; filter: blur(8px); animation: cloud-drift-front 26s ease-in-out var(--cloud-phase, 0s) infinite alternate both; }
.bg-floating-clouds .cloud-puff { position: absolute; border-radius: 999px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.70) 0%, rgba(255, 255, 255, 0.40) 58%, rgba(255, 255, 255, 0.10) 100%); }
.bg-floating-clouds .cloud-puff::before, .bg-floating-clouds .cloud-puff::after { position: absolute; border-radius: 50%; background: radial-gradient(circle at 50% 36%, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.40) 50%, rgba(255, 255, 255, 0) 90%); content: ""; }
.bg-floating-clouds .cloud-back-1 { top: 34px; left: 50px; width: 640px; height: 112px; }
.bg-floating-clouds .cloud-back-1::before { top: -30px; left: 11%; width: 55%; height: 134px; }
.bg-floating-clouds .cloud-back-1::after { top: -18px; right: 9%; width: 42%; height: 108px; }
.bg-floating-clouds .cloud-back-2 { top: 24px; right: 60px; width: 760px; height: 120px; }
.bg-floating-clouds .cloud-back-2::before { top: -22px; left: 12%; width: 52%; height: 130px; }
.bg-floating-clouds .cloud-back-2::after { top: -14px; right: 10%; width: 40%; height: 104px; }
.bg-floating-clouds .cloud-mid-1 { top: 318px; left: -185px; width: 560px; height: 118px; }
.bg-floating-clouds .cloud-mid-1::before { top: -28px; left: 10%; width: 56%; height: 128px; }
.bg-floating-clouds .cloud-mid-1::after { top: -16px; right: 8%; width: 40%; height: 100px; }
.bg-floating-clouds .cloud-mid-2 { top: 690px; right: -175px; width: 540px; height: 112px; }
.bg-floating-clouds .cloud-mid-2::before { top: -26px; left: 12%; width: 54%; height: 122px; }
.bg-floating-clouds .cloud-mid-2::after { top: -16px; right: 10%; width: 40%; height: 98px; }
.bg-floating-clouds .cloud-front-1 { bottom: -58px; left: -70px; width: 780px; height: 132px; }
.bg-floating-clouds .cloud-front-1::before { top: -34px; left: 10%; width: 52%; height: 138px; }
.bg-floating-clouds .cloud-front-1::after { top: -20px; right: 9%; width: 40%; height: 112px; }
.bg-floating-clouds .cloud-front-2 { bottom: -52px; right: -90px; width: 700px; height: 126px; }
.bg-floating-clouds .cloud-front-2::before { top: -30px; left: 12%; width: 50%; height: 128px; }
.bg-floating-clouds .cloud-front-2::after { top: -18px; right: 10%; width: 40%; height: 104px; }
.bg-floating-clouds .cloud-shimmer-particles { position: absolute; z-index: 5; inset: 0; pointer-events: none; color: var(--bg-accent, var(--accent, #FFD44D)); opacity: 0.60; }
.bg-floating-clouds .cloud-shimmer-particles i { position: absolute; display: block; font-style: normal; line-height: 1; filter: drop-shadow(0 1px 3px rgba(255, 255, 255, 0.5)); animation: cloud-sparkle-float 4.6s ease-in-out var(--shimmer-phase, 0s) infinite alternate both; }
@keyframes cloud-drift-back { 0% { transform: translate3d(-34px, 0, 0); } 100% { transform: translate3d(46px, 10px, 0); } }
@keyframes cloud-drift-mid { 0% { transform: translate3d(38px, 0, 0); } 100% { transform: translate3d(-50px, -8px, 0); } }
@keyframes cloud-drift-front { 0% { transform: translate3d(-26px, 0, 0); } 100% { transform: translate3d(58px, -12px, 0); } }
@keyframes cloud-sparkle-float { 0% { transform: translateY(0) scale(0.92); opacity: 0.15; } 50% { transform: translateY(-9px) scale(1.04); opacity: 0.55; } 100% { transform: translateY(-17px) scale(0.98); opacity: 0.25; } }
@media (prefers-reduced-motion: reduce) {
  .bg-floating-clouds .cloud-layer, .bg-floating-clouds .cloud-shimmer-particles i { animation: none !important; }
}
`;
}

export const floatingCloudsVariant: QuizBackgroundVariant = {
  id: "floating_clouds",
  displayName: "Floating Clouds",
  description: "Dreamy layered cumulus clouds drifting across a sunlit pastel sky with a warm horizon glow and gentle sparkles.",
  performance: FLOATING_CLOUDS_PERFORMANCE,
  renderHtml: renderFloatingCloudsHtml,
  renderCss: renderFloatingCloudsCss,
};
