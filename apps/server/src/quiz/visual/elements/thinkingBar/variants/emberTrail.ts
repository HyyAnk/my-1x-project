import { calculateThinkingBarTiming, type ThinkingBarRenderInput, type ThinkingBarVariant } from "../types.js";

const EMBER_PARTICLES_HTML = `<span class="ember-particles" data-layout-ignore><i></i><i></i><i></i></span>`;

const COUNTDOWN_HTML = `<b class="marker-val val-query" data-layout-allow-overlap>?</b><b class="marker-val val-5" data-layout-allow-overlap>5</b><b class="marker-val val-4" data-layout-allow-overlap>4</b><b class="marker-val val-3" data-layout-allow-overlap>3</b><b class="marker-val val-2" data-layout-allow-overlap>2</b><b class="marker-val val-1" data-layout-allow-overlap>1</b>`;

export const emberTrailVariant: ThinkingBarVariant = {
  id: "flame_fuse",
  displayName: "Ember Trail",
  description: "A glowing ember burns across a braided fuse, leaving a charred trail with a clear 5–1 countdown.",
  renderHtml(input: ThinkingBarRenderInput): string {
    const timing = calculateThinkingBarTiming(input);
    return `<div class="thinking-bar thinking-bar-flame-fuse" ${timing.styleAttr}><div class="ember-trail-track" role="img" aria-label="Quiz countdown from 5 to 1" data-layout-allow-overflow><div class="ember-trail-bed" aria-hidden="true"><div class="ember-trail-char"></div><div class="ember-trail-rope"></div></div><span class="ember-trail-marker" aria-hidden="true" data-layout-allow-occlusion data-layout-allow-overlap><span class="ember-glow"></span><span class="ember-core"><i class="ember-hotspot"></i></span>${EMBER_PARTICLES_HTML}${COUNTDOWN_HTML}</span></div></div>`;
  },
  renderCss(): string {
    return `
.thinking-bar-flame-fuse .ember-trail-track {
  --ember-edge-gap: clamp(44px, 3.6vw, 54px);
  position: relative;
  z-index: 0;
  width: 100%;
  height: 72px;
  margin-inline: var(--ember-edge-gap);
}
.thinking-bar-flame-fuse .ember-trail-bed {
  position: absolute;
  inset: 50% 0 auto;
  height: 24px;
  overflow: hidden;
  border: 3px solid #3b2118;
  border-radius: 999px;
  background: #17110f;
  box-shadow: inset 0 3px 7px rgba(0, 0, 0, 0.72), 0 7px 16px rgba(24, 10, 5, 0.28);
  transform: translateY(-50%);
}
.thinking-bar-flame-fuse .ember-trail-char {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 18% 38%, rgba(255, 113, 46, 0.3) 0 1px, transparent 2px),
    radial-gradient(circle at 72% 64%, rgba(224, 194, 164, 0.18) 0 1px, transparent 2px),
    repeating-linear-gradient(105deg, #281c18 0 8px, #110e0d 8px 15px, #34231d 15px 19px);
  background-size: 34px 18px, 42px 20px, auto;
}
.thinking-bar-flame-fuse .ember-trail-rope {
  position: absolute;
  inset: 0 auto 0 0;
  width: 100%;
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 238, 204, 0.48), transparent 42%, rgba(70, 28, 12, 0.3)),
    repeating-linear-gradient(112deg, #e0aa72 0 8px, #b86f3e 8px 15px, #854426 15px 19px);
  box-shadow: inset 0 2px 3px rgba(255, 255, 255, 0.3), inset 0 -3px 4px rgba(73, 28, 10, 0.38);
  animation: quiz-timer-drain var(--timer-duration) linear var(--timer-start) both;
}
.thinking-bar-flame-fuse .ember-trail-rope::after {
  position: absolute;
  top: -3px;
  right: -5px;
  bottom: -3px;
  width: 13px;
  border-radius: 999px;
  background: linear-gradient(90deg, #7e260f, #ff6a1a 48%, #ffe8a3);
  box-shadow: 0 0 10px #ff6a1a, 0 0 20px rgba(255, 70, 12, 0.62);
  content: "";
}
.thinking-bar-flame-fuse .ember-trail-marker {
  position: absolute;
  top: 50%;
  left: 100%;
  display: grid;
  width: clamp(88px, 7.2vw, 108px);
  height: clamp(88px, 7.2vw, 108px);
  place-items: center;
  transform: translate(-50%, -50%);
  animation: quiz-timer-marker-slide var(--timer-duration) linear var(--timer-start) both;
  will-change: left;
  z-index: 5;
}
.thinking-bar-flame-fuse .ember-glow {
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 190, 74, 0.5), rgba(255, 73, 16, 0.18) 48%, transparent 72%);
  filter: blur(4px);
  animation: emberTrailGlowPulse 1.2s ease-in-out infinite alternate;
}
.thinking-bar-flame-fuse .ember-core {
  position: absolute;
  inset: 21%;
  overflow: hidden;
  border: 4px solid #5e2716;
  border-radius: 50%;
  background: radial-gradient(circle at 42% 38%, #fff7cc 0 8%, #ffbe3f 20%, #f04a18 48%, #6f1f16 72%, #241514 100%);
  box-shadow: 0 0 10px #ffb136, 0 0 24px rgba(255, 70, 18, 0.72), inset -5px -7px 9px rgba(48, 13, 10, 0.48);
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
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffe37d;
  box-shadow: 0 0 7px #ff641d;
  animation: emberTrailParticleRise 1.15s ease-out infinite;
}
.thinking-bar-flame-fuse .ember-particles i:nth-child(1) { --ember-drift: -15px; animation-delay: 0s; }
.thinking-bar-flame-fuse .ember-particles i:nth-child(2) { --ember-drift: 11px; left: 58%; animation-delay: 0.38s; }
.thinking-bar-flame-fuse .ember-particles i:nth-child(3) { --ember-drift: -5px; left: 43%; animation-delay: 0.76s; }
.thinking-bar-flame-fuse .marker-val {
  font-size: clamp(46px, 4vw, 56px);
  text-shadow: 0 2px 3px rgba(38, 9, 5, 0.92), 0 0 10px #ff8a2b;
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
`;
  },
};
