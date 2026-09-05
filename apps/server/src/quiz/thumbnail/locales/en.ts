import type { ThumbnailLocalization } from "./types.js";

export const enLocale: ThumbnailLocalization = {
  hookText: {
    mega_grid: "GENERAL KNOWLEDGE",
    split_vs: "WHICH WOULD YOU CHOOSE?",
    mystery_silhouette: "WHO IS THIS?",
    odd_one_out: "FIND THE ODD ONE!",
    difficulty_tier: "CAN YOU SOLVE LEVEL 4?",
    true_false: "TRUE OR FALSE?",
  },
  badgeTemplate: {
    mega_grid: (count) => `${count > 0 ? count : 100} QUESTIONS`,
    split_vs: () => "PICK ONE! ⚡",
    mystery_silhouette: () => "ONLY 1% KNOW! 🔥",
    odd_one_out: () => "10 SECONDS! ⏱️",
    difficulty_tier: () => "IQ 140+ ONLY 🔥",
    true_false: () => "TRUE OR FALSE? ⚡",
  },
};
