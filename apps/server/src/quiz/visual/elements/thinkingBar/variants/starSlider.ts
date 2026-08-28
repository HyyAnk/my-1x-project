import { calculateThinkingBarTiming, type ThinkingBarRenderInput, type ThinkingBarVariant } from "../types.js";

const STAR_SVG = `<svg class="marker-star-svg" viewBox="0 0 100 100" aria-hidden="true" data-layout-ignore><defs><linearGradient id="markerStarGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFE043" /><stop offset="45%" stop-color="#FF961F" /><stop offset="100%" stop-color="#FF3366" /></linearGradient><linearGradient id="markerStarStroke" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF" /><stop offset="60%" stop-color="#FFF4B8" /><stop offset="100%" stop-color="#FFD633" /></linearGradient></defs><path d="M50 11 Q59 20 68 29.5 Q80 33 91 41 Q86 53 79.5 63.5 Q80 77 75.5 88.5 Q63 87 50 85 Q37 87 24.5 88.5 Q20 77 20.5 63.5 Q14 53 9 41 Q20 33 32 29.5 Q41 20 50 11 Z" fill="rgba(13,35,71,0.35)" /><path class="star-outer" d="M50 7 Q59 16 68 25.5 Q80 29 91 37 Q86 49 79.5 59.5 Q80 73 75.5 84.5 Q63 83 50 81 Q37 83 24.5 84.5 Q20 73 20.5 59.5 Q14 49 9 37 Q20 29 32 25.5 Q41 16 50 7 Z" fill="url(#markerStarGrad)" stroke="url(#markerStarStroke)" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" /></svg>`;

export const starSliderVariant: ThinkingBarVariant = {
  id: "star_slider",
  displayName: "Arcade Star Runner",
  description: "Classic bright star sliding over milestone stars with 5-4-3-2-1 countdown marker and sparkles.",
  renderHtml(input: ThinkingBarRenderInput): string {
    const timing = calculateThinkingBarTiming(input);
    return `<div class="thinking-bar thinking-bar-star-slider" ${timing.styleAttr}><div class="thinking-track" aria-label="Quiz timer" data-layout-allow-overflow><div class="timer-milestones" data-layout-ignore aria-hidden="true"><span class="milestone-star star-1">★</span><span class="milestone-star star-2">★</span><span class="milestone-star star-3">★</span><span class="milestone-star star-4">★</span></div><div class="timer-progress"></div><span class="timer-marker" data-layout-allow-occlusion data-layout-allow-overlap>${STAR_SVG}<b class="marker-val val-query" data-layout-allow-overlap>?</b><b class="marker-val val-5" data-layout-allow-overlap>5</b><b class="marker-val val-4" data-layout-allow-overlap>4</b><b class="marker-val val-3" data-layout-allow-overlap>3</b><b class="marker-val val-2" data-layout-allow-overlap>2</b><b class="marker-val val-1" data-layout-allow-overlap>1</b></span><div class="timer-sparkles" data-layout-ignore aria-hidden="true"><i>✦</i><i>•</i><i>✦</i></div></div></div>`;
  },
  renderCss(): string {
    return `
.thinking-bar-star-slider .thinking-track { position: relative; z-index: 0; width: 100%; height: 58px; overflow: visible; border: 6px solid rgba(255,255,255,.98); border-radius: 9999px; background: rgba(18,38,80,.62); box-shadow: inset 0 3px 6px rgba(255,255,255,.35), inset 0 -4px 8px rgba(0,0,0,.22), 0 8px 22px rgba(13,35,71,.35), 0 0 20px rgba(255,255,255,.25); }
.thinking-bar-star-slider .timer-milestones { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
.thinking-bar-star-slider .milestone-star { position: absolute; top: 50%; font-size: 24px; line-height: 1; color: #FFE66D; text-shadow: 0 0 10px rgba(255,230,109,.95), 0 2px 4px rgba(0,0,0,.4); transform: translate(-50%,-50%); animation: quizProgressStarTwinkle 2.4s ease-in-out infinite; }
.thinking-bar-star-slider .milestone-star.star-1 { left: 20%; animation-delay: 0s; }
.thinking-bar-star-slider .milestone-star.star-2 { left: 40%; animation-delay: .6s; }
.thinking-bar-star-slider .milestone-star.star-3 { left: 60%; animation-delay: 1.2s; }
.thinking-bar-star-slider .milestone-star.star-4 { left: 80%; animation-delay: 1.8s; }
.thinking-bar-star-slider .timer-progress { position: absolute; top: 0; left: 0; bottom: 0; width: 100%; border-radius: 9999px; overflow: hidden; background: linear-gradient(90deg, #ff4f5e 0%, #ff7a45 20%, #ffc83d 42%, #6fa9ff 70%, #28d5d0 100%); background-size: 1540px 100%; background-position: left center; z-index: 1; animation: quiz-timer-drain var(--timer-duration) linear var(--clip-start) both; }
.thinking-bar-star-slider .timer-progress::after { position: absolute; top: 0; left: 0; right: 0; height: 50%; border-radius: 9999px 9999px 0 0; background: linear-gradient(to bottom, rgba(255,255,255,.38) 0%, rgba(255,255,255,.1) 40%, rgba(255,255,255,0) 70%); content: ""; pointer-events: none; z-index: 2; }
.thinking-bar-star-slider .timer-marker { position: absolute; top: 50%; left: 100%; display: grid; place-items: center; width: 176px; height: 176px; border: none; background: transparent; transform: translate(-50%,-50%); animation: quiz-timer-marker-slide var(--timer-duration) linear var(--clip-start) both, quizProgressMarkerPulse 2.4s ease-in-out infinite; z-index: 6; }
.thinking-bar-star-slider .marker-star-svg { position: absolute; inset: -8px; width: 192px; height: 192px; overflow: visible; pointer-events: none; z-index: 4; }
.thinking-bar-star-slider .timer-sparkles { position: absolute; inset: 0; pointer-events: none; z-index: 4; }
.thinking-bar-star-slider .timer-sparkles i { position: absolute; font-style: normal; font-size: 18px; color: #FFF; text-shadow: 0 0 8px #FFD43F; animation: sparkle-blink 1.8s ease-in-out infinite; }
.thinking-bar-star-slider .timer-sparkles i:nth-child(1) { top: -14px; left: 28%; animation-delay: .2s; }
.thinking-bar-star-slider .timer-sparkles i:nth-child(2) { bottom: -12px; left: 68%; animation-delay: .9s; }
.thinking-bar-star-slider .timer-sparkles i:nth-child(3) { top: -10px; left: 88%; animation-delay: 1.4s; }
`;
  },
};
