import type { ThumbnailLocalization } from "./types.js";

export const frLocale: ThumbnailLocalization = {
  hookText: {
    mega_grid: "CULTURE GÉNÉRALE",
    split_vs: "QUE CHOISIRAIS-TU ?",
    mystery_silhouette: "QUI EST-CE ?",
    odd_one_out: "TROUVE L'INTRUS !",
    difficulty_tier: "RÉUSSIRAS-TU LE NIVEAU 4 ?",
    true_false: "VRAI OU FAUX ?",
  },
  badgeTemplate: {
    mega_grid: (count) => `${count > 0 ? count : 100} QUESTIONS`,
    split_vs: () => "CHOISIS UN ! ⚡",
    mystery_silhouette: () => "SEULEMENT 1% SAIT ! 🔥",
    odd_one_out: () => "10 SECONDES ! ⏱️",
    difficulty_tier: () => "SEULEMENT IQ 140+ 🔥",
    true_false: () => "VRAI OU FAUX ? ⚡",
  },
};
