import type { CounterBadgeRenderInput, CounterBadgeVariant } from "../types.js";

export const goldenCompassVariant: CounterBadgeVariant = {
  id: "golden_compass",
  displayName: "Ancient Golden Compass",
  description:
    "Ornate brass mariner's astrolabe and nautical compass with rotating needle and cardinal degree markers tracking question progression.",
  renderHtml(input: CounterBadgeRenderInput): string {
    return `<div class="ancient-golden-compass cb-golden-compass" data-counter-badge data-layout-allow-occlusion><div class="compass-mount" aria-hidden="true"><span class="compass-chain chain-l"></span><span class="compass-chain chain-r"></span></div><div class="compass-housing" data-counter-badge-body><div class="compass-bezel" aria-hidden="true"></div><div class="compass-dial"><span class="compass-cardinal card-n" aria-hidden="true">N</span><span class="compass-cardinal card-e" aria-hidden="true">E</span><span class="compass-cardinal card-s" aria-hidden="true">S</span><span class="compass-cardinal card-w" aria-hidden="true">W</span><div class="compass-needle-wrap" aria-hidden="true"><span class="compass-needle needle-north"></span><span class="compass-needle needle-south"></span><span class="compass-pivot"></span></div><div class="compass-val-container"><span class="question-number-val">${input.questionNumber}</span></div></div><div class="compass-glass" aria-hidden="true"></div><span class="compass-flourish flourish-l" data-layout-ignore aria-hidden="true">⚜</span><span class="compass-flourish flourish-r" data-layout-ignore aria-hidden="true">⚜</span></div></div>`;
  },
  renderCss(): string {
    return `
/* === Counter Badge: Ancient Golden Compass === */
.cb-golden-compass {
  --counter-badge-mount-height: 64px;
  --counter-badge-body-height: 150px;
  position: relative;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 240px;
  transform-origin: 50% 0;
  animation: compass-enter 0.65s cubic-bezier(0.18, 1.42, 0.34, 1) var(--clip-start, 0s) both,
             compass-ambient-sway 5s ease-in-out calc(var(--clip-start, 0s) + 0.65s) infinite alternate both;
}

.cb-golden-compass .compass-mount { position: relative; display: flex; justify-content: space-between; width: 64px; height: 64px; pointer-events: none; }

.cb-golden-compass .compass-chain {
  width: 9px;
  height: calc(100% + 8px);
  margin-top: -8px;
  border-radius: 4px;
  background: repeating-linear-gradient(
    180deg,
    #FBBF24 0px,
    #FBBF24 5px,
    #92400E 5px,
    #92400E 10px
  );
  box-shadow: 2px 2px 5px rgba(13, 35, 71, 0.28);
}

.cb-golden-compass .compass-housing {
  position: relative;
  width: 150px;
  height: 150px;
  min-height: 150px;
  border-radius: 50%;
  border: 6px solid #451A03;
  background: linear-gradient(135deg, #FDE68A 0%, #D97706 45%, #78350F 100%);
  box-shadow:
    inset 0 3px 6px rgba(255, 255, 255, 0.6),
    inset 0 -4px 6px rgba(0, 0, 0, 0.7),
    0 12px 24px rgba(0, 0, 0, 0.5),
    0 0 18px rgba(245, 158, 11, 0.3);
  display: grid;
  place-items: center;
}

.cb-golden-compass .compass-bezel {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  border: 2px dashed rgba(69, 26, 3, 0.6);
  pointer-events: none;
}

.cb-golden-compass .compass-dial {
  position: relative;
  width: 122px;
  height: 122px;
  border-radius: 50%;
  border: 3px solid #291205;
  background: radial-gradient(circle at 50% 50%, #2A170B 0%, #150A04 75%, #080301 100%);
  box-shadow: inset 0 4px 10px rgba(0, 0, 0, 0.8), 0 0 8px rgba(245, 158, 11, 0.2);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.cb-golden-compass .compass-cardinal {
  position: absolute;
  font-family: "Georgia", serif;
  font-size: 13px;
  font-weight: 900;
  color: #FBBF24;
  text-shadow: 0 1px 2px #000;
  pointer-events: none;
}
.cb-golden-compass .card-n { top: 4px; left: 50%; transform: translateX(-50%); color: #EF4444; }
.cb-golden-compass .card-s { bottom: 4px; left: 50%; transform: translateX(-50%); }
.cb-golden-compass .card-e { right: 6px; top: 50%; transform: translateY(-50%); }
.cb-golden-compass .card-w { left: 6px; top: 50%; transform: translateY(-50%); }

.cb-golden-compass .compass-needle-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  animation: compass-needle-pivot 6s ease-in-out infinite alternate;
}

.cb-golden-compass .compass-needle {
  position: absolute;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
}
.cb-golden-compass .needle-north {
  top: 14px;
  border-bottom: 40px solid #DC2626;
  filter: drop-shadow(0 0 4px rgba(220, 38, 38, 0.6));
}
.cb-golden-compass .needle-south {
  bottom: 14px;
  border-top: 40px solid #78350F;
}
.cb-golden-compass .compass-pivot {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #FDE047 0%, #D97706 60%, #78350F 100%);
  border: 1.5px solid #291205;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
  z-index: 2;
}

.cb-golden-compass .compass-val-container {
  position: relative;
  z-index: 3;
  display: grid;
  place-items: center;
  background: radial-gradient(circle, rgba(21, 10, 4, 0.85) 0%, rgba(21, 10, 4, 0.4) 65%, transparent 100%);
  width: 74px;
  height: 74px;
  border-radius: 50%;
}

.cb-golden-compass .question-number-val {
  font-family: "Fredoka", "Georgia", "Nunito", sans-serif;
  font-size: 56px;
  font-weight: 900;
  line-height: 1;
  color: #FFFDF0;
  text-shadow: 0 4px 0 #451A03, 0 8px 16px rgba(0, 0, 0, 0.75), 0 0 14px rgba(251, 191, 36, 0.6);
  letter-spacing: -1px;
}

.cb-golden-compass .compass-glass {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.08) 40%, transparent 60%);
  pointer-events: none;
  z-index: 4;
}

.cb-golden-compass .compass-flourish {
  position: absolute;
  font-size: 20px;
  color: #F59E0B;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6), 0 0 8px rgba(245, 158, 11, 0.8);
  pointer-events: none;
  top: 50%;
  transform: translateY(-50%);
}
.cb-golden-compass .flourish-l { left: -14px; }
.cb-golden-compass .flourish-r { right: -14px; }

/* Animations */
@keyframes compass-enter {
  0% { transform: translateY(-40px) rotate(-8deg); opacity: 0; }
  100% { transform: translateY(0) rotate(0deg); opacity: 1; }
}

@keyframes compass-ambient-sway {
  0% { transform: rotate(-2.5deg); }
  100% { transform: rotate(2.5deg); }
}

@keyframes compass-needle-pivot {
  0% { transform: rotate(-18deg); }
  50% { transform: rotate(12deg); }
  100% { transform: rotate(-8deg); }
}
`;
  },
};
