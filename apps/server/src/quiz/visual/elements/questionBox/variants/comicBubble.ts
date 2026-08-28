import type { QuestionBoxRenderInput, QuestionBoxVariant } from "../types.js";

export const comicBubbleVariant: QuestionBoxVariant = {
  id: "comic_bubble",
  displayName: "Comic Book Bubble",
  description: "Playful comic speech bubble with bold outline, halftone dots, and tail.",
  renderHtml(input: QuestionBoxRenderInput): string {
    const content = input.highlightedHtml ?? input.question;
    return `<div class="question-title qb-comic-bubble question-tier-${input.tier}" data-layout-allow-occlusion><div class="comic-bubble-body"><div class="comic-action-badge" data-layout-ignore aria-hidden="true"><span>POP!</span></div><div class="comic-halftone" data-layout-ignore aria-hidden="true"></div><h1>${content}</h1><div class="comic-bubble-tail" data-layout-ignore aria-hidden="true"></div></div></div>`;
  },
  renderCss(): string {
    return `
.qb-comic-bubble .comic-bubble-body { position: relative; width: 100%; padding: 24px 38px; border: 8px solid #132A58; border-radius: 40px; background: #FFFEEA; box-shadow: 12px 14px 0 #132A58, 0 20px 30px rgba(0,0,0,.15); overflow: visible; }
.qb-comic-bubble .comic-action-badge { position: absolute; top: -26px; left: 32px; background: #FF3366; color: #FFF; font-weight: 900; font-size: 22px; padding: 4px 16px; border: 4px solid #132A58; border-radius: 12px; transform: rotate(-8deg); box-shadow: 4px 4px 0 #132A58; }
.qb-comic-bubble .comic-halftone { position: absolute; top: 0; right: 0; bottom: 0; width: 120px; border-radius: 0 32px 32px 0; background: radial-gradient(#132A58 15%, transparent 16%); background-size: 14px 14px; opacity: 0.12; pointer-events: none; }
.qb-comic-bubble .comic-bubble-tail { position: absolute; bottom: -28px; left: 80px; width: 0; height: 0; border-left: 18px solid transparent; border-right: 18px solid transparent; border-top: 28px solid #132A58; }
.qb-comic-bubble .comic-bubble-tail::after { content: ""; position: absolute; top: -33px; left: -12px; width: 0; height: 0; border-left: 12px solid transparent; border-right: 12px solid transparent; border-top: 24px solid #FFFEEA; }
.qb-comic-bubble h1 { color: #132A58; font-weight: 900; }
`;
  },
};
