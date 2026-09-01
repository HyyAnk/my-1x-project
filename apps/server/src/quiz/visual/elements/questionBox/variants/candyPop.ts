import type { QuestionBoxRenderInput, QuestionBoxVariant } from "../types.js";

export const candyPopVariant: QuestionBoxVariant = {
  id: "candy_pop",
  displayName: "Candy Pop Card",
  description: "Vibrant card with rounded 3D borders, stars, and candy corner accents.",
  renderHtml(input: QuestionBoxRenderInput): string {
    const content = input.highlightedHtml ?? input.question;
    return `<div class="question-title qb-candy-pop question-tier-${input.tier}" data-layout-allow-occlusion><div class="question-card-inner"><div class="q-badge-star" data-layout-ignore aria-hidden="true"><span class="star-shape">★</span><i class="star-sparkle star-sp-1">✦</i><i class="star-sparkle star-sp-2">•</i></div><div class="q-decor-corner q-decor-top-right" data-layout-ignore aria-hidden="true"><span class="corner-gem">✦</span></div><div class="q-decor-corner q-decor-bottom-right" data-layout-ignore aria-hidden="true"><span class="corner-petal">✿</span></div><h1>${content}</h1></div></div>`;
  },
  renderCss(): string {
    return `
.qb-candy-pop .question-card-inner { position: relative; width: 100%; height: 100%; min-height: 168px; display: flex; align-items: center; justify-content: center; padding: 16px 54px; box-sizing: border-box; border: 7px solid #FFF; border-radius: 46px; background: linear-gradient(180deg, #FFFFFF 0%, #F5F9FF 100%); box-shadow: 0 16px 0 rgba(13,35,71,.18), 0 24px 38px rgba(13,35,71,.24), inset 0 3px 0 rgba(255,255,255,1); }
.qb-candy-pop .q-badge-star { position: absolute; top: -28px; left: -24px; display: grid; place-items: center; width: 76px; height: 76px; border-radius: 50%; background: linear-gradient(135deg, #FFE043 0%, #FF9921 100%); border: 5px solid #FFF; box-shadow: 0 8px 16px rgba(13,35,71,.25); }
.qb-candy-pop .q-badge-star .star-shape { font-size: 38px; color: #FFF; line-height: 1; text-shadow: 0 2px 4px rgba(0,0,0,.3); }
.qb-candy-pop .q-decor-corner { position: absolute; font-style: normal; pointer-events: none; }
.qb-candy-pop .q-decor-top-right { top: -14px; right: -12px; font-size: 34px; color: #FF6C78; }
.qb-candy-pop .q-decor-bottom-right { bottom: -16px; right: 28px; font-size: 30px; color: #3BC7C9; }
`;
  },
};
