import type { MascotRenderAspectRatio } from "@studio/shared";

export interface CyberNeonStyleOptions {
  primaryColor?: string;
  accentColor?: string;
  aspectRatio?: MascotRenderAspectRatio;
}

/**
 * Returns scoped CSS rules for the Cyber Neon arcade motion intro.
 */
export function cyberNeonStyles(options: CyberNeonStyleOptions = {}): string {
  const cyan = options.primaryColor || "#00FFFF";
  const magenta = options.accentColor || "#FF007F";
  const isVertical = options.aspectRatio === "9:16";

  return `
.motion-cyber-neon {
  --neon-cyan: ${cyan};
  --neon-magenta: ${magenta};
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #05050c;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  color: #ffffff;
  perspective: 700px;
}

.cyber-grid-floor {
  position: absolute;
  bottom: -20%;
  left: -50%;
  width: 200%;
  height: 80%;
  background-image:
    linear-gradient(to right, rgba(0, 255, 255, 0.28) 2px, transparent 2px),
    linear-gradient(to bottom, rgba(255, 0, 127, 0.28) 2px, transparent 2px);
  background-size: ${isVertical ? "40px 40px" : "60px 60px"};
  transform: rotateX(68deg);
  transform-origin: center top;
  animation: cyber-grid-scroll 1.6s linear infinite;
  mask-image: linear-gradient(to top, rgba(0,0,0,1) 30%, transparent 95%);
  -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,1) 30%, transparent 95%);
}

.cyber-horizon-glow {
  position: absolute;
  top: 48%;
  left: 0;
  width: 100%;
  height: 4px;
  background: var(--neon-cyan);
  box-shadow: 0 0 24px 6px var(--neon-cyan), 0 0 48px 12px var(--neon-magenta);
  opacity: 0.8;
}

.cyber-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0, 0, 0, 0.35) 4px);
  opacity: 0.65;
  z-index: 20;
}

.cyber-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0 32px;
  max-width: ${isVertical ? "92%" : "82%"};
}

.cyber-badge {
  font-size: ${isVertical ? "20px" : "26px"};
  font-weight: 800;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #ffffff;
  padding: 6px 18px;
  border: 2px solid var(--neon-cyan);
  background: rgba(0, 255, 255, 0.12);
  box-shadow: 0 0 16px var(--neon-cyan), inset 0 0 10px rgba(0, 255, 255, 0.2);
  border-radius: 4px;
  margin-bottom: 20px;
  opacity: 0;
  animation: cyber-fade-in 0.4s ease-out 0.1s forwards;
}

.cyber-title {
  font-size: ${isVertical ? "48px" : "68px"};
  font-weight: 900;
  line-height: 1.12;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #ffffff;
  text-shadow: 0 0 12px var(--neon-magenta), 0 0 28px var(--neon-magenta), 0 0 60px var(--neon-cyan);
  margin: 0;
  opacity: 0;
  transform: scale(0.85);
  animation: cyber-flicker-slam 0.6s cubic-bezier(0.18, 1.25, 0.25, 1) 0.25s forwards;
}

.cyber-mascot-slot {
  position: absolute;
  bottom: ${isVertical ? "70px" : "50px"};
  right: ${isVertical ? "50%" : "90px"};
  transform: ${isVertical ? "translateX(50%) scale(0.9)" : "none"};
  z-index: 15;
  opacity: 0;
  animation: cyber-fade-in 0.5s ease-out 0.4s forwards;
}

@keyframes cyber-grid-scroll {
  0% { background-position: 0 0; }
  100% { background-position: 0 ${isVertical ? "40px" : "60px"}; }
}

@keyframes cyber-fade-in {
  to { opacity: 1; }
}

@keyframes cyber-flicker-slam {
  0% { opacity: 0; transform: scale(0.8); }
  40% { opacity: 0.4; }
  60% { opacity: 0.2; }
  80% { opacity: 0.9; }
  100% { opacity: 1; transform: scale(1); }
}
`.trim();
}
