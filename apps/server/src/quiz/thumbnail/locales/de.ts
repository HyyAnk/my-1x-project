import type { ThumbnailLocalization } from "./types.js";

export const deLocale: ThumbnailLocalization = {
  hookText: {
    mega_grid: "ALLGEMEINWISSEN",
    split_vs: "WAS WÜRDEST DU WÄHLEN?",
    mystery_silhouette: "WER IST DAS?",
    odd_one_out: "FINDE DEN FEHLER!",
    difficulty_tier: "SCHAFFST DU LEVEL 4?",
    true_false: "WAHR ODER FALSCH?",
  },
  badgeTemplate: {
    mega_grid: (count) => `${count > 0 ? count : 100} FRAGEN`,
    split_vs: () => "WÄHLE EINS! ⚡",
    mystery_silhouette: () => "NUR 1% WEISS ES! 🔥",
    odd_one_out: () => "10 SEKUNDEN! ⏱️",
    difficulty_tier: () => "NUR FÜR IQ 140+ 🔥",
    true_false: () => "WAHR ODER FALSCH? ⚡",
  },
};
