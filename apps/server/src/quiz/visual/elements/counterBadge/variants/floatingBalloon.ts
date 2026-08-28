import type { CounterBadgeRenderInput, CounterBadgeVariant } from "../types.js";

export const floatingBalloonVariant: CounterBadgeVariant = {
  id: "floating_balloon",
  displayName: "Floating Party Balloon",
  description: "Whimsical floating helium balloon gently bobbing with question number.",
  renderHtml(input: CounterBadgeRenderInput): string {
    return `<div class="cb-floating-balloon" data-layout-allow-occlusion><div class="balloon-body"><div class="balloon-shine" data-layout-ignore aria-hidden="true"></div><span class="balloon-num">${input.questionNumber}</span><div class="balloon-knot" data-layout-ignore aria-hidden="true"></div><div class="balloon-string" data-layout-ignore aria-hidden="true"></div></div></div>`;
  },
  renderCss(): string {
    return `
.cb-floating-balloon { position: relative; width: 90px; height: 110px; animation: balloonFloat 3s ease-in-out infinite; }
.cb-floating-balloon .balloon-body { position: relative; width: 84px; height: 96px; border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%; background: radial-gradient(circle at 30% 30%, #FF7696 0%, #FF2E63 65%, #C20038 100%); box-shadow: 0 12px 24px rgba(255,46,99,0.35), inset -4px -6px 12px rgba(0,0,0,0.25); display: grid; place-items: center; }
.cb-floating-balloon .balloon-shine { position: absolute; top: 14px; left: 16px; width: 18px; height: 26px; border-radius: 50%; background: rgba(255,255,255,0.7); transform: rotate(-35deg); filter: blur(1px); }
.cb-floating-balloon .balloon-num { position: relative; z-index: 1; font-size: 38px; font-weight: 900; color: #FFF; text-shadow: 0 2px 6px rgba(0,0,0,0.4); line-height: 1; }
.cb-floating-balloon .balloon-knot { position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-bottom: 9px solid #C20038; }
.cb-floating-balloon .balloon-string { position: absolute; bottom: -24px; left: 50%; width: 2px; height: 20px; background: rgba(255,255,255,0.6); transform: translateX(-50%); }
@keyframes balloonFloat { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-8px) rotate(3deg); } }
`;
  },
};
