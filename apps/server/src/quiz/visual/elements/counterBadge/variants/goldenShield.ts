import type { CounterBadgeRenderInput, CounterBadgeVariant } from "../types.js";

export const goldenShieldVariant: CounterBadgeVariant = {
  id: "golden_shield",
  displayName: "Golden Trophy Shield",
  description: "Arcade metallic gold shield with glistening highlight.",
  renderHtml(input: CounterBadgeRenderInput): string {
    return `<div class="cb-golden-shield" data-layout-allow-occlusion><div class="shield-outer"><div class="shield-glint" data-layout-ignore aria-hidden="true"></div><div class="shield-inner"><span class="shield-crest">★</span><span class="shield-num">${input.questionNumber}</span></div></div></div>`;
  },
  renderCss(): string {
    return `
.cb-golden-shield { position: relative; width: 100px; height: 110px; filter: drop-shadow(0 10px 18px rgba(0,0,0,0.35)); }
.cb-golden-shield .shield-outer { position: relative; width: 94px; height: 106px; clip-path: polygon(50% 0%, 100% 15%, 100% 70%, 50% 100%, 0% 70%, 0% 15%); background: linear-gradient(135deg, #FFF099 0%, #F5B000 45%, #8C5900 100%); padding: 5px; display: grid; place-items: center; }
.cb-golden-shield .shield-glint { position: absolute; inset: 0; background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.7) 50%, transparent 60%); pointer-events: none; animation: shieldShine 3.5s ease-in-out infinite; }
.cb-golden-shield .shield-inner { width: 84px; height: 96px; clip-path: polygon(50% 0%, 100% 15%, 100% 70%, 50% 100%, 0% 70%, 0% 15%); background: linear-gradient(180deg, #2E1B00 0%, #5E3900 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.cb-golden-shield .shield-crest { font-size: 16px; color: #FFD700; line-height: 1; margin-bottom: 2px; }
.cb-golden-shield .shield-num { font-size: 36px; font-weight: 900; color: #FFEA75; text-shadow: 0 0 10px #FFB800, 0 3px 6px rgba(0,0,0,0.8); line-height: 1; }
@keyframes shieldShine { 0%, 100% { transform: translateX(-100%); } 30%, 70% { transform: translateX(100%); } }
`;
  },
};
