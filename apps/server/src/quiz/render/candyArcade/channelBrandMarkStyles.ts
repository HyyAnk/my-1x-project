/**
 * CSS styling for Channel Brand Mark.
 *
 * Layer Contract:
 * - --candy-layer-brand: 9
 * - --candy-layer-transition: 10
 * - --candy-layer-mascot: 11
 */

export function channelBrandMarkCss(): string {
  return `
:root {
  --candy-layer-brand: 9;
}

.channel-brand-mark {
  position: absolute;
  z-index: var(--candy-layer-brand, 9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
  user-select: none;
  color: #ffffff;
  width: 320px;
  max-width: 320px;
  left: calc(var(--question-card-left-edge, 360px) / 2);
  top: 390px;
  transform: translateX(-50%);
  overflow: hidden;
  box-sizing: border-box;
  contain: layout style;
}

.channel-brand-mark .brand-mark-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.22;
  margin-bottom: 10px;
  line-height: 1;
}

.channel-brand-mark .brand-mark-icon svg {
  width: 136px;
  height: 94px;
  fill: #ffffff;
  display: block;
}

.channel-brand-mark .brand-mark-channel-name {
  font-family: "Fredoka", "Nunito", "Trebuchet MS", sans-serif;
  font-size: 84px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #ffffff;
  opacity: 0.28;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  padding: 0 12px;
  box-sizing: border-box;
}

.channel-brand-mark .brand-mark-sub {
  font-family: "Fredoka", "Nunito", "Trebuchet MS", sans-serif;
  font-size: 40px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 8px;
  text-transform: uppercase;
  color: #ffffff;
  opacity: 0.20;
  margin-top: 6px;
}

/* 9:16 Portrait Canvas */
#stage[data-aspect-ratio="9:16"] .channel-brand-mark {
  left: auto;
  right: 36px;
  top: 42px;
  bottom: auto;
  transform: none;
  width: auto;
  max-width: 660px;
  flex-direction: row;
  align-items: baseline;
  justify-content: flex-end;
  gap: 8px;
  text-align: right;
}

#stage[data-aspect-ratio="9:16"] .channel-brand-mark .brand-mark-icon {
  display: none !important;
}

#stage[data-aspect-ratio="9:16"] .channel-brand-mark .brand-mark-channel-name {
  font-size: 42px;
  padding: 0;
  margin: 0;
  opacity: 0.28;
}

#stage[data-aspect-ratio="9:16"] .channel-brand-mark .brand-mark-sub {
  font-size: 26px;
  letter-spacing: 3px;
  margin-top: 0;
  opacity: 0.22;
  flex-shrink: 0;
}
`;
}
