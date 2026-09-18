import type { QuestionBoxRenderInput, QuestionBoxVariant } from "../types.js";

export const hazardStripesVariant: QuestionBoxVariant = {
  id: "hazard_stripes",
  displayName: "Hazard Worksite Frame",
  description: "Heavy-duty industrial container accented with bold diagonal hazard caution stripes and steel rivets.",
  renderHtml(input: QuestionBoxRenderInput): string {
    const content = input.highlightedHtml ?? input.question;
    return `<div class="question-title qb-hazard-stripes question-tier-${input.tier}" data-layout-allow-occlusion><div class="hazard-card-inner"><div class="hazard-stripe-bar hazard-stripe-top" data-layout-ignore aria-hidden="true"></div><div class="hazard-stripe-bar hazard-stripe-bottom" data-layout-ignore aria-hidden="true"></div><div class="hazard-metal-plate" data-layout-ignore aria-hidden="true"></div><div class="hazard-rivet rivet-tl" data-layout-ignore aria-hidden="true"></div><div class="hazard-rivet rivet-tr" data-layout-ignore aria-hidden="true"></div><div class="hazard-rivet rivet-bl" data-layout-ignore aria-hidden="true"></div><div class="hazard-rivet rivet-br" data-layout-ignore aria-hidden="true"></div><div class="hazard-spec-tag tag-left" data-layout-ignore aria-hidden="true">ZONE-01</div><div class="hazard-spec-tag tag-right" data-layout-ignore aria-hidden="true">HEAVY-DUTY</div><h1>${content}</h1></div></div>`;
  },
  renderCss(): string {
    return `
.qb-hazard-stripes .hazard-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 168px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 76px;
  box-sizing: border-box;
  border: 4px solid #475569;
  border-radius: 20px;
  background: linear-gradient(180deg, var(--bg-primary, #2A2F3D) 0%, #1A1E27 100%);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45), inset 0 2px 0 rgba(255, 255, 255, 0.16), inset 0 -3px 0 rgba(0, 0, 0, 0.6);
  overflow: hidden;
  contain: layout style;
}
.qb-hazard-stripes .hazard-stripe-bar {
  position: absolute;
  left: 0;
  right: 0;
  height: 10px;
  background: repeating-linear-gradient(-45deg, var(--bg-accent, var(--accent, #FACC15)) 0 16px, #18181B 16px 32px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.65);
  pointer-events: none;
  z-index: 2;
}
.qb-hazard-stripes .hazard-stripe-top {
  top: 0;
  border-bottom: 2px solid #0F172A;
}
.qb-hazard-stripes .hazard-stripe-bottom {
  bottom: 0;
  border-top: 2px solid #0F172A;
}
.qb-hazard-stripes .hazard-metal-plate {
  position: absolute;
  inset: 10px 0;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(250, 204, 21, 0.08) 0%, transparent 70%),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.015) 0 2px, transparent 2px 4px);
  pointer-events: none;
}
.qb-hazard-stripes .hazard-rivet {
  position: absolute;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #F8FAFC 0%, #94A3B8 50%, #475569 100%);
  border: 1px solid #1E293B;
  box-shadow: inset 0 1px 1px #FFF, 0 2px 4px rgba(0, 0, 0, 0.7);
  pointer-events: none;
  z-index: 3;
}
.qb-hazard-stripes .rivet-tl { top: 14px; left: 16px; }
.qb-hazard-stripes .rivet-tr { top: 14px; right: 16px; }
.qb-hazard-stripes .rivet-bl { bottom: 14px; left: 16px; }
.qb-hazard-stripes .rivet-br { bottom: 14px; right: 16px; }
.qb-hazard-stripes .hazard-spec-tag {
  position: absolute;
  font-family: monospace;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #94A3B8;
  opacity: 0.75;
  pointer-events: none;
  z-index: 3;
}
.qb-hazard-stripes .tag-left { left: 34px; top: 14px; }
.qb-hazard-stripes .tag-right { right: 34px; top: 14px; }
.qb-hazard-stripes h1 {
  position: relative;
  z-index: 4;
  color: #FFFFFF !important;
  font-weight: 800;
  text-align: center;
  text-shadow: 0 2px 0 #000000, 0 4px 12px rgba(0, 0, 0, 0.85);
}
.qb-hazard-stripes .keyword-highlight {
  color: #FACC15 !important;
  text-shadow: 0 2px 0 #713F12, 0 0 12px rgba(250, 204, 21, 0.6);
  font-weight: 900;
}
`;
  },
};
