import type { CounterBadgeRenderInput, CounterBadgeVariant } from "../types.js";

export const bubbleBadgeVariant: CounterBadgeVariant = {
  id: "bubble_badge",
  displayName: "Glossy Bubble Badge",
  description: "Translucent glossy soap bubble sphere with bouncing highlight glints and iridescent refraction border.",
  renderHtml(input: CounterBadgeRenderInput): string {
    return `<div class="cb-bubble-badge" data-counter-badge data-layout-allow-occlusion><div class="bubble-suspension" aria-hidden="true"><span class="bubble-tether tether-left"></span><div class="bubble-wand-ring"><span class="wand-core"></span></div><span class="bubble-tether tether-right"></span></div><div class="bubble-plaque" data-counter-badge-body><div class="bubble-highlight-oval" data-layout-ignore aria-hidden="true"></div><div class="bubble-highlight-dot" data-layout-ignore aria-hidden="true"></div><div class="bubble-inner-panel"><span class="question-number-val bubble-num">${input.questionNumber}</span></div><span class="bubble-mini bubble-mini-tl" data-layout-ignore aria-hidden="true"></span><span class="bubble-mini bubble-mini-br" data-layout-ignore aria-hidden="true"></span><span class="bubble-sparkle sparkle-tr" data-layout-ignore aria-hidden="true">✦</span></div></div>`;
  },
  renderCss(): string {
    return `
.cb-bubble-badge { --counter-badge-mount-height: 64px; --counter-badge-body-height: 148px; position: relative; z-index: 6; display: flex; flex-direction: column; align-items: center; width: 240px; transform-origin: 50% 0; animation: bubble-bounce-enter .68s cubic-bezier(.18,1.42,.34,1) var(--clip-start, 0s) both, bubble-wobble-float 3.8s ease-in-out calc(var(--clip-start, 0s) + .68s) infinite alternate both; contain: layout style; will-change: transform; }
.cb-bubble-badge .bubble-suspension { position: relative; display: flex; justify-content: space-between; align-items: flex-start; width: 160px; height: 64px; pointer-events: none; }
.cb-bubble-badge .bubble-tether { width: 8px; height: calc(100% + 8px); margin-top: -8px; border-radius: 4px; background: repeating-linear-gradient(135deg, var(--bg-primary, #ff9ebb) 0px, var(--bg-primary, #ff9ebb) 6px, var(--bg-secondary, #b388ff) 6px, var(--bg-secondary, #b388ff) 12px); box-shadow: 0 2px 6px rgba(180,100,160,0.25); }
.cb-bubble-badge .bubble-wand-ring { position: absolute; top: 0; left: 50%; transform: translateX(-50%); display: grid; place-items: center; width: 28px; height: 16px; border: 2.5px solid #ffffff; border-radius: 9px; background: var(--bg-accent, #70d6ff); box-shadow: 0 2px 6px rgba(0,0,0,0.18), inset 0 1px 2px #ffffff; }
.cb-bubble-badge .wand-core { width: 8px; height: 4px; border-radius: 2px; background: #ffffff; }
.cb-bubble-badge .bubble-plaque { position: relative; width: 236px; height: 148px; min-height: 148px; padding: 10px; border: 5px solid var(--bg-accent, #ff80bf); border-radius: 36px; background: radial-gradient(circle at 35% 25%, rgba(255,255,255,0.75) 0%, var(--bg-primary, rgba(255,182,218,0.65)) 35%, var(--bg-secondary, rgba(186,147,255,0.7)) 70%, var(--bg-accent, rgba(120,224,255,0.75)) 100%); backdrop-filter: blur(4px); box-shadow: inset 0 6px 14px rgba(255,255,255,0.85), inset 0 -6px 14px rgba(140,80,200,0.35), 0 10px 0 rgba(200,120,170,0.3), 0 20px 30px rgba(80,40,110,0.22); display: grid; place-items: center; overflow: visible; }
.cb-bubble-badge .bubble-highlight-oval { position: absolute; top: 12px; left: 22px; width: 52px; height: 22px; border-radius: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.2) 100%); transform: rotate(-16deg); pointer-events: none; z-index: 3; }
.cb-bubble-badge .bubble-highlight-dot { position: absolute; top: 28px; left: 16px; width: 8px; height: 8px; border-radius: 50%; background: #ffffff; box-shadow: 0 0 4px #ffffff; pointer-events: none; z-index: 3; }
.cb-bubble-badge .bubble-inner-panel { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; min-height: 110px; border-radius: 24px; border: 3px solid rgba(255,255,255,0.65); background: radial-gradient(circle at 50% 35%, rgba(255,255,255,0.3) 0%, var(--bg-secondary, rgba(170,110,240,0.35)) 100%); box-shadow: inset 0 3px 8px rgba(255,255,255,0.5), inset 0 -3px 8px rgba(100,30,130,0.25); }
.cb-bubble-badge .question-number-val.bubble-num { font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: 76px; font-weight: 900; line-height: 1; color: #ffffff; text-shadow: 0 4px 0 var(--bg-secondary, #9c4dcc), 0 7px 0 var(--bg-primary, #e0569a), 0 10px 18px rgba(120,40,110,0.35); letter-spacing: -1px; }
.cb-bubble-badge .bubble-mini { position: absolute; border-radius: 50%; border: 2px solid rgba(255,255,255,0.85); background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9) 0%, var(--bg-accent, rgba(120,224,255,0.6)) 100%); box-shadow: inset 0 1px 2px #ffffff, 0 2px 6px rgba(0,0,0,0.15); pointer-events: none; z-index: 4; }
.cb-bubble-badge .bubble-mini-tl { top: -8px; left: -8px; width: 22px; height: 22px; animation: bubble-mini-bob 2.8s ease-in-out infinite alternate; }
.cb-bubble-badge .bubble-mini-br { bottom: -8px; right: -8px; width: 26px; height: 26px; animation: bubble-mini-bob 3.4s ease-in-out 0.6s infinite alternate; }
.cb-bubble-badge .bubble-sparkle { position: absolute; pointer-events: none; z-index: 4; }
.cb-bubble-badge .sparkle-tr { top: -8px; right: 12px; color: #fff5a6; font-size: 24px; text-shadow: 0 0 10px rgba(255,245,166,0.9); transform: rotate(12deg); animation: bubble-sparkle-twinkle 2.2s ease-in-out infinite alternate; }
@keyframes bubble-bounce-enter { 0% { transform: translateY(-70px) scale(0.85); opacity: 0; } 65% { transform: translateY(8px) scale(1.06, 0.94); opacity: 1; } 82% { transform: translateY(-4px) scale(0.97, 1.03); } 100% { transform: translateY(0) scale(1); opacity: 1; } }
@keyframes bubble-wobble-float { 0% { transform: translateY(0) scale(1, 1); } 50% { transform: translateY(-4px) scale(1.02, 0.98); } 100% { transform: translateY(-7px) scale(0.98, 1.02); } }
@keyframes bubble-mini-bob { 0% { transform: translateY(0); } 100% { transform: translateY(-5px); } }
@keyframes bubble-sparkle-twinkle { 0% { opacity: 0.6; transform: scale(0.85) rotate(0deg); } 100% { opacity: 1; transform: scale(1.15) rotate(20deg); } }
`;
  },
};
