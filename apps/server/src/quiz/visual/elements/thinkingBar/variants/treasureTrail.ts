import { calculateThinkingBarTiming, type ThinkingBarRenderInput, type ThinkingBarVariant } from "../types.js";
import { treasureTrailMotionCss } from "./treasureTrailMotion.js";
import { DESTINATION_TREASURE_SVG } from "./treasureTrailDestination.js";

const WAYPOINT_ANCHOR_SVG = `<svg viewBox="0 0 24 24" class="trail-waypoint-svg" aria-hidden="true"><circle cx="12" cy="5" r="2.5" fill="none" stroke="#FDE047" stroke-width="2" /><line x1="12" y1="7.5" x2="12" y2="20" stroke="#FDE047" stroke-width="2" stroke-linecap="round" /><line x1="7" y1="10" x2="17" y2="10" stroke="#FDE047" stroke-width="2" stroke-linecap="round" /><path d="M5 15 C5 19.5 19 19.5 19 15" fill="none" stroke="#FDE047" stroke-width="2" stroke-linecap="round" /></svg>`;

const WAYPOINT_ISLAND_SVG = `<svg viewBox="0 0 24 24" class="trail-waypoint-svg" aria-hidden="true"><path d="M2 19 Q12 14 22 19 Z" fill="#FBBF24" stroke="#92400E" stroke-width="1" /><path d="M12 16 Q13 10 11 6" stroke="#78350F" stroke-width="2" fill="none" /><path d="M11 6 Q6 5 4 8 M11 6 Q12 2 15 4 M11 6 Q16 6 18 9" stroke="#22C55E" stroke-width="2" stroke-linecap="round" fill="none" /></svg>`;

const WAYPOINT_SKULL_SVG = `<svg viewBox="0 0 24 24" class="trail-waypoint-svg" aria-hidden="true"><path d="M6 10 C6 5 18 5 18 10 C18 13 16 15 15 15 L15 18 L9 18 L9 15 C8 15 6 13 6 10 Z" fill="#FEF3C7" stroke="#78350F" stroke-width="1.8" /><circle cx="9.5" cy="10" r="1.5" fill="#451A03" /><circle cx="14.5" cy="10" r="1.5" fill="#451A03" /><line x1="11" y1="15.5" x2="11" y2="18" stroke="#78350F" stroke-width="1.5" /><line x1="13" y1="15.5" x2="13" y2="18" stroke="#78350F" stroke-width="1.5" /></svg>`;

const WAYPOINT_WINDROSE_SVG = `<svg viewBox="0 0 24 24" class="trail-waypoint-svg" aria-hidden="true"><polygon points="12,2 14,9 21,12 14,15 12,22 10,15 3,12 10,9" fill="#FDE047" stroke="#B45309" stroke-width="1.2" /><circle cx="12" cy="12" r="2.5" fill="#B45309" stroke="#FDE047" stroke-width="1" /></svg>`;

const EXPEDITION_HELM_SVG = `<svg class="expedition-helm-svg" viewBox="0 0 180 180" aria-hidden="true" data-layout-ignore><defs><radialGradient id="helmWoodGrad" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#8C4A1D" /><stop offset="60%" stop-color="#54280E" /><stop offset="100%" stop-color="#2D1204" /></radialGradient><linearGradient id="helmGoldRimGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFDF0" /><stop offset="25%" stop-color="#FDE047" /><stop offset="65%" stop-color="#D97706" /><stop offset="100%" stop-color="#78350F" /></linearGradient><radialGradient id="helmDarkLensGrad" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#091E3B" /><stop offset="65%" stop-color="#051022" /><stop offset="100%" stop-color="#02060E" /></radialGradient><radialGradient id="helmRivetGrad" cx="35%" cy="35%" r="60%"><stop offset="0%" stop-color="#FFFBEB" /><stop offset="50%" stop-color="#FDE047" /><stop offset="100%" stop-color="#92400E" /></radialGradient><g id="helmHandle"><rect x="87" y="10" width="6" height="24" rx="3" fill="url(#helmWoodGrad)" stroke="#1F0A02" stroke-width="1.2" /><circle cx="90" cy="11" r="5" fill="url(#helmGoldRimGrad)" stroke="#1F0A02" stroke-width="1.2" /><rect x="86" y="27" width="8" height="4" rx="1.5" fill="url(#helmGoldRimGrad)" stroke="#78350F" stroke-width="0.8" /></g><g id="helmRivet"><circle cx="90" cy="28" r="2.8" fill="url(#helmRivetGrad)" stroke="#451A03" stroke-width="0.8" /></g></defs><g class="helm-spokes"><use href="#helmHandle" transform="rotate(0 90 90)" /><use href="#helmHandle" transform="rotate(45 90 90)" /><use href="#helmHandle" transform="rotate(90 90 90)" /><use href="#helmHandle" transform="rotate(135 90 90)" /><use href="#helmHandle" transform="rotate(180 90 90)" /><use href="#helmHandle" transform="rotate(225 90 90)" /><use href="#helmHandle" transform="rotate(270 90 90)" /><use href="#helmHandle" transform="rotate(315 90 90)" /></g><circle cx="90" cy="90" r="62" fill="none" stroke="url(#helmWoodGrad)" stroke-width="11" /><circle cx="90" cy="90" r="67.5" fill="none" stroke="url(#helmGoldRimGrad)" stroke-width="2.5" /><circle cx="90" cy="90" r="56.5" fill="none" stroke="url(#helmGoldRimGrad)" stroke-width="2.5" /><g class="helm-rivets"><use href="#helmRivet" transform="rotate(0 90 90)" /><use href="#helmRivet" transform="rotate(45 90 90)" /><use href="#helmRivet" transform="rotate(90 90 90)" /><use href="#helmRivet" transform="rotate(135 90 90)" /><use href="#helmRivet" transform="rotate(180 90 90)" /><use href="#helmRivet" transform="rotate(225 90 90)" /><use href="#helmRivet" transform="rotate(270 90 90)" /><use href="#helmRivet" transform="rotate(315 90 90)" /></g><circle cx="90" cy="90" r="54" fill="#0B132B" stroke="url(#helmGoldRimGrad)" stroke-width="3" /><circle cx="90" cy="90" r="51" fill="none" stroke="#FDE047" stroke-width="1.2" stroke-dasharray="3 9" opacity="0.85" /><polygon points="90,39 93,47 87,47" fill="#FDE047" stroke="#78350F" stroke-width="0.8" /><polygon points="90,141 93,133 87,133" fill="#FDE047" stroke="#78350F" stroke-width="0.8" /><polygon points="141,90 133,93 133,87" fill="#FDE047" stroke="#78350F" stroke-width="0.8" /><polygon points="39,90 47,93 47,87" fill="#FDE047" stroke="#78350F" stroke-width="0.8" /><circle cx="90" cy="90" r="44" fill="url(#helmDarkLensGrad)" stroke="#F59E0B" stroke-width="2.5" filter="drop-shadow(0 0 10px rgba(245,158,11,0.45))" /><circle cx="90" cy="90" r="40" fill="none" stroke="#FDE047" stroke-width="1" stroke-dasharray="2 6" opacity="0.4" /></svg>`;

export const treasureTrailVariant: ThinkingBarVariant = {
  id: "treasure_trail",
  displayName: "Expedition Map Trail",
  description:
    "Dotted adventurer expedition route across an antique parchment track with milestone waypoint islands and a sliding navigator helm compass.",
  renderHtml(input: ThinkingBarRenderInput): string {
    const timing = calculateThinkingBarTiming(input);
    return `<div class="thinking-bar thinking-bar-treasure-trail" ${timing.styleAttr}><div class="trail-track" role="img" aria-label="Quiz countdown from 5 to 1" data-layout-allow-overflow><div class="trail-destination" data-layout-ignore aria-hidden="true">${DESTINATION_TREASURE_SVG}</div><div class="trail-channel"><div class="trail-dotted-line" data-layout-ignore aria-hidden="true"></div><div class="trail-milestones" data-layout-ignore aria-hidden="true"><span class="trail-waypoint point-1">${WAYPOINT_ANCHOR_SVG}</span><span class="trail-waypoint point-2">${WAYPOINT_ISLAND_SVG}</span><span class="trail-waypoint point-3">${WAYPOINT_SKULL_SVG}</span><span class="trail-waypoint point-4">${WAYPOINT_WINDROSE_SVG}</span></div><div class="trail-progress-fill"></div></div><span class="trail-ship-marker" data-layout-allow-occlusion data-layout-allow-overlap><span class="trail-wake" data-layout-ignore aria-hidden="true"><i></i><i></i><i></i></span>${EXPEDITION_HELM_SVG}<span class="helm-needle-overlay" data-layout-ignore aria-hidden="true"></span><div class="helm-sparkles" data-layout-ignore aria-hidden="true"><i>✦</i><i>•</i><i>★</i></div><b class="marker-val val-query" data-layout-allow-overlap>?</b><b class="marker-val val-5" data-layout-allow-overlap>5</b><b class="marker-val val-4" data-layout-allow-overlap>4</b><b class="marker-val val-3" data-layout-allow-overlap>3</b><b class="marker-val val-2" data-layout-allow-overlap>2</b><b class="marker-val val-1" data-layout-allow-overlap>1</b></span></div></div>`;
  },
  renderCss(): string {
    return `
/* === Thinking Bar: Expedition Map Trail === */
.thinking-bar-treasure-trail .trail-track {
  position: relative;
  z-index: 0;
  width: 100%;
  height: 64px;
  overflow: visible;
  display: flex;
  align-items: center;
}

.thinking-bar-treasure-trail .trail-destination {
  position: absolute;
  left: -60px;
  top: 50%;
  transform: translateY(-50%);
  width: 172px;
  height: 172px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  filter: drop-shadow(0 0 24px rgba(245, 158, 11, 0.75)) drop-shadow(0 10px 22px rgba(0, 0, 0, 0.6));
  animation: expeditionDestinationSignal var(--timer-duration) ease-in-out var(--timer-start) both;
}

.thinking-bar-treasure-trail .destination-island-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.thinking-bar-treasure-trail .trail-channel {
  position: relative;
  width: 100%;
  height: 38px;
  margin-left: 38px;
  border-radius: 9999px;
  overflow: hidden;
  border: 3.5px solid #8C572A;
  background:
    repeating-linear-gradient(
      90deg,
      rgba(212, 163, 115, 0.12) 0px,
      rgba(212, 163, 115, 0.12) 4px,
      transparent 4px,
      transparent 14px
    ),
    linear-gradient(180deg, #381E0D 0%, #1A0D05 100%);
  box-shadow: inset 0 4px 10px rgba(0, 0, 0, 0.85), 0 0 20px rgba(245, 158, 11, 0.25), 0 10px 24px rgba(0, 0, 0, 0.5);
}

.thinking-bar-treasure-trail .trail-dotted-line {
  position: absolute;
  top: calc(50% - 2px);
  left: 10px;
  right: 10px;
  height: 4px;
  border-radius: 9999px;
  background: repeating-linear-gradient(90deg, rgba(255, 251, 235, 0.18) 0 8px, #FDE047 8px 18px, transparent 18px 31px);
  background-size: 62px 100%;
  box-shadow: 0 0 8px rgba(253, 224, 71, 0.5);
  transform: translateY(-50%);
  animation: expeditionRouteMarch var(--timer-duration) linear var(--timer-start) both;
  pointer-events: none;
  z-index: 1;
}

.thinking-bar-treasure-trail .trail-milestones {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  pointer-events: none;
  z-index: 2;
  padding-inline: 40px;
}

.thinking-bar-treasure-trail .trail-waypoint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.58;
  transform: scale(0.86);
  transform-origin: 50% 50%;
}

.thinking-bar-treasure-trail .trail-waypoint-svg {
  width: 22px;
  height: 22px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
  opacity: 0.85;
}

.thinking-bar-treasure-trail .trail-progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 100%;
  border-radius: 9999px;
  background: linear-gradient(90deg, #991B1B 0%, #C2410C 30%, #D97706 60%, #FDE047 100%);
  background-size: 1540px 100%;
  background-position: left center;
  z-index: 1;
  overflow: hidden;
  animation: quiz-timer-drain var(--timer-duration) linear var(--timer-start) both, expeditionTrailCharge var(--timer-duration) linear var(--timer-start) both;
  box-shadow: 0 0 18px rgba(245, 158, 11, 0.7), inset 0 0 8px rgba(255, 255, 255, 0.6);
  will-change: width, filter;
}

.thinking-bar-treasure-trail .trail-ship-marker {
  position: absolute;
  top: 50%;
  left: 100%;
  display: grid;
  place-items: center;
  width: 176px;
  height: 176px;
  transform: translate(-50%, -50%);
  animation: quiz-timer-marker-slide var(--timer-duration) linear var(--timer-start) both;
  will-change: left;
  z-index: 7;
}

.thinking-bar-treasure-trail .expedition-helm-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
  transform-origin: 50% 50%;
  animation: expeditionHelmTurn var(--timer-duration) linear var(--timer-start) both;
  z-index: 3;
}

.thinking-bar-treasure-trail .helm-sparkles {
  position: absolute;
  inset: -10px;
  pointer-events: none;
  z-index: 6;
}

.thinking-bar-treasure-trail .helm-sparkles i {
  position: absolute;
  font-style: normal;
  color: #FDE047;
  text-shadow: 0 0 8px #F59E0B;
  animation: expeditionHelmSparkle 1.35s ease-in-out var(--timer-start) 12 alternate both;
}

.thinking-bar-treasure-trail .helm-sparkles i:nth-child(1) {
  top: 12px;
  right: 20px;
  font-size: 16px;
}

.thinking-bar-treasure-trail .helm-sparkles i:nth-child(2) {
  bottom: 16px;
  left: 18px;
  font-size: 20px;
  color: #FFFDF0;
  animation-delay: 0.5s;
}

.thinking-bar-treasure-trail .helm-sparkles i:nth-child(3) {
  top: 28px;
  left: 14px;
  font-size: 14px;
  color: #F59E0B;
  animation-delay: 1.1s;
}

.thinking-bar-treasure-trail .marker-val {
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-variant-numeric: lining-nums tabular-nums;
  font-feature-settings: "lnum" 1, "tnum" 1;
  font-size: 60px;
  font-weight: 900;
  line-height: 1;
  text-align: center;
  color: #FFFDF0;
  text-shadow: 0 0 16px #F59E0B, 0 3px 6px rgba(0, 0, 0, 0.95), 0 0 30px rgba(251, 191, 36, 0.8);
}
${treasureTrailMotionCss()}
`;
  },
};
