import type { QuestionBoxRenderInput, QuestionBoxVariant } from "../types.js";

export const pastelCloudVariant: QuestionBoxVariant = {
  id: "pastel_cloud",
  displayName: "Pastel Fluffy Cloud",
  description: "Soft fluffy cumulus cloud container with gentle curved billows, pastel perimeter aura, and dreamy aesthetic.",
  renderHtml(input: QuestionBoxRenderInput): string {
    const content = input.highlightedHtml ?? input.question;
    return `<div class="question-title qb-pastel-cloud question-tier-${input.tier}" data-layout-allow-occlusion><div class="cloud-card-inner"><div class="cloud-ambient-glow" data-layout-ignore aria-hidden="true"></div><div class="cloud-billows" data-layout-ignore aria-hidden="true"><span class="cloud-puff puff-tl"></span><span class="cloud-puff puff-tc"></span><span class="cloud-puff puff-tr"></span><span class="cloud-puff puff-bl"></span><span class="cloud-puff puff-bc"></span><span class="cloud-puff puff-br"></span></div><div class="cloud-sparkle sparkle-tl" data-layout-ignore aria-hidden="true">✦</div><div class="cloud-sparkle sparkle-tr" data-layout-ignore aria-hidden="true">★</div><div class="cloud-sparkle sparkle-bl" data-layout-ignore aria-hidden="true">✿</div><div class="cloud-sparkle sparkle-br" data-layout-ignore aria-hidden="true">✧</div><h1>${content}</h1></div></div>`;
  },
  renderCss(): string {
    return `
.qb-pastel-cloud .cloud-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 168px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 80px;
  box-sizing: border-box;
  border: 5px solid #FFFFFF;
  border-radius: 46px;
  background:
    linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 62%, rgba(255, 255, 255, 0.94) 80%, rgba(255, 245, 252, 0.90) 100%),
    linear-gradient(180deg, #FFFFFF 0%, var(--bg-primary, #FFF5FB) 65%, var(--bg-secondary, #F0F4FF) 100%);
  box-shadow:
    0 0 0 2.5px var(--bg-accent, var(--accent, rgba(244, 114, 182, 0.35))),
    0 16px 36px rgba(167, 139, 250, 0.20),
    0 6px 16px rgba(45, 21, 64, 0.08),
    inset 0 3px 0 #FFFFFF,
    inset 0 -3px 0 rgba(244, 114, 182, 0.22);
  overflow: hidden;
  contain: layout style;
}
.qb-pastel-cloud .cloud-ambient-glow {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  width: 520px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, var(--bg-accent, var(--accent, rgba(244, 114, 182, 0.16))) 0%, transparent 70%);
  pointer-events: none;
}
.qb-pastel-cloud .cloud-billows {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.qb-pastel-cloud .cloud-puff {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.6) 55%, transparent 80%);
  opacity: 0.65;
  filter: blur(1.5px);
}
.qb-pastel-cloud .puff-tl { top: -24px; left: 15%; width: 140px; height: 50px; }
.qb-pastel-cloud .puff-tc { top: -26px; left: 45%; width: 180px; height: 52px; }
.qb-pastel-cloud .puff-tr { top: -24px; right: 15%; width: 140px; height: 50px; }
.qb-pastel-cloud .puff-bl { bottom: -24px; left: 20%; width: 150px; height: 50px; }
.qb-pastel-cloud .puff-bc { bottom: -26px; left: 50%; width: 170px; height: 52px; }
.qb-pastel-cloud .puff-br { bottom: -24px; right: 20%; width: 150px; height: 50px; }
.qb-pastel-cloud .cloud-sparkle {
  position: absolute;
  font-size: 18px;
  line-height: 1;
  font-style: normal;
  pointer-events: none;
  z-index: 3;
  opacity: 0.85;
  animation: qb-pastel-cloud-shimmer 3.6s ease-in-out infinite alternate;
}
.qb-pastel-cloud .sparkle-tl {
  top: 16px;
  left: 22px;
  color: var(--bg-accent, var(--accent, #F472B6));
  text-shadow: 0 1px 3px rgba(244, 114, 182, 0.35);
  animation-delay: 0s;
}
.qb-pastel-cloud .sparkle-tr {
  top: 16px;
  right: 22px;
  color: #FBBF24;
  text-shadow: 0 1px 3px rgba(251, 191, 36, 0.35);
  animation-delay: 0.9s;
}
.qb-pastel-cloud .sparkle-bl {
  bottom: 16px;
  left: 22px;
  color: #38BDF8;
  text-shadow: 0 1px 3px rgba(56, 189, 248, 0.35);
  animation-delay: 1.8s;
}
.qb-pastel-cloud .sparkle-br {
  bottom: 16px;
  right: 22px;
  color: #A78BFA;
  text-shadow: 0 1px 3px rgba(167, 139, 250, 0.35);
  animation-delay: 2.7s;
}
.qb-pastel-cloud h1 {
  position: relative;
  z-index: 4;
  color: #2D1540 !important;
  font-weight: 800;
  text-align: center;
  letter-spacing: -0.3px;
  text-shadow: 0 1px 2px rgba(45, 21, 64, 0.08);
}
.qb-pastel-cloud .keyword-highlight {
  color: #DB2777 !important;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8), 0 0 1px rgba(219, 39, 119, 0.3);
  font-weight: 900;
}
@keyframes qb-pastel-cloud-shimmer {
  0% { transform: scale(0.92) rotate(0deg); opacity: 0.70; }
  50% { transform: scale(1.08) rotate(10deg); opacity: 0.95; }
  100% { transform: scale(0.92) rotate(0deg); opacity: 0.70; }
}
`;
  },
};
