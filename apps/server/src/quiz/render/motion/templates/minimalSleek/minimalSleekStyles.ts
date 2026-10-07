import type { MascotRenderAspectRatio } from "@studio/shared";

export interface MinimalSleekStyleOptions {
  accentColor?: string;
  aspectRatio?: MascotRenderAspectRatio;
}

/**
 * Returns scoped CSS rules for the Minimal Sleek modern motion intro.
 */
export function minimalSleekStyles(options: MinimalSleekStyleOptions = {}): string {
  const accent = options.accentColor || "#6366F1";
  const isVertical = options.aspectRatio === "9:16";

  return `
.motion-minimal-sleek {
  --sleek-accent: ${accent};
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: radial-gradient(circle at 50% 30%, #1e1e2d 0%, #0d0d14 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  color: #f8fafc;
}

.sleek-ambient-glow {
  position: absolute;
  width: ${isVertical ? "400px" : "600px"};
  height: ${isVertical ? "400px" : "600px"};
  border-radius: 50%;
  background: radial-gradient(circle, var(--sleek-accent) 0%, transparent 70%);
  opacity: 0.25;
  filter: blur(60px);
  animation: sleek-ambient-float 3s ease-in-out infinite alternate;
}

.sleek-card-container {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: ${isVertical ? "36px 28px" : "48px 56px"};
  max-width: ${isVertical ? "88%" : "72%"};
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 36px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  opacity: 0;
  transform: scale(0.92) translateY(20px);
  animation: sleek-card-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
}

.sleek-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: ${isVertical ? "18px" : "22px"};
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sleek-accent);
  margin-bottom: 14px;
}

.sleek-title {
  font-size: ${isVertical ? "42px" : "58px"};
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.015em;
  color: #ffffff;
  margin: 0;
}

.sleek-mascot-slot {
  position: absolute;
  bottom: ${isVertical ? "50px" : "40px"};
  right: ${isVertical ? "50%" : "70px"};
  transform: ${isVertical ? "translateX(50%) scale(0.85)" : "none"};
  z-index: 15;
  opacity: 0;
  animation: sleek-card-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.35s forwards;
}

@keyframes sleek-ambient-float {
  0% { transform: scale(0.95) translate(-10px, -10px); }
  100% { transform: scale(1.08) translate(10px, 10px); }
}

@keyframes sleek-card-enter {
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
`.trim();
}
