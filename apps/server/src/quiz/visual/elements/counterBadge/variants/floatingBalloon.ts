import type { CounterBadgeRenderInput, CounterBadgeVariant } from "../types.js";

export const floatingBalloonVariant: CounterBadgeVariant = {
  id: "floating_balloon",
  displayName: "Floating Party Balloon",
  description: "Vibrant 3D carnival balloon plaque with festive streamers and bouncy float physics.",
  renderHtml(input: CounterBadgeRenderInput): string {
    return `<div class="cb-floating-balloon" data-layout-allow-occlusion><div class="balloon-streamers" aria-hidden="true"><span class="balloon-streamer streamer-left"></span><div class="balloon-top-knot"><span class="knot-bow">✦</span></div><span class="balloon-streamer streamer-right"></span></div><div class="balloon-plaque"><div class="balloon-gloss-shine" data-layout-ignore aria-hidden="true"></div><div class="balloon-inner-panel"><span class="question-number-val balloon-num">${input.questionNumber}</span></div><span class="balloon-sparkle sparkle-tl" data-layout-ignore aria-hidden="true">✦</span><span class="balloon-sparkle sparkle-br" data-layout-ignore aria-hidden="true">★</span><div class="balloon-bottom-tie" data-layout-ignore aria-hidden="true"><span class="balloon-tail-knot"></span><span class="balloon-curled-ribbon"></span></div></div></div>`;
  },
  renderCss(): string {
    return `
.cb-floating-balloon { position: relative; z-index: 6; display: flex; flex-direction: column; align-items: center; width: 240px; transform-origin: 50% 0; animation: balloon-bounce-enter .68s cubic-bezier(.18,1.42,.34,1) var(--clip-start, 0s) both, balloon-bob-float 3.6s ease-in-out calc(var(--clip-start, 0s) + .68s) infinite alternate both; contain: layout style; will-change: transform; transform: translate3d(0,0,0); }
.cb-floating-balloon .balloon-streamers { position: relative; display: flex; justify-content: space-between; align-items: flex-start; width: 160px; height: 34px; pointer-events: none; }
.cb-floating-balloon .balloon-streamer { width: 8px; height: 100%; border-radius: 4px; background: repeating-linear-gradient(135deg, #FF6B8B 0px, #FF6B8B 6px, #FFD166 6px, #FFD166 12px); box-shadow: 0 2px 6px rgba(13,35,71,.25); }
.cb-floating-balloon .balloon-top-knot { position: absolute; top: 0; left: 50%; transform: translateX(-50%); display: grid; place-items: center; width: 26px; height: 14px; border: 3px solid #FFF; border-radius: 8px; background: #FFD166; box-shadow: 0 2px 5px rgba(0,0,0,.25); }
.cb-floating-balloon .knot-bow { font-size: 11px; color: #FFF; line-height: 1; text-shadow: 0 1px 2px rgba(0,0,0,.3); }
.cb-floating-balloon .balloon-plaque { position: relative; width: 240px; height: 150px; min-height: 150px; padding: 10px; border: 6px solid #FFD644; border-radius: 38px; background: radial-gradient(circle at 35% 25%, #FF7EB3 0%, #FF2E63 55%, #A80032 100%); box-shadow: inset 0 5px 0 rgba(255,255,255,.75), inset 0 -6px 0 rgba(110,0,32,.5), 0 12px 0 rgba(13,35,71,.22), 0 22px 32px rgba(10,25,60,.24); display: grid; place-items: center; }
.cb-floating-balloon .balloon-gloss-shine { position: absolute; top: 12px; left: 24px; width: 50px; height: 20px; border-radius: 50%; background: linear-gradient(180deg, rgba(255,255,255,.85) 0%, rgba(255,255,255,.2) 100%); transform: rotate(-15deg); pointer-events: none; }
.cb-floating-balloon .balloon-inner-panel { position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; min-height: 110px; border-radius: 24px; border: 3.5px solid rgba(255,255,255,.45); background: radial-gradient(circle at 50% 30%, rgba(255,255,255,.2) 0%, rgba(140,0,45,.45) 100%); box-shadow: inset 0 4px 8px rgba(0,0,0,.3), inset 0 -2px 0 rgba(255,255,255,.3); }
.cb-floating-balloon .question-number-val.balloon-num { font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: 76px; font-weight: 900; line-height: 1; color: #FFFDF5; text-shadow: 0 4px 0 #6B0021, 0 8px 16px rgba(0,0,0,.45); letter-spacing: -1px; }
.cb-floating-balloon .balloon-sparkle { position: absolute; pointer-events: none; }
.cb-floating-balloon .sparkle-tl { top: -10px; left: -10px; color: #FFE66D; font-size: 26px; text-shadow: 0 0 12px rgba(255,230,109,.9); transform: rotate(-12deg); }
.cb-floating-balloon .sparkle-br { bottom: -10px; right: -10px; color: #4ECDC4; font-size: 28px; text-shadow: 0 3px 0 #1A535C; transform: rotate(15deg); }
.cb-floating-balloon .balloon-bottom-tie { position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; pointer-events: none; }
.cb-floating-balloon .balloon-tail-knot { width: 18px; height: 10px; border-radius: 5px; background: #FFD644; border: 2px solid #A80032; box-shadow: 0 2px 4px rgba(0,0,0,.3); }
.cb-floating-balloon .balloon-curled-ribbon { width: 3px; height: 16px; border-radius: 2px; background: #FFD166; transform: rotate(15deg); }
@keyframes balloon-bounce-enter { 0% { transform: translate3d(0, -70px, 0) scale(0.9); opacity: 0; } 65% { transform: translate3d(0, 8px, 0) scale(1.05, 0.95); opacity: 1; } 82% { transform: translate3d(0, -4px, 0) scale(0.98, 1.02); } 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 1; } }
@keyframes balloon-bob-float { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(0, -6px, 0); } }
`;
  },
};
