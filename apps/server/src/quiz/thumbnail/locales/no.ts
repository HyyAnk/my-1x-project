import type { ThumbnailLocalization } from "./types.js";

export const noLocale: ThumbnailLocalization = {
  hookText: {
    mega_grid: "GENERELL KUNNSKAP",
    split_vs: "HVA VILLE DU VALGT?",
    mystery_silhouette: "HVEM ER DETTE?",
    odd_one_out: "FINN DEN SOM IKKE PASSER!",
    difficulty_tier: "KLARER DU NIVÅ 4?",
    true_false: "SANT ELLER USANT?",
  },
  badgeTemplate: {
    mega_grid: (count) => `${count > 0 ? count : 100} SPØRSMÅL`,
    split_vs: () => "VELG ÉN! ⚡",
    mystery_silhouette: () => "KUN 1% VET DET! 🔥",
    odd_one_out: () => "10 SEKUNDER! ⏱️",
    difficulty_tier: () => "KUN FOR IQ 140+ 🔥",
    true_false: () => "SANT ELLER USANT? ⚡",
  },
};
