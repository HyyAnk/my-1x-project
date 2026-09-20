export function emberTrailBaseCss(): string {
  return `
/* === Thinking Bar: Ember Trail === */
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
  inset: 50% -8px auto;
  height: 44px;
  border-radius: 999px;
  background: radial-gradient(ellipse at center, rgba(255, 118, 35, 0.2), rgba(123, 31, 14, 0.08) 58%, transparent 76%);
  box-shadow: 0 0 20px rgba(255, 85, 24, 0.22);
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
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 35%, rgba(255, 115, 45, 0.48) 0 1px, transparent 2px),
    radial-gradient(circle at 72% 64%, rgba(224, 194, 164, 0.24) 0 1px, transparent 2px),
    repeating-linear-gradient(105deg, #3a211a 0 8px, #120d0c 8px 15px, #4b281d 15px 19px);
  background-size: 34px 18px, 42px 20px, auto;
  opacity: 0.96;
}

.thinking-bar-flame-fuse .ember-trail-char::after {
  position: absolute;
  inset: 2px 0;
  background: radial-gradient(circle at 12px 50%, rgba(255, 151, 64, 0.66) 0 1px, transparent 2px);
  background-size: 84px 100%;
  content: "";
  mix-blend-mode: screen;
  opacity: 0.5;
}

.thinking-bar-flame-fuse .ember-trail-rope {
  position: absolute;
  inset: 3px auto 3px 0;
  width: 100%;
  overflow: visible;
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 238, 204, 0.66), transparent 40%, rgba(70, 28, 12, 0.42)),
    repeating-linear-gradient(112deg, #efb978 0 8px, #bd713e 8px 15px, #873f26 15px 19px);
  box-shadow: inset 0 3px 4px rgba(255, 255, 255, 0.36), inset 0 -4px 5px rgba(73, 28, 10, 0.46), 0 0 12px rgba(255, 106, 26, 0.22);
  transform-origin: left center;
}

.thinking-bar-flame-fuse .ember-trail-rope::before {
  position: absolute;
  inset: 2px 8px;
  border-radius: inherit;
  background: repeating-linear-gradient(112deg, transparent 0 14px, rgba(255, 244, 205, 0.58) 17px 20px, transparent 23px 42px);
  background-size: 84px 100%;
  content: "";
  opacity: 0.48;
}

.thinking-bar-flame-fuse .ember-trail-rope::after {
  position: absolute;
  top: -3px;
  right: -7px;
  bottom: -3px;
  width: 20px;
  border-radius: 50%;
  background: radial-gradient(ellipse, #fffbd8 0 12%, #ffd15b 25%, #ff641d 48%, rgba(147, 28, 10, 0.72) 66%, transparent 78%);
  box-shadow: 0 0 8px #ffd25f, 0 0 18px rgba(255, 90, 24, 0.86);
  content: "";
}

.thinking-bar-flame-fuse .ember-trail-heatline {
  position: absolute;
  inset: 0 20px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
}

.thinking-bar-flame-fuse .ember-trail-heatline i {
  width: 3px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 225, 164, 0.26);
  box-shadow: 0 0 4px rgba(255, 102, 30, 0.32);
}

.thinking-bar-flame-fuse .ember-trail-marker {
  position: absolute;
  top: 50%;
  left: 100%;
  z-index: 5;
  display: grid;
  width: clamp(164px, 12vw, 190px);
  height: clamp(164px, 12vw, 190px);
  place-items: center;
  transform: translate(-50%, -50%);
  will-change: left;
}

.thinking-bar-flame-fuse .ember-trail-aura {
  position: absolute;
  inset: 8%;
  z-index: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 225, 123, 0.58), rgba(255, 78, 18, 0.2) 48%, transparent 72%);
  filter: blur(5px);
  opacity: 0.78;
}

.thinking-bar-flame-fuse .ember-core {
  position: absolute;
  inset: 22%;
  z-index: 3;
  overflow: hidden;
  border: 5px solid #5e2716;
  border-radius: 52% 48% 49% 51%;
  background: radial-gradient(circle at 42% 38%, #fffce0 0 8%, #ffd15b 18%, #f45a1d 46%, #821f14 72%, #241514 100%);
  box-shadow: 0 0 12px rgba(255, 177, 54, 0.9), 0 0 24px rgba(255, 70, 18, 0.5), inset -7px -9px 12px rgba(48, 13, 10, 0.52), inset 4px 4px 7px rgba(255, 244, 203, 0.28);
}

.thinking-bar-flame-fuse .ember-hotspot {
  position: absolute;
  top: 18%;
  left: 20%;
  width: 28%;
  height: 18%;
  border-radius: 50%;
  background: rgba(255, 255, 224, 0.86);
  filter: blur(1px);
  opacity: 0.72;
  transform: rotate(-28deg);
}

.thinking-bar-flame-fuse .marker-val {
  font-variant-numeric: lining-nums tabular-nums;
  font-feature-settings: "lnum" 1, "tnum" 1;
  font-size: clamp(64px, 5vw, 78px);
  text-shadow: 0 3px 4px rgba(38, 9, 5, 0.92), 0 0 10px rgba(255, 138, 43, 0.86);
}

.thinking-bar-flame-fuse .val-1 {
  color: #fff4d6;
  text-shadow: 0 2px 3px #3b0805, 0 0 13px rgba(255, 50, 31, 0.9);
}
`;
}
