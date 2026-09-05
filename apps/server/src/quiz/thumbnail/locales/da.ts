import type { ThumbnailLocalization } from "./types.js";

export const daLocale: ThumbnailLocalization = {
  hookText: {
    mega_grid: "ALMEN VIDEN",
    split_vs: "HVAD VILLE DU VÆLGE?",
    mystery_silhouette: "HVEM ER DETTE?",
    odd_one_out: "FIND DEN DER SKILLER SIG UD!",
    difficulty_tier: "KAN DU KLARE NIVEAU 4?",
    true_false: "SANDT ELLER FALSKT?",
  },
  badgeTemplate: {
    mega_grid: (count) => `${count > 0 ? count : 100} SPØRGSMÅL`,
    split_vs: () => "VÆLG ÉN! ⚡",
    mystery_silhouette: () => "KUN 1% VED DET! 🔥",
    odd_one_out: () => "10 SEKUNDER! ⏱️",
    difficulty_tier: () => "KUN FOR IQ 140+ 🔥",
    true_false: () => "SANDT ELLER FALSKT? ⚡",
  },
};
