import type { CounterBadgeRenderInput, CounterBadgeVariant } from "../types.js";

export const goldenShieldVariant: CounterBadgeVariant = {
  id: "golden_shield",
  displayName: "Golden Trophy Shield",
  description: "Royal knight trophy shield with forged golden chain links and gleaming metallic crest.",
  renderHtml(input: CounterBadgeRenderInput): string {
    return `<div class="cb-golden-shield" data-layout-allow-occlusion><div class="shield-chains" aria-hidden="true"><span class="shield-chain chain-left"></span><div class="shield-top-crest"><span>👑</span></div><span class="shield-chain chain-right"></span></div><div class="shield-plaque"><span class="shield-bracket bracket-left" aria-hidden="true"><i class="bracket-gem"></i></span><span class="shield-bracket bracket-right" aria-hidden="true"><i class="bracket-gem"></i></span><div class="shield-inner-panel"><span class="question-number-val shield-num">${input.questionNumber}</span></div><span class="shield-star star-tl" data-layout-ignore aria-hidden="true">✦</span><span class="shield-star star-br" data-layout-ignore aria-hidden="true">★</span></div></div>`;
  },
  renderCss(): string {
    return `
.cb-golden-shield { position: relative; z-index: 6; display: flex; flex-direction: column; align-items: center; width: 240px; transform-origin: 50% 0; animation: shield-drop-enter .64s cubic-bezier(.18,1.42,.34,1) var(--clip-start, 0s) both, shield-float 4.0s ease-in-out calc(var(--clip-start, 0s) + .64s) infinite alternate both; contain: layout style; will-change: transform; }
.cb-golden-shield .shield-chains { position: relative; display: flex; justify-content: space-between; align-items: flex-start; width: 160px; height: 34px; pointer-events: none; }
.cb-golden-shield .shield-chain { width: 9px; height: 100%; border-radius: 4px; background: repeating-linear-gradient(180deg, #FFE066 0px, #FFE066 5px, #B37400 5px, #B37400 10px); box-shadow: 0 2px 5px rgba(13,35,71,.28), inset 0 0 2px #FFF; }
.cb-golden-shield .shield-top-crest { position: absolute; top: 0; left: 50%; transform: translateX(-50%); display: grid; place-items: center; width: 28px; height: 14px; border: 2px solid #FFE066; border-radius: 7px; background: #5C3800; font-size: 10px; line-height: 1; box-shadow: 0 2px 5px rgba(0,0,0,.3); }
.cb-golden-shield .shield-plaque { position: relative; width: 240px; height: 150px; min-height: 150px; padding: 10px; border: 6px solid #FFE57F; border-radius: 30px 30px 48px 48px; background: linear-gradient(145deg, #FFE896 0%, #F5B000 40%, #B37400 80%, #704400 100%); box-shadow: inset 0 5px 0 rgba(255,255,255,.85), inset 0 -6px 0 rgba(60,35,0,.6), 0 12px 0 rgba(13,35,71,.22), 0 22px 32px rgba(10,25,60,.28); display: grid; place-items: center; }
.cb-golden-shield .shield-bracket { position: absolute; top: -9px; width: 22px; height: 16px; border: 3px solid #5C3800; border-radius: 8px; background: #FFD13B; box-shadow: inset 0 2px 0 #FFF, 0 2px 4px rgba(0,0,0,.3); display: grid; place-items: center; }
.cb-golden-shield .bracket-left { left: 28px; }
.cb-golden-shield .bracket-right { right: 28px; }
.cb-golden-shield .bracket-gem { width: 6px; height: 6px; border-radius: 50%; background: #FF0055; box-shadow: 0 0 4px #FF0055; }
.cb-golden-shield .shield-inner-panel { position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; min-height: 110px; border-radius: 20px 20px 38px 38px; border: 3.5px solid #8C5900; background: linear-gradient(180deg, #2D1402 0%, #140801 100%); box-shadow: inset 0 4px 10px rgba(0,0,0,.75), inset 0 -2px 0 rgba(255,225,120,.3); }
.cb-golden-shield .question-number-val.shield-num { font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: 76px; font-weight: 900; line-height: 1; color: #FFF8D6; text-shadow: 0 4px 0 #5C3800, 0 7px 0 #382000, 0 0 12px rgba(255,215,0,.6), 0 8px 18px rgba(0,0,0,.65); letter-spacing: -1px; }
.cb-golden-shield .shield-star { position: absolute; pointer-events: none; }
.cb-golden-shield .star-tl { top: -10px; left: -10px; color: #FFF099; font-size: 26px; text-shadow: 0 0 12px rgba(255,240,153,.9); transform: rotate(-12deg); }
.cb-golden-shield .star-br { bottom: -10px; right: -10px; color: #FFB703; font-size: 28px; text-shadow: 0 3px 0 #4D2600; transform: rotate(15deg); }
@keyframes shield-drop-enter { 0% { transform: translateY(-70px); opacity: 0; } 70% { transform: translateY(6px); opacity: 1; } 100% { transform: translateY(0); opacity: 1; } }
@keyframes shield-float { 0% { transform: translateY(0); } 100% { transform: translateY(-5px); } }
`;
  },
};
