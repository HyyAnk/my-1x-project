import type { QuestionBoxRenderInput, QuestionBoxVariant } from "../types.js";

export const parchmentScrollVariant: QuestionBoxVariant = {
  id: "parchment_scroll",
  displayName: "Adventure Parchment Scroll",
  description: "Classic rolled parchment banner with ancient adventurous aesthetics.",
  renderHtml(input: QuestionBoxRenderInput): string {
    const content = input.highlightedHtml ?? input.question;
    return `<div class="question-title qb-parchment-scroll question-tier-${input.tier}" data-layout-allow-occlusion><div class="scroll-wrap"><div class="scroll-roll roll-left" data-layout-ignore aria-hidden="true"></div><div class="scroll-body"><div class="scroll-seal" data-layout-ignore aria-hidden="true">⚜</div><h1>${content}</h1></div><div class="scroll-roll roll-right" data-layout-ignore aria-hidden="true"></div></div></div>`;
  },
  renderCss(): string {
    return `
.qb-parchment-scroll .scroll-wrap { position: relative; width: 100%; height: 100%; min-height: 168px; display: flex; align-items: center; justify-content: center; }
.qb-parchment-scroll .scroll-body { position: relative; flex: 1; height: 100%; min-height: 168px; display: flex; align-items: center; justify-content: center; padding: 16px 36px; box-sizing: border-box; background: #F6E6C2; border-top: 5px solid #8C572A; border-bottom: 5px solid #8C572A; box-shadow: 0 14px 28px rgba(0,0,0,0.25); }
.qb-parchment-scroll .scroll-roll { width: 34px; height: calc(100% + 28px); background: linear-gradient(90deg, #D4B07B 0%, #F9ECC8 45%, #C29961 100%); border: 4px solid #73451F; border-radius: 8px; box-shadow: 0 10px 20px rgba(0,0,0,0.3); z-index: 2; }
.qb-parchment-scroll .roll-left { margin-right: -6px; }
.qb-parchment-scroll .roll-right { margin-left: -6px; }
.qb-parchment-scroll .scroll-seal { position: absolute; top: -18px; right: 28px; width: 44px; height: 44px; border-radius: 50%; background: #A32A2A; border: 3px solid #F6E6C2; color: #FFD700; display: grid; place-items: center; font-size: 22px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
.qb-parchment-scroll h1 { color: #3A2312; font-family: "Georgia", serif; font-weight: 800; }
`;
  },
};
