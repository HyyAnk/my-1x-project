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
.cb-hanging-woodsign { position: relative; width: 140px; height: 110px; }
.cb-hanging-woodsign .hanging-ropes { position: absolute; top: 0; left: 0; right: 0; height: 36px; display: flex; justify-content: space-between; padding: 0 28px; }
.cb-hanging-woodsign .wood-rope { width: 6px; height: 100%; background: repeating-linear-gradient(45deg, #B8860B, #B8860B 4px, #8B5A2B 4px, #8B5A2B 8px); border-radius: 3px; box-shadow: 2px 2px 4px rgba(0,0,0,.35); }
.cb-hanging-woodsign .wood-sign-plank { position: absolute; bottom: 0; left: 0; right: 0; height: 82px; border-radius: 20px; background: linear-gradient(180deg, #D49B5B 0%, #8C5828 100%); border: 4px solid #5C3814; box-shadow: 0 10px 0 #3D230B, 0 16px 24px rgba(0,0,0,.35); display: grid; place-items: center; }
.cb-hanging-woodsign .wood-inner-panel { width: 104px; height: 56px; border-radius: 12px; background: #FFFEE8; border: 3px solid #5C3814; display: grid; place-items: center; box-shadow: inset 0 2px 6px rgba(0,0,0,.2); }
.cb-hanging-woodsign .question-number-val { font-size: 38px; font-weight: 900; color: #5C3814; line-height: 1; }
.cb-hanging-woodsign .wood-sign-star { position: absolute; font-size: 16px; color: #FFE484; text-shadow: 0 0 6px #FFA500; }
.cb-hanging-woodsign .star-tl { top: 4px; left: 6px; }
.cb-hanging-woodsign .star-br { bottom: 4px; right: 6px; }
`;
  },
};
