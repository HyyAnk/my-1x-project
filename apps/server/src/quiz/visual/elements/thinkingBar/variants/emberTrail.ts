import { calculateThinkingBarTiming, type ThinkingBarRenderInput, type ThinkingBarVariant } from "../types.js";

const EMBER_PARTICLES_HTML = `<span class="ember-particles" data-layout-ignore><i></i><i></i><i></i><i></i></span>`;
const HEATLINE_HTML = `<span class="ember-trail-heatline" data-layout-ignore aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>`;

const COUNTDOWN_HTML = `<b class="marker-val val-query" data-layout-allow-overlap>?</b><b class="marker-val val-5" data-layout-allow-overlap>5</b><b class="marker-val val-4" data-layout-allow-overlap>4</b><b class="marker-val val-3" data-layout-allow-overlap>3</b><b class="marker-val val-2" data-layout-allow-overlap>2</b><b class="marker-val val-1" data-layout-allow-overlap>1</b>`;

export const emberTrailVariant: ThinkingBarVariant = {
  id: "flame_fuse",
  displayName: "Ember Trail",
  description: "A glowing ember burns across a braided fuse, leaving a charred trail with a clear 5–1 countdown.",
  renderHtml(input: ThinkingBarRenderInput): string {
    const timing = calculateThinkingBarTiming(input);
    return `<div class="thinking-bar thinking-bar-flame-fuse" ${timing.styleAttr}><div class="ember-trail-track" role="img" aria-label="Quiz countdown from 5 to 1" data-layout-allow-overflow><div class="ember-trail-bed" aria-hidden="true"><div class="ember-trail-char"></div><div class="ember-trail-rope"></div>${HEATLINE_HTML}</div><span class="ember-trail-marker" aria-hidden="true" data-layout-allow-occlusion data-layout-allow-overlap><span class="ember-glow"></span><span class="ember-core"><i class="ember-hotspot"></i></span>${EMBER_PARTICLES_HTML}${COUNTDOWN_HTML}</span></div></div>`;
  },
  renderCss(): string {
    return `
.thinking-bar-flame-fuse .ember-trail-track {
  --ember-edge-gap: clamp(52px, 4.4vw, 72px);
  position: relative;
  z-index: 0;
  box-sizing: border-box;
  width: calc(100% - (var(--ember-edge-gap) * 2));
  height: 82px;
  margin-inline: var(--ember-edge-gap);
}
.thinking-bar-flame-fuse .ember-trail-track::before {
  position: absolute;
  inset: 50% 0 auto;
  height: 46px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 195, 105, 0.2), transparent 42%, rgba(32, 8, 4, 0.4));
  box-shadow: 0 0 26px rgba(255, 85, 24, 0.28);
  content: "";
  transform: translateY(-50%);
  pointer-events: none;
}
.thinking-bar-flame-fuse .ember-trail-bed {
  position: absolute;
  inset: 50% 0 auto;
  height: 34px;
  overflow: hidden;
  border: 4px solid #321713;
  border-radius: 999px;
  background: linear-gradient(180deg, #24110f 0%, #0f0909 100%);
  box-shadow: inset 0 4px 10px rgba(0, 0, 0, 0.78), 0 8px 20px rgba(24, 10, 5, 0.4), 0 0 18px rgba(255, 76, 20, 0.18);
  transform: translateY(-50%);
}
.thinking-bar-flame-fuse .ember-trail-char {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 18% 35%, rgba(255, 115, 45, 0.45) 0 1px, transparent 2px),
    radial-gradient(circle at 72% 64%, rgba(224, 194, 164, 0.24) 0 1px, transparent 2px),
    repeating-linear-gradient(105deg, #3a211a 0 8px, #120d0c 8px 15px, #4b281d 15px 19px);
  background-size: 34px 18px, 42px 20px, auto;
  opacity: 0.92;
}
.thinking-bar-flame-fuse .ember-trail-rope {
  position: absolute;
  inset: 3px auto 3px 0;
  width: 100%;
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 238, 204, 0.58), transparent 40%, rgba(70, 28, 12, 0.38)),
    repeating-linear-gradient(112deg, #efb978 0 8px, #bd713e 8px 15px, #873f26 15px 19px);
  box-shadow: inset 0 3px 4px rgba(255, 255, 255, 0.36), inset 0 -4px 5px rgba(73, 28, 10, 0.46), 0 0 12px rgba(255, 106, 26, 0.22);
  animation: quiz-timer-drain var(--timer-duration) linear var(--timer-start) both;
}
.thinking-bar-flame-fuse .ember-trail-rope::after {
  position: absolute;
  top: -3px;
  right: -5px;
  bottom: -3px;
  width: 18px;
  border-radius: 999px;
  background: linear-gradient(90deg, #7e260f, #ff6a1a 42%, #fff1b3);
  box-shadow: 0 0 12px #ff6a1a, 0 0 26px rgba(255, 70, 12, 0.72);
  content: "";
}
.thinking-bar-flame-fuse .ember-trail-heatline {
  position: absolute;
  inset: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
  z-index: 3;
}
.thinking-bar-flame-fuse .ember-trail-heatline i {
  width: 3px;
  height: 13px;
  border-radius: 999px;
  background: rgba(255, 225, 164, 0.48);
  box-shadow: 0 0 8px rgba(255, 102, 30, 0.7);
}
.thinking-bar-flame-fuse .ember-trail-marker {
  position: absolute;
  top: 50%;
  left: 100%;
  display: grid;
  width: clamp(164px, 12vw, 190px);
  height: clamp(164px, 12vw, 190px);
  place-items: center;
  transform: translate(-50%, -50%);
  animation: quiz-timer-marker-slide var(--timer-duration) linear var(--timer-start) both;
  will-change: left;
  z-index: 5;
}
.thinking-bar-flame-fuse .ember-glow {
  position: absolute;
  inset: 3%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 215, 116, 0.62), rgba(255, 73, 16, 0.24) 46%, transparent 72%);
  filter: blur(6px);
  animation: emberTrailGlowPulse 1.2s ease-in-out infinite alternate;
}
.thinking-bar-flame-fuse .ember-core {
  position: absolute;
  inset: 18%;
  overflow: hidden;
  border: 6px solid #5e2716;
  border-radius: 50%;
  background: radial-gradient(circle at 42% 38%, #fff7cc 0 8%, #ffbe3f 20%, #f04a18 48%, #6f1f16 72%, #241514 100%);
  box-shadow: 0 0 14px #ffb136, 0 0 32px rgba(255, 70, 18, 0.78), inset -7px -9px 12px rgba(48, 13, 10, 0.52), inset 4px 4px 7px rgba(255, 244, 203, 0.28);
  animation: emberTrailCorePulse 1.05s ease-in-out infinite alternate;
}
.thinking-bar-flame-fuse .ember-hotspot {
  position: absolute;
  top: 20%;
  left: 22%;
  width: 24%;
  height: 16%;
  border-radius: 50%;
  background: rgba(255, 255, 224, 0.78);
  filter: blur(1px);
  transform: rotate(-28deg);
}
.thinking-bar-flame-fuse .ember-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.thinking-bar-flame-fuse .ember-particles i {
  --ember-drift: 0px;
  position: absolute;
  top: 30%;
  left: 50%;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ffe37d;
  box-shadow: 0 0 7px #ff641d;
  animation: emberTrailParticleRise 1.15s ease-out infinite;
}
.thinking-bar-flame-fuse .ember-particles i:nth-child(1) { --ember-drift: -15px; animation-delay: 0s; }
.thinking-bar-flame-fuse .ember-particles i:nth-child(2) { --ember-drift: 11px; left: 58%; animation-delay: 0.38s; }
.thinking-bar-flame-fuse .ember-particles i:nth-child(3) { --ember-drift: -5px; left: 43%; animation-delay: 0.76s; }
.thinking-bar-flame-fuse .ember-particles i:nth-child(4) { --ember-drift: 18px; left: 64%; animation-delay: 0.92s; }
.thinking-bar-flame-fuse .marker-val {
  font-size: clamp(64px, 5vw, 78px);
  text-shadow: 0 3px 4px rgba(38, 9, 5, 0.92), 0 0 14px #ff8a2b;
}
.thinking-bar-flame-fuse .val-1 { color: #fff4d6; text-shadow: 0 2px 3px #3b0805, 0 0 14px #ff321f; }
@keyframes emberTrailGlowPulse {
  from { opacity: 0.62; transform: scale(0.94); }
  to { opacity: 0.9; transform: scale(1.06); }
}
@keyframes emberTrailCorePulse {
  from { filter: saturate(0.92); transform: scale(0.97); }
  to { filter: saturate(1.12); transform: scale(1.03); }
}
@keyframes emberTrailParticleRise {
  from { opacity: 0.88; transform: translate(0, 0) scale(1); }
  to { opacity: 0; transform: translate(var(--ember-drift), -28px) scale(0.25); }
}
@media (prefers-reduced-motion: reduce) {
  .thinking-bar-flame-fuse { animation-duration: var(--timer-duration), .001ms !important; }
  .thinking-bar-flame-fuse .ember-trail-rope,
  .thinking-bar-flame-fuse .ember-trail-marker { animation-duration: var(--timer-duration) !important; }
  .thinking-bar-flame-fuse .marker-val { animation-duration: 1s !important; }
  .thinking-bar-flame-fuse .ember-particles { display: none; }
  .thinking-bar-flame-fuse .ember-glow,
  .thinking-bar-flame-fuse .ember-core { animation: none; }
}
@media (max-width: 640px) {
  .thinking-bar-flame-fuse .ember-trail-track { --ember-edge-gap: 34px; height: 72px; }
  .thinking-bar-flame-fuse .ember-trail-marker { width: 138px; height: 138px; }
  .thinking-bar-flame-fuse .marker-val { font-size: 56px; }
}
`;
  },
};
