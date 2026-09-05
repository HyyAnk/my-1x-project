import type { ThumbnailLocalization } from "./types.js";

export const svLocale: ThumbnailLocalization = {
  hookText: {
    mega_grid: "ALLMÄNBILDNING",
    split_vs: "VAD SKULLE DU VÄLJA?",
    mystery_silhouette: "VEM ÄR DET HÄR?",
    odd_one_out: "HITTA DEN SOM SKILJER SIG!",
    difficulty_tier: "KLARAR DU NIVÅ 4?",
    true_false: "SANT ELLER FALSKT?",
  },
  badgeTemplate: {
    mega_grid: (count) => `${count > 0 ? count : 100} FRÅGOR`,
    split_vs: () => "VÄLJ EN! ⚡",
    mystery_silhouette: () => "BARA 1% VET! 🔥",
    odd_one_out: () => "10 SEKUNDER! ⏱️",
    difficulty_tier: () => "ENDAST FÖR IQ 140+ 🔥",
    true_false: () => "SANT ELLER FALSKT? ⚡",
  },
};
