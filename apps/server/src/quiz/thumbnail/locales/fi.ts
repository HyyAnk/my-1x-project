import type { ThumbnailLocalization } from "./types.js";

export const fiLocale: ThumbnailLocalization = {
  hookText: {
    mega_grid: "YLEISTIETO",
    split_vs: "KUMMAN VALITSISIT?",
    mystery_silhouette: "KUKA TÄMÄ ON?",
    odd_one_out: "ETSI ERILAINEN!",
    difficulty_tier: "LÄPÄISETKÖ TASON 4?",
    true_false: "TOTTA VAI TARUA?",
  },
  badgeTemplate: {
    mega_grid: (count) => `${count > 0 ? count : 100} KYSYMYSTÄ`,
    split_vs: () => "VALITSE YKSI! ⚡",
    mystery_silhouette: () => "VAIN 1% TIETÄÄ! 🔥",
    odd_one_out: () => "10 SEKUNTIA! ⏱️",
    difficulty_tier: () => "VAIN IQ 140+ 🔥",
    true_false: () => "TOTTA VAI TARUA? ⚡",
  },
};
