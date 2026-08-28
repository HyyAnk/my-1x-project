import type { CounterBadgeRenderInput, CounterBadgeVariant } from "../types.js";

export const neonBadgeVariant: CounterBadgeVariant = {
  id: "neon_badge",
  displayName: "Cyber Neon Badge",
  description: "Futuristic glowing neon badge with high-voltage border.",
  renderHtml(input: CounterBadgeRenderInput): string {
    const total = input.totalQuestions ? `<span class="neon-slash">/</span><span class="neon-total">${input.totalQuestions}</span>` : "";
    return `<div class="cb-neon-badge" data-layout-allow-occlusion><div class="neon-badge-outer"><div class="neon-badge-pulse" data-layout-ignore aria-hidden="true"></div><div class="neon-badge-core"><span class="neon-label">QUESTION</span><div class="neon-val-wrap"><span class="neon-num">${input.questionNumber}</span>${total}</div></div></div></div>`;
  },
  renderCss(): string {
    return `
.cb-neon-badge { position: relative; display: inline-flex; filter: drop-shadow(0 0 16px rgba(0,240,255,0.4)); }
.cb-neon-badge .neon-badge-outer { position: relative; padding: 3px; border-radius: 24px; background: linear-gradient(135deg, #00F0FF 0%, #FF007A 100%); }
.cb-neon-badge .neon-badge-pulse { position: absolute; inset: -4px; border-radius: 28px; background: linear-gradient(135deg, #00F0FF, #FF007A); opacity: 0.5; filter: blur(8px); animation: neonPulse 2s ease-in-out infinite; }
.cb-neon-badge .neon-badge-core { position: relative; z-index: 1; padding: 8px 22px; border-radius: 21px; background: #0A0E1A; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.cb-neon-badge .neon-label { font-size: 11px; font-weight: 900; letter-spacing: 0.2em; color: #00F0FF; text-transform: uppercase; text-shadow: 0 0 6px #00F0FF; }
.cb-neon-badge .neon-val-wrap { display: flex; align-items: baseline; gap: 2px; }
.cb-neon-badge .neon-num { font-size: 34px; font-weight: 900; color: #FFF; text-shadow: 0 0 10px #FFF, 0 0 20px #00F0FF; line-height: 1; }
.cb-neon-badge .neon-slash { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.5); margin: 0 2px; }
.cb-neon-badge .neon-total { font-size: 18px; font-weight: 800; color: #FF007A; text-shadow: 0 0 8px #FF007A; }
@keyframes neonPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; filter: blur(12px); } }
`;
  },
};
