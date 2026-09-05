import type { ThumbnailLocalization } from "./types.js";

export const nlLocale: ThumbnailLocalization = {
  hookText: {
    mega_grid: "ALGEMENE KENNIS",
    split_vs: "WAT ZOU JIJ KIEZEN?",
    mystery_silhouette: "WIE IS DIT?",
    odd_one_out: "ZOEK DE FOUT!",
    difficulty_tier: "KAN JIJ LEVEL 4 AAN?",
    true_false: "WAAR OF NIET WAAR?",
  },
  badgeTemplate: {
    mega_grid: (count) => `${count > 0 ? count : 100} VRAGEN`,
    split_vs: () => "KIES ER ÉÉN! ⚡",
    mystery_silhouette: () => "SLECHTS 1% WEET HET! 🔥",
    odd_one_out: () => "10 SECONDEN! ⏱️",
    difficulty_tier: () => "ALLEEN IQ 140+ 🔥",
    true_false: () => "WAAR OF NIET WAAR? ⚡",
  },
};
