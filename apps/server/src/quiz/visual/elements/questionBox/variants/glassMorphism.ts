import type { QuestionBoxRenderInput, QuestionBoxVariant } from "../types.js";

export const glassMorphismVariant: QuestionBoxVariant = {
  id: "glass_morphism",
  displayName: "Frosted Glassmorphism",
  description: "Ultra-modern translucent frosted glass card with glowing outline.",
  renderHtml(input: QuestionBoxRenderInput): string {
    const content = input.highlightedHtml ?? input.question;
    return `<div class="question-title qb-glass-morphism question-tier-${input.tier}" data-layout-allow-occlusion><div class="glass-card-inner"><div class="glass-ambient-glow" data-layout-ignore aria-hidden="true"></div><div class="glass-top-pill" data-layout-ignore aria-hidden="true"><span class="glass-dot"></span><span>QUESTION</span></div><h1>${content}</h1></div></div>`;
  },
  renderCss(): string {
    return `
.qb-glass-morphism .glass-card-inner { position: relative; width: 100%; height: 100%; min-height: 168px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px 42px; box-sizing: border-box; border: 3px solid rgba(255,255,255,0.65); border-radius: 36px; background: linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.12) 100%); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); box-shadow: 0 16px 40px rgba(0,0,0,0.2), inset 0 2px 2px rgba(255,255,255,0.8); overflow: hidden; }
.qb-glass-morphism .glass-ambient-glow { position: absolute; top: -50px; right: -50px; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle, rgba(255,214,90,0.45) 0%, rgba(255,214,90,0) 70%); pointer-events: none; }
.qb-glass-morphism .glass-top-pill { display: inline-flex; align-items: center; gap: 8px; padding: 4px 14px; border-radius: 999px; background: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.6); font-size: 15px; font-weight: 800; letter-spacing: 0.1em; color: #FFF; margin-bottom: 12px; text-shadow: 0 1px 3px rgba(0,0,0,0.3); }
.qb-glass-morphism .glass-dot { width: 8px; height: 8px; border-radius: 50%; background: #22E58B; box-shadow: 0 0 8px #22E58B; }
.qb-glass-morphism h1 { color: #FFFFFF; text-shadow: 0 3px 12px rgba(0,0,0,0.35); font-weight: 900; }
`;
  },
};
