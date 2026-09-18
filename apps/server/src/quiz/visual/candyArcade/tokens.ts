import type { QuizVisualTemplate } from "../types.js";

export const roundedFont = '"Nunito", "Trebuchet MS", sans-serif';
export const headlineFont = '"Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", "Trebuchet MS", sans-serif';

export const candyArcadeTokens: QuizVisualTemplate["tokens"] = {
  spacing: { xs: 12, sm: 20, md: 32, lg: 48, xl: 72, xxl: 104 },
  radius: { card: 38, pill: 999, media: 42, badge: 25 },
  typography: {
    question: {
      family: headlineFont,
      weight: 800,
      size: 58,
      lineHeight: 1.18,
      letterSpacing: -0.5,
      shadow: "0 2px 0 rgba(255, 255, 255, .8), 0 3px 0 rgba(16, 35, 75, .08)",
    },
    answer: { family: roundedFont, weight: 900, size: 34, lineHeight: 1.1, letterSpacing: -0.6, shadow: "none" },
    badge: { family: roundedFont, weight: 900, size: 36, lineHeight: 1, letterSpacing: 0, shadow: "none" },
    label: { family: roundedFont, weight: 900, size: 23, lineHeight: 1.1, letterSpacing: 0.4, shadow: "none" },
    counter: { family: roundedFont, weight: 900, size: 27, lineHeight: 1, letterSpacing: 0.2, shadow: "none" },
    fact: { family: headlineFont, weight: 900, size: 38, lineHeight: 1.22, letterSpacing: -0.3, shadow: "none" },
    interstitial: {
      family: roundedFont,
      weight: 900,
      size: 96,
      lineHeight: 1.02,
      letterSpacing: -3.2,
      shadow: "0 7px 0 rgba(13, 35, 71, .12)",
    },
  },
  shadow: {
    card: "0 18px 0 rgba(13, 35, 71, .18)",
    lift: "0 25px 36px rgba(13, 35, 71, .22)",
    sticker: "0 10px 0 rgba(13, 35, 71, .24)",
    glow: "0 0 0 8px rgba(255,255,255,.22), 0 0 42px rgba(255,255,255,.55)",
  },
  motion: {
    enterMs: 440,
    staggerMs: 120,
    revealMs: 550,
    transitionMs: 920,
    ambientSeconds: 14,
    easing: { pop: "cubic-bezier(.18,1.42,.34,1)", out: "cubic-bezier(.22,.8,.3,1)", soft: "cubic-bezier(.4,0,.2,1)", linear: "linear" },
  },
  zIndex: {
    background: 0,
    ambient: 1,
    decor: 2,
    content: 3,
    header: 4,
    phaseRegion: 5,
    statusBadge: 6,
    reward: 7,
    mascot: 4,
    overlay: 8,
    transition: 10,
  },
  safeArea: { top: 64, right: 96, bottom: 58, left: 96 },
};

export const candyArcadeStyleBible: QuizVisualTemplate["styleBible"] = {
  id: "candy-arcade-v2",
  bright: true,
  highSaturation: true,
  contrast: "medium_high",
  lighting: "clean",
  composition: "large_subject_simple_background",
  audience: "children",
  safety: "positive",
};
