/**
 * Skin-aware binary verdict button styling and typography for Verdict layouts (Yes/No).
 * Preserves 100% backward-compatible 3D arcade styling for glossy_arcade while
 * providing distinct, rich visual identities for all other answer card skins.
 */
export function verdictBinaryButtonStyles(layoutClass = "layout-verdict_yes_no"): string {
  return `
/* Oversized Pill Button Capsule Geometry */
.${layoutClass} .choice-card,
.${layoutClass} .choice-card-text,
.${layoutClass} .answer-card {
  width: 100%;
  border-radius: 9999px;
  box-sizing: border-box;
  transition: transform 0.2s cubic-bezier(0.22, 0.8, 0.3, 1), opacity 0.2s ease-out;
  --choice-text-color: #FFFFFF;
  --choice-text-shadow: 0 2px 6px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.7);
}

.${layoutClass} .choice-card-surface {
  width: 100%;
  height: var(--choice-surface-height, 164px);
  min-height: 164px;
  max-height: 164px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  position: relative;
}

.${layoutClass} .choice-card .choice-text {
  font-weight: 900;
  letter-spacing: 0.8px;
  text-align: center;
  width: 100%;
}

/* === 1. Glossy Arcade 3D Skin (Canonical default) === */
.${layoutClass} .skin-glossy_arcade:nth-child(1) .choice-card-surface,
.${layoutClass} .choice-card:not([class*="skin-"]):nth-child(1) .choice-card-surface,
.${layoutClass} .choice-card[data-choice-skin="glossy_arcade"]:nth-child(1) .choice-card-surface,
.${layoutClass} .choice-card:nth-child(1) .ac-glossy-arcade,
.${layoutClass} .skin-glossy_arcade.choice-true .choice-card-surface,
.${layoutClass} .skin-glossy_arcade.choice-yes .choice-card-surface {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  border: 6px solid #FFFFFF;
  border-radius: 9999px;
  box-shadow:
    0 14px 0 #047857,
    0 22px 38px rgba(5, 150, 105, 0.40),
    0 0 28px rgba(16, 185, 129, 0.45),
    inset 0 4px 8px rgba(255, 255, 255, 0.65);
  color: #FFFFFF;
}

.${layoutClass} .skin-glossy_arcade:nth-child(2) .choice-card-surface,
.${layoutClass} .choice-card:not([class*="skin-"]):nth-child(2) .choice-card-surface,
.${layoutClass} .choice-card[data-choice-skin="glossy_arcade"]:nth-child(2) .choice-card-surface,
.${layoutClass} .choice-card:nth-child(2) .ac-glossy-arcade,
.${layoutClass} .skin-glossy_arcade.choice-false .choice-card-surface,
.${layoutClass} .skin-glossy_arcade.choice-no .choice-card-surface {
  background: linear-gradient(135deg, #F43F5E 0%, #E11D48 100%);
  border: 6px solid #FFFFFF;
  border-radius: 9999px;
  box-shadow:
    0 14px 0 #9F1239,
    0 22px 38px rgba(225, 29, 72, 0.40),
    0 0 28px rgba(244, 63, 94, 0.45),
    inset 0 4px 8px rgba(255, 255, 255, 0.65);
  color: #FFFFFF;
}

.${layoutClass} .skin-glossy_arcade .choice-text,
.${layoutClass} .choice-card:not([class*="skin-"]) .choice-text,
.${layoutClass} .choice-card[data-choice-skin="glossy_arcade"] .choice-text,
.${layoutClass} .ac-glossy-arcade .choice-text,
.${layoutClass} .ac-glossy-arcade span,
.${layoutClass} .choice-card:not([class*="skin-"]):nth-child(1) .choice-text,
.${layoutClass} .choice-card:not([class*="skin-"]):nth-child(2) .choice-text,
.${layoutClass} .skin-glossy_arcade:nth-child(1) .choice-text,
.${layoutClass} .skin-glossy_arcade:nth-child(2) .choice-text,
.${layoutClass} .skin-glossy_arcade.choice-true .choice-text,
.${layoutClass} .skin-glossy_arcade.choice-false .choice-text,
.${layoutClass} .skin-glossy_arcade.choice-yes .choice-text,
.${layoutClass} .skin-glossy_arcade.choice-no .choice-text {
  color: #FFFFFF !important;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.7);
}


/* === 2. Comic Pop Art Skin === */
.${layoutClass} .skin-comic_chunky:nth-child(1) .choice-card-surface,
.${layoutClass} .choice-card[data-choice-skin="comic_chunky"]:nth-child(1) .choice-card-surface,
.${layoutClass} .choice-card:nth-child(1) .ac-comic-chunky {
  background: linear-gradient(135deg, #4ADE80 0%, #22C55E 100%);
  border: 7px solid #111827;
  border-radius: 36px;
  box-shadow:
    10px 14px 0 #111827,
    0 20px 32px rgba(34, 197, 94, 0.35),
    inset 0 4px 0 rgba(255, 255, 255, 0.85);
  color: #111827;
}

.${layoutClass} .skin-comic_chunky:nth-child(2) .choice-card-surface,
.${layoutClass} .choice-card[data-choice-skin="comic_chunky"]:nth-child(2) .choice-card-surface,
.${layoutClass} .choice-card:nth-child(2) .ac-comic-chunky {
  background: linear-gradient(135deg, #FB7185 0%, #F43F5E 100%);
  border: 7px solid #111827;
  border-radius: 36px;
  box-shadow:
    10px 14px 0 #111827,
    0 20px 32px rgba(244, 63, 94, 0.35),
    inset 0 4px 0 rgba(255, 255, 255, 0.85);
  color: #111827;
}

.${layoutClass} .skin-comic_chunky .choice-text,
.${layoutClass} .ac-comic-chunky .choice-text {
  font-family: var(--font-display, "SVN-Hello Headline", "Fredoka", "Baloo 2", sans-serif);
  font-weight: 900;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #FFFFFF;
  -webkit-text-stroke: 3px #111827;
  paint-order: stroke fill;
  text-shadow: 4px 4px 0 #111827;
}

/* === 3. Glassmorphism Neon Skin === */
.${layoutClass} .skin-glass_neon:nth-child(1) .choice-card-surface,
.${layoutClass} .choice-card[data-choice-skin="glass_neon"]:nth-child(1) .choice-card-surface,
.${layoutClass} .choice-card:nth-child(1) .ac-glass-neon {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.38) 0%, rgba(5, 150, 105, 0.52) 100%);
  border: 4px solid rgba(167, 243, 208, 0.9);
  border-radius: 36px;
  backdrop-filter: blur(14px) saturate(150%);
  box-shadow:
    0 12px 32px rgba(6, 78, 59, 0.40),
    0 0 36px rgba(16, 185, 129, 0.60),
    inset 0 2px 0 rgba(255, 255, 255, 0.85);
  color: #FFFFFF;
}

.${layoutClass} .skin-glass_neon:nth-child(2) .choice-card-surface,
.${layoutClass} .choice-card[data-choice-skin="glass_neon"]:nth-child(2) .choice-card-surface,
.${layoutClass} .choice-card:nth-child(2) .ac-glass-neon {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.38) 0%, rgba(225, 29, 72, 0.52) 100%);
  border: 4px solid rgba(254, 205, 211, 0.9);
  border-radius: 36px;
  backdrop-filter: blur(14px) saturate(150%);
  box-shadow:
    0 12px 32px rgba(136, 19, 55, 0.40),
    0 0 36px rgba(244, 63, 94, 0.60),
    inset 0 2px 0 rgba(255, 255, 255, 0.85);
  color: #FFFFFF;
}

.${layoutClass} .skin-glass_neon .choice-text,
.${layoutClass} .ac-glass-neon .choice-text {
  font-family: "Fredoka", "SVN-Hello Headline", sans-serif;
  font-weight: 900;
  letter-spacing: 1.2px;
  color: #FFFFFF;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.9), 0 2px 8px rgba(0, 0, 0, 0.7);
}

/* === 4. Minimalist Soft Card Skin === */
.${layoutClass} .skin-minimal_soft:nth-child(1) .choice-card-surface,
.${layoutClass} .choice-card[data-choice-skin="minimal_soft"]:nth-child(1) .choice-card-surface,
.${layoutClass} .choice-card:nth-child(1) .ac-minimal-soft {
  background: #FFFFFF;
  border: 5px solid #10B981;
  border-radius: 9999px;
  box-shadow:
    0 14px 32px rgba(16, 185, 129, 0.22),
    0 4px 12px rgba(13, 35, 71, 0.12),
    inset 0 2px 0 #FFFFFF;
  color: #065F46;
}

.${layoutClass} .skin-minimal_soft:nth-child(2) .choice-card-surface,
.${layoutClass} .choice-card[data-choice-skin="minimal_soft"]:nth-child(2) .choice-card-surface,
.${layoutClass} .choice-card:nth-child(2) .ac-minimal-soft {
  background: #FFFFFF;
  border: 5px solid #F43F5E;
  border-radius: 9999px;
  box-shadow:
    0 14px 32px rgba(244, 63, 94, 0.22),
    0 4px 12px rgba(13, 35, 71, 0.12),
    inset 0 2px 0 #FFFFFF;
  color: #9F1239;
}

.${layoutClass} .skin-minimal_soft:nth-child(1) .choice-text,
.${layoutClass} .choice-card:nth-child(1) .ac-minimal-soft .choice-text,
.${layoutClass} .choice-card[data-choice-skin="minimal_soft"]:nth-child(1) .choice-text {
  font-family: "Fredoka", "Nunito", sans-serif;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: #065F46 !important;
  text-shadow: none !important;
}

.${layoutClass} .skin-minimal_soft:nth-child(2) .choice-text,
.${layoutClass} .choice-card:nth-child(2) .ac-minimal-soft .choice-text,
.${layoutClass} .choice-card[data-choice-skin="minimal_soft"]:nth-child(2) .choice-text {
  font-family: "Fredoka", "Nunito", sans-serif;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: #9F1239 !important;
  text-shadow: none !important;
}


/* === 5. Steel Beam Plate Skin === */
.${layoutClass} .skin-steel_beam_plate:nth-child(1) .choice-card-surface,
.${layoutClass} .choice-card[data-choice-skin="steel_beam_plate"]:nth-child(1) .choice-card-surface,
.${layoutClass} .choice-card:nth-child(1) .ac-steel-beam-plate {
  background: linear-gradient(180deg, #1E293B 0%, #0F172A 100%);
  border: 5px solid #10B981;
  border-radius: 28px;
  box-shadow:
    0 14px 0 #064E3B,
    0 20px 36px rgba(0, 0, 0, 0.45),
    0 0 24px rgba(16, 185, 129, 0.35),
    inset 0 2px 0 rgba(255, 255, 255, 0.35);
  color: #6EE7B7;
}

.${layoutClass} .skin-steel_beam_plate:nth-child(2) .choice-card-surface,
.${layoutClass} .choice-card[data-choice-skin="steel_beam_plate"]:nth-child(2) .choice-card-surface,
.${layoutClass} .choice-card:nth-child(2) .ac-steel-beam-plate {
  background: linear-gradient(180deg, #1E293B 0%, #0F172A 100%);
  border: 5px solid #F43F5E;
  border-radius: 28px;
  box-shadow:
    0 14px 0 #881337,
    0 20px 36px rgba(0, 0, 0, 0.45),
    0 0 24px rgba(244, 63, 94, 0.35),
    inset 0 2px 0 rgba(255, 255, 255, 0.35);
  color: #FDA4AF;
}

.${layoutClass} .skin-steel_beam_plate:nth-child(1) .choice-text,
.${layoutClass} .choice-card:nth-child(1) .ac-steel-beam-plate .choice-text {
  font-family: "SVN-Hello Headline", "Impact", sans-serif;
  font-weight: 900;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #A7F3D0;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9);
}

.${layoutClass} .skin-steel_beam_plate:nth-child(2) .choice-text,
.${layoutClass} .choice-card:nth-child(2) .ac-steel-beam-plate .choice-text {
  font-family: "SVN-Hello Headline", "Impact", sans-serif;
  font-weight: 900;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #FECDD3;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9);
}

/* === 6. Pastel Marshmallow Skin === */
.${layoutClass} .skin-pastel_marshmallow:nth-child(1) .choice-card-surface,
.${layoutClass} .choice-card[data-choice-skin="pastel_marshmallow"]:nth-child(1) .choice-card-surface,
.${layoutClass} .choice-card:nth-child(1) .ac-pastel-marshmallow {
  background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%);
  border: 5px solid #FFFFFF;
  border-radius: 9999px;
  box-shadow:
    0 12px 0 #6EE7B7,
    0 18px 28px rgba(16, 185, 129, 0.28),
    inset 0 3px 6px rgba(255, 255, 255, 0.95);
  color: #065F46;
}

.${layoutClass} .skin-pastel_marshmallow:nth-child(2) .choice-card-surface,
.${layoutClass} .choice-card[data-choice-skin="pastel_marshmallow"]:nth-child(2) .choice-card-surface,
.${layoutClass} .choice-card:nth-child(2) .ac-pastel-marshmallow {
  background: linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%);
  border: 5px solid #FFFFFF;
  border-radius: 9999px;
  box-shadow:
    0 12px 0 #FDA4AF,
    0 18px 28px rgba(244, 63, 94, 0.28),
    inset 0 3px 6px rgba(255, 255, 255, 0.95);
  color: #9F1239;
}

.${layoutClass} .skin-pastel_marshmallow:nth-child(1) .choice-text,
.${layoutClass} .choice-card:nth-child(1) .ac-pastel-marshmallow .choice-text {
  font-family: "Fredoka", "Quicksand", sans-serif;
  font-weight: 900;
  letter-spacing: 0.8px;
  color: #065F46;
  text-shadow: 0 2px 4px rgba(255, 255, 255, 0.8);
}

.${layoutClass} .skin-pastel_marshmallow:nth-child(2) .choice-text,
.${layoutClass} .choice-card:nth-child(2) .ac-pastel-marshmallow .choice-text {
  font-family: "Fredoka", "Quicksand", sans-serif;
  font-weight: 900;
  letter-spacing: 0.8px;
  color: #9F1239;
  text-shadow: 0 2px 4px rgba(255, 255, 255, 0.8);
}

/* === 7. Rustic Wood Plank Skin === */
.${layoutClass} .skin-rustic_wood_plank:nth-child(1) .choice-card-surface,
.${layoutClass} .choice-card[data-choice-skin="rustic_wood_plank"]:nth-child(1) .choice-card-surface,
.${layoutClass} .choice-card:nth-child(1) .ac-rustic-wood-plank {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, transparent 25%, rgba(0, 0, 0, 0.08) 50%, rgba(255, 255, 255, 0.03) 75%, transparent 100%),
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.05) 0px, rgba(0, 0, 0, 0.05) 1px, transparent 1px, transparent 6px),
    linear-gradient(180deg, #6F3C18 0%, #53280F 50%, #371806 100%);
  border: 5px solid #10B981;
  border-radius: 28px;
  box-shadow:
    0 14px 0 #1E0C04,
    0 20px 36px rgba(0, 0, 0, 0.45),
    0 0 24px rgba(16, 185, 129, 0.35),
    inset 0 2px 0 rgba(255, 225, 150, 0.4),
    inset 0 -3px 0 rgba(0, 0, 0, 0.55);
  color: #86EFAC;
}

.${layoutClass} .skin-rustic_wood_plank:nth-child(2) .choice-card-surface,
.${layoutClass} .choice-card[data-choice-skin="rustic_wood_plank"]:nth-child(2) .choice-card-surface,
.${layoutClass} .choice-card:nth-child(2) .ac-rustic-wood-plank {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0%, transparent 25%, rgba(0, 0, 0, 0.09) 50%, rgba(255, 255, 255, 0.03) 75%, transparent 100%),
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.05) 0px, rgba(0, 0, 0, 0.05) 1px, transparent 1px, transparent 6px),
    linear-gradient(180deg, #663016 0%, #4B220E 50%, #321306 100%);
  border: 5px solid #F43F5E;
  border-radius: 28px;
  box-shadow:
    0 14px 0 #1E0C04,
    0 20px 36px rgba(0, 0, 0, 0.45),
    0 0 24px rgba(244, 63, 94, 0.35),
    inset 0 2px 0 rgba(255, 225, 150, 0.4),
    inset 0 -3px 0 rgba(0, 0, 0, 0.55);
  color: #FDA4AF;
}

.${layoutClass} .skin-rustic_wood_plank:nth-child(1) .choice-text,
.${layoutClass} .choice-card:nth-child(1) .ac-rustic-wood-plank .choice-text,
.${layoutClass} .choice-card[data-choice-skin="rustic_wood_plank"]:nth-child(1) .choice-text {
  font-family: var(--font-display, "SVN-Hello Headline", "Cinzel", "Georgia", serif);
  font-weight: 900;
  letter-spacing: 1.5px;
  color: #86EFAC;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9), 0 0 16px rgba(16, 185, 129, 0.5);
}

.${layoutClass} .skin-rustic_wood_plank:nth-child(2) .choice-text,
.${layoutClass} .choice-card:nth-child(2) .ac-rustic-wood-plank .choice-text,
.${layoutClass} .choice-card[data-choice-skin="rustic_wood_plank"]:nth-child(2) .choice-text {
  font-family: var(--font-display, "SVN-Hello Headline", "Cinzel", "Georgia", serif);
  font-weight: 900;
  letter-spacing: 1.5px;
  color: #FDA4AF;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9), 0 0 16px rgba(244, 63, 94, 0.5);
}
`;
}
