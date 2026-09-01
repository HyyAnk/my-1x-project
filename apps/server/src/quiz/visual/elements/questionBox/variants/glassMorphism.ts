import type { QuestionBoxRenderInput, QuestionBoxVariant } from "../types.js";

export const glassMorphismVariant: QuestionBoxVariant = {
  id: "glass_morphism",
  displayName: "Frosted Glassmorphism",
  description: "Ultra-modern translucent frosted glass card with luminous accents and crystal-clear typography.",
  renderHtml(input: QuestionBoxRenderInput): string {
    const content = input.highlightedHtml ?? input.question;
    return `<div class="question-title qb-glass-morphism question-tier-${input.tier}" data-layout-allow-occlusion><div class="glass-card-inner"><div class="glass-ambient-glow" data-layout-ignore aria-hidden="true"></div><div class="glass-specular-edge" data-layout-ignore aria-hidden="true"></div><span class="glass-corner-accent tr" data-layout-ignore aria-hidden="true">✦</span><span class="glass-corner-accent bl" data-layout-ignore aria-hidden="true">✦</span><h1>${content}</h1></div></div>`;
  },
  renderCss(): string {
    return `
.qb-glass-morphism .glass-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 168px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 48px;
  box-sizing: border-box;
  border: 4px solid rgba(255, 255, 255, 0.95);
  border-radius: 40px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(243, 248, 255, 0.84) 48%, rgba(255, 255, 255, 0.9) 100%);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18), 0 8px 16px rgba(15, 23, 42, 0.08), inset 0 3px 0 rgba(255, 255, 255, 0.98), inset 0 -3px 0 rgba(220, 235, 255, 0.5);
  overflow: hidden;
  contain: layout style;
}
.qb-glass-morphism .glass-ambient-glow {
  position: absolute;
  top: -60px;
  right: -40px;
  width: 220px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, rgba(99, 102, 241, 0.1) 45%, transparent 70%);
  pointer-events: none;
}
.qb-glass-morphism .glass-specular-edge {
  position: absolute;
  inset: 0;
  border-radius: 36px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0) 35%, rgba(0, 240, 255, 0.06) 100%);
  pointer-events: none;
}
.qb-glass-morphism .glass-corner-accent {
  position: absolute;
  font-size: 20px;
  line-height: 1;
  font-style: normal;
  pointer-events: none;
  z-index: 3;
}
.qb-glass-morphism .glass-corner-accent.tr {
  top: 14px;
  right: 20px;
  color: rgba(14, 165, 233, 0.6);
  text-shadow: 0 0 8px rgba(14, 165, 233, 0.4);
}
.qb-glass-morphism .glass-corner-accent.bl {
  bottom: 14px;
  left: 20px;
  color: rgba(168, 85, 247, 0.55);
  text-shadow: 0 0 8px rgba(168, 85, 247, 0.35);
}
.qb-glass-morphism h1 {
  position: relative;
  z-index: 4;
  color: #0F172A !important;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9), 0 2px 8px rgba(15, 23, 42, 0.08);
  font-weight: 800;
  text-align: center;
}
.qb-glass-morphism .keyword-highlight {
  color: #0284C7 !important;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.95);
  font-weight: 900;
}
`;
  },
};
