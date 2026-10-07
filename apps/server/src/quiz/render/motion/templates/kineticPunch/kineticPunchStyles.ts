import type { MascotRenderAspectRatio } from "@studio/shared";

export interface KineticPunchStyleOptions {
  accentColor?: string;
  aspectRatio?: MascotRenderAspectRatio;
}

/**
 * Returns scoped CSS rules for the Kinetic Punch motion intro.
 */
export function kineticPunchStyles(options: KineticPunchStyleOptions = {}): string {
  const accent = options.accentColor || "#FF007F";
  const isVertical = options.aspectRatio === "9:16";

  return `
.motion-kinetic-punch {
  --punch-accent: ${accent};
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: radial-gradient(circle at center, #1b0c2e 0%, #090312 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  color: #ffffff;
}

.punch-bg-radial {
  position: absolute;
  inset: -20%;
  background: radial-gradient(circle, var(--punch-accent) 0%, transparent 65%);
  opacity: 0.22;
  filter: blur(40px);
  animation: punch-pulse 1.8s ease-in-out infinite alternate;
}

.punch-shockwave {
  position: absolute;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  border: 4px solid var(--punch-accent);
  opacity: 0;
  animation: punch-wave 1.2s cubic-bezier(0.1, 0.9, 0.2, 1) 0.15s forwards;
}

.punch-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0 40px;
  max-width: ${isVertical ? "90%" : "80%"};
}

.punch-kicker {
  font-size: ${isVertical ? "28px" : "36px"};
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--punch-accent);
  margin-bottom: 12px;
  opacity: 0;
  transform: translateY(-24px);
  animation: punch-drop 0.4s cubic-bezier(0.2, 1.2, 0.3, 1) 0.1s forwards;
}

.punch-headline {
  font-size: ${isVertical ? "54px" : "72px"};
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  margin: 0;
  text-shadow: 0 8px 32px rgba(0,0,0,0.6);
  opacity: 0;
  transform: scale(0.65);
  animation: punch-slam 0.5s cubic-bezier(0.12, 1.35, 0.25, 1) 0.28s forwards;
}

.punch-mascot-slot {
  position: absolute;
  bottom: ${isVertical ? "60px" : "40px"};
  right: ${isVertical ? "50%" : "80px"};
  transform: ${isVertical ? "translateX(50%) scale(0.85)" : "none"};
  z-index: 15;
  opacity: 0;
  animation: punch-pop 0.55s cubic-bezier(0.15, 1.25, 0.3, 1) 0.45s forwards;
}

@keyframes punch-pulse {
  0% { transform: scale(0.9); opacity: 0.18; }
  100% { transform: scale(1.15); opacity: 0.32; }
}

@keyframes punch-wave {
  0% { transform: scale(0.2); opacity: 0.9; }
  100% { transform: scale(3.5); opacity: 0; }
}

@keyframes punch-drop {
  to { opacity: 1; transform: translateY(0); }
}

@keyframes punch-slam {
  to { opacity: 1; transform: scale(1); }
}

@keyframes punch-pop {
  to { opacity: 1; }
}
`.trim();
}
