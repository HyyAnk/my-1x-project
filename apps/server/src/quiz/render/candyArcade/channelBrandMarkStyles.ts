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
  width: 240px;
  max-width: 240px;
  left: calc(var(--question-card-left-edge, 360px) / 2);
  top: 290px;
  transform: translateX(-50%);
  overflow: hidden;
}

.channel-brand-mark .brand-mark-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.22;
  margin-bottom: 4px;
  line-height: 1;
}

.channel-brand-mark .brand-mark-icon svg {
  width: 32px;
  height: 22px;
  fill: #ffffff;
  display: block;
}

.channel-brand-mark .brand-mark-channel-name {
  font-family: "Fredoka", "Nunito", "Trebuchet MS", sans-serif;
  font-size: 22px;
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
  padding: 0 4px;
  box-sizing: border-box;
}

.channel-brand-mark .brand-mark-sub {
  font-family: "Fredoka", "Nunito", "Trebuchet MS", sans-serif;
  font-size: 14px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #ffffff;
  opacity: 0.20;
  margin-top: 2px;
}

/* 9:16 Portrait Canvas */
#stage[data-aspect-ratio="9:16"] .channel-brand-mark {
  left: 36px;
  top: auto;
  bottom: 230px;
  transform: none;
  width: 200px;
  max-width: 200px;
  align-items: flex-start;
  text-align: left;
}

#stage[data-aspect-ratio="9:16"] .channel-brand-mark .brand-mark-icon {
  margin-bottom: 3px;
}

#stage[data-aspect-ratio="9:16"] .channel-brand-mark .brand-mark-channel-name {
  font-size: 18px;
  padding: 0;
}

#stage[data-aspect-ratio="9:16"] .channel-brand-mark .brand-mark-sub {
  font-size: 12px;
  letter-spacing: 2px;
}
`;
}
