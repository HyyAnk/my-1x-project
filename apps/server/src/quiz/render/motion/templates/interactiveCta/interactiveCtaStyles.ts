import type { MascotRenderAspectRatio } from "@studio/shared";

export interface InteractiveCtaStyleOptions {
  accentColor?: string;
  aspectRatio?: MascotRenderAspectRatio;
}

/**
 * Returns scoped CSS rules for the Interactive CTA motion outro.
 */
export function interactiveCtaStyles(options: InteractiveCtaStyleOptions = {}): string {
  const accent = options.accentColor || "#FF0033"; // YouTube-like vibrant red/accent
  const isVertical = options.aspectRatio === "9:16";

  return `
.motion-interactive-cta {
  --cta-accent: ${accent};
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: radial-gradient(circle at center, #181824 0%, #0a0a0f 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  color: #ffffff;
}

.cta-glow-pulse {
  position: absolute;
  width: ${isVertical ? "380px" : "550px"};
  height: ${isVertical ? "380px" : "550px"};
  border-radius: 50%;
  background: radial-gradient(circle, var(--cta-accent) 0%, transparent 68%);
  opacity: 0.22;
  filter: blur(50px);
  animation: cta-pulse 2s ease-in-out infinite alternate;
}

.cta-container {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0 32px;
  max-width: ${isVertical ? "92%" : "80%"};
}

.cta-speech-bubble {
  position: relative;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 12px 24px;
  font-size: ${isVertical ? "20px" : "24px"};
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 24px;
  opacity: 0;
  transform: translateY(12px);
  animation: cta-fade-up 0.5s ease-out 0.1s forwards;
}

.cta-speech-bubble::after {
  content: "";
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 10px 10px 0;
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.1) transparent transparent;
}

.cta-button {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  background: var(--cta-accent);
  color: #ffffff;
  font-size: ${isVertical ? "26px" : "32px"};
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: ${isVertical ? "16px 36px" : "20px 48px"};
  border-radius: 999px;
  box-shadow: 0 12px 32px rgba(255, 0, 51, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.25);
  margin-bottom: 20px;
  opacity: 0;
  transform: scale(0.85);
  animation: cta-button-slam 0.7s cubic-bezier(0.15, 1.4, 0.3, 1) 0.3s forwards,
             cta-button-click 0.35s ease-in-out 1.2s forwards;
}

.cta-bell-icon {
  display: inline-block;
  font-size: 1.1em;
  animation: cta-bell-ring 0.6s ease-in-out 1.5s forwards;
}

.cta-subtext {
  font-size: ${isVertical ? "18px" : "22px"};
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  margin: 0;
}

.cta-mascot-slot {
  position: absolute;
  bottom: ${isVertical ? "60px" : "40px"};
  right: ${isVertical ? "50%" : "80px"};
  transform: ${isVertical ? "translateX(50%) scale(0.88)" : "none"};
  z-index: 15;
  opacity: 0;
  animation: cta-fade-up 0.5s ease-out 0.4s forwards;
}

.cta-progress-track {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.cta-progress-fill {
  height: 100%;
  width: 0%;
  background: var(--cta-accent);
  animation: cta-progress-fill var(--cta-duration, 3.5s) linear forwards;
}

@keyframes cta-pulse {
  0% { transform: scale(0.95); opacity: 0.18; }
  100% { transform: scale(1.1); opacity: 0.28; }
}

@keyframes cta-fade-up {
  to { opacity: 1; transform: translateY(0); }
}

@keyframes cta-button-slam {
  to { opacity: 1; transform: scale(1); }
}

@keyframes cta-button-click {
  50% { transform: scale(0.92); }
  100% { transform: scale(1); }
}

@keyframes cta-bell-ring {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(18deg); }
  50% { transform: rotate(-18deg); }
  75% { transform: rotate(10deg); }
  100% { transform: rotate(0deg); }
}

@keyframes cta-progress-fill {
  to { width: 100%; }
}
`.trim();
}
