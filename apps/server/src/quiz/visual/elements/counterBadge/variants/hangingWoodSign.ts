import type { CounterBadgeRenderInput, CounterBadgeVariant } from "../types.js";

export const hangingWoodSignVariant: CounterBadgeVariant = {
  id: "hanging_woodsign",
  displayName: "Hanging Wood Sign",
  description: "Classic rustic wooden plank suspended by dangling ropes.",
  renderHtml(input: CounterBadgeRenderInput): string {
    return `<div class="hanging-wood-sign cb-hanging-woodsign" data-layout-allow-occlusion><div class="hanging-ropes" aria-hidden="true"><span class="wood-rope rope-left"></span><span class="wood-rope rope-right"></span></div><div class="wood-sign-plank"><span class="rope-bracket bracket-left" aria-hidden="true"></span><span class="rope-bracket bracket-right" aria-hidden="true"></span><div class="wood-inner-panel"><span class="question-number-val">${input.questionNumber}</span></div><span class="wood-sign-star star-tl" data-layout-ignore aria-hidden="true">✦</span><span class="wood-sign-star star-br" data-layout-ignore aria-hidden="true">★</span></div></div>`;
  },
  renderCss(): string {
    return `
.cb-hanging-woodsign { position: relative; z-index: 6; display: flex; flex-direction: column; align-items: center; width: 250px; transform-origin: 50% 0; animation: hanging-sign-enter .64s cubic-bezier(.18,1.42,.34,1) var(--clip-start, 0s) both, hanging-sign-sway 4.8s ease-in-out calc(var(--clip-start, 0s) + .64s) infinite alternate both; }
.cb-hanging-woodsign .hanging-ropes { position: relative; display: flex; justify-content: space-between; width: 170px; height: 44px; pointer-events: none; }
.cb-hanging-woodsign .wood-rope { width: 9px; height: 100%; border-radius: 4px; background: repeating-linear-gradient(135deg, #D4A373 0px, #D4A373 5px, #A75C1C 5px, #A75C1C 10px); box-shadow: 2px 2px 5px rgba(13,35,71,.28); }
.cb-hanging-woodsign .wood-sign-plank { position: relative; width: 240px; height: 150px; min-height: 150px; padding: 10px; border: 6.5px solid #48200A; border-radius: 34px; background: linear-gradient(180deg, #A25324 0%, #823E17 50%, #642B0D 100%); box-shadow: inset 0 4px 0 rgba(255,215,120,.5), inset 0 -5px 0 rgba(35,14,5,.6), 0 12px 0 rgba(13,35,71,.22), 0 22px 32px rgba(10,25,60,.24); display: grid; place-items: center; }
.cb-hanging-woodsign .rope-bracket { position: absolute; top: -9px; width: 24px; height: 16px; border: 4px solid #331505; border-radius: 8px; background: #FFC436; box-shadow: inset 0 2px 0 #FFF, 0 2px 4px rgba(0,0,0,.3); }
.cb-hanging-woodsign .bracket-left { left: 28px; }
.cb-hanging-woodsign .bracket-right { right: 28px; }
.cb-hanging-woodsign .wood-inner-panel { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; min-height: 108px; border-radius: 22px; border: 4px solid #3E1A07; background: linear-gradient(180deg, #6F3010 0%, #522208 100%); box-shadow: inset 0 4px 8px rgba(0,0,0,.55), inset 0 -3px 0 rgba(255,215,120,.22); }
.cb-hanging-woodsign .question-number-val { font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: 74px; font-weight: 900; line-height: 1; color: #FFFDF0; text-shadow: 0 4px 0 #331505, 0 8px 18px rgba(0,0,0,.5); letter-spacing: -1px; }
.cb-hanging-woodsign .wood-sign-star { position: absolute; pointer-events: none; }
.cb-hanging-woodsign .wood-sign-star.star-tl { top: -10px; left: -10px; color: #FFD43F; font-size: 26px; text-shadow: 0 0 12px rgba(255,212,63,.85); transform: rotate(-15deg); }
.cb-hanging-woodsign .wood-sign-star.star-br { bottom: -10px; right: -10px; color: #FFB703; font-size: 28px; text-shadow: 0 3px 0 #331505; transform: rotate(15deg); }
`;
  },
};
