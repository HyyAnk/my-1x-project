import type { QuestionBoxRenderInput, QuestionBoxVariant } from "../types.js";

export const cockpitHudVariant: QuestionBoxVariant = {
  id: "cockpit_hud",
  displayName: "Cockpit Sci-Fi HUD",
  description:
    "Futuristic aerospace HUD terminal with targeted reticles, cyan digital telemetry brackets, and holographic display borders.",
  renderHtml(input: QuestionBoxRenderInput): string {
    const content = input.highlightedHtml ?? input.question;
    return `<div class="question-title qb-cockpit-hud question-tier-${input.tier}" data-layout-allow-occlusion><div class="hud-card-inner"><div class="hud-grid-overlay" data-layout-ignore aria-hidden="true"></div><div class="hud-scan-line" data-layout-ignore aria-hidden="true"></div><div class="hud-bracket bracket-tl" data-layout-ignore aria-hidden="true"></div><div class="hud-bracket bracket-tr" data-layout-ignore aria-hidden="true"></div><div class="hud-bracket bracket-bl" data-layout-ignore aria-hidden="true"></div><div class="hud-bracket bracket-br" data-layout-ignore aria-hidden="true"></div><div class="hud-telemetry telemetry-top" data-layout-ignore aria-hidden="true"><span class="hud-tag">// HUD.NAV: RECON-07</span><span class="hud-status-dot"></span><span class="hud-tag">SIGNAL: 98.4%</span></div><div class="hud-reticle reticle-left" data-layout-ignore aria-hidden="true"><span class="reticle-cross">✛</span><span class="reticle-bars"><i></i><i></i><i></i></span></div><div class="hud-reticle reticle-right" data-layout-ignore aria-hidden="true"><span class="reticle-bars"><i></i><i></i><i></i></span><span class="reticle-cross">✛</span></div><div class="hud-telemetry telemetry-bottom" data-layout-ignore aria-hidden="true"><span class="hud-axis-ticks">--- · [ TARGET ACQUIRED ] · ---</span></div><h1>${content}</h1></div></div>`;
  },
  renderCss(): string {
    return `
.qb-cockpit-hud .hud-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 168px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px 84px;
  box-sizing: border-box;
  border: 2px solid var(--bg-accent, rgba(0, 240, 255, 0.65));
  border-radius: 18px;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(0, 240, 255, 0.08) 0%, transparent 65%),
    linear-gradient(180deg, rgba(8, 20, 42, 0.95) 0%, rgba(4, 11, 26, 0.98) 100%),
    linear-gradient(180deg, var(--bg-primary, #0A192F) 0%, var(--bg-secondary, #020C1B) 100%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 0 24px rgba(0, 240, 255, 0.18), inset 0 0 20px rgba(0, 200, 255, 0.06), 0 16px 36px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  contain: layout style;
}
.qb-cockpit-hud .hud-grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 240, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 240, 255, 0.025) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
  mask-image: radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.85) 100%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.85) 100%);
}
.qb-cockpit-hud .hud-scan-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, var(--bg-accent, var(--accent, #00F0FF)) 50%, transparent 100%);
  opacity: 0.18;
  animation: qb-cockpit-hud-scan 5s linear infinite;
  pointer-events: none;
  z-index: 1;
}
.qb-cockpit-hud .hud-bracket {
  position: absolute;
  width: 18px;
  height: 18px;
  border: 2.5px solid var(--bg-accent, var(--accent, #00F0FF));
  pointer-events: none;
  z-index: 3;
}
.qb-cockpit-hud .bracket-tl { top: 7px; left: 7px; border-right: none; border-bottom: none; }
.qb-cockpit-hud .bracket-tr { top: 7px; right: 7px; border-left: none; border-bottom: none; }
.qb-cockpit-hud .bracket-bl { bottom: 7px; left: 7px; border-right: none; border-top: none; }
.qb-cockpit-hud .bracket-br { bottom: 7px; right: 7px; border-left: none; border-top: none; }
.qb-cockpit-hud .hud-telemetry {
  position: absolute;
  font-family: monospace;
  pointer-events: none;
  z-index: 3;
}
.qb-cockpit-hud .telemetry-top {
  top: 8px;
  left: 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  font-weight: 700;
  color: rgba(0, 240, 255, 0.65);
  letter-spacing: 1px;
}
.qb-cockpit-hud .hud-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--bg-accent, var(--accent, #22D3EE));
  box-shadow: 0 0 6px #22D3EE;
  animation: qb-cockpit-hud-blink 1.2s ease-in-out infinite alternate;
}
.qb-cockpit-hud .telemetry-bottom {
  bottom: 8px;
  right: 32px;
  font-size: 9px;
  font-weight: 700;
  color: rgba(0, 240, 255, 0.55);
  letter-spacing: 1.5px;
}
.qb-cockpit-hud .hud-reticle {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(0, 240, 255, 0.4);
  pointer-events: none;
  z-index: 3;
}
.qb-cockpit-hud .reticle-left { left: 22px; }
.qb-cockpit-hud .reticle-right { right: 22px; }
.qb-cockpit-hud .reticle-cross { font-size: 13px; line-height: 1; }
.qb-cockpit-hud .reticle-bars { display: flex; flex-direction: column; gap: 3px; }
.qb-cockpit-hud .reticle-bars i { display: block; width: 12px; height: 2px; background: rgba(0, 240, 255, 0.4); }
.qb-cockpit-hud .reticle-bars i:nth-child(2) { width: 18px; }
.qb-cockpit-hud h1 {
  position: relative;
  z-index: 4;
  color: #FFFFFF !important;
  font-weight: 800;
  text-align: center;
  text-shadow: 0 2px 0 #020617, 0 3px 8px rgba(0, 0, 0, 0.9), 0 0 6px rgba(0, 240, 255, 0.25);
  letter-spacing: -0.2px;
}
.qb-cockpit-hud .keyword-highlight {
  color: #00F0FF !important;
  text-shadow: 0 2px 0 #02182B, 0 0 8px rgba(0, 240, 255, 0.6);
  font-weight: 900;
}
@keyframes qb-cockpit-hud-scan {
  0% { top: 0%; opacity: 0; }
  20% { opacity: 0.25; }
  80% { opacity: 0.25; }
  100% { top: 100%; opacity: 0; }
}
@keyframes qb-cockpit-hud-blink {
  0% { opacity: 0.35; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1.15); }
}
`;
  },
};
