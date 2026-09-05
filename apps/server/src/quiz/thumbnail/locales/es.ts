import type { ThumbnailLocalization } from "./types.js";

export const esLocale: ThumbnailLocalization = {
  hookText: {
    mega_grid: "CULTURA GENERAL",
    split_vs: "¿CUÁL ELIGES?",
    mystery_silhouette: "¿QUIÉN ES?",
    odd_one_out: "¡ENCUENTRA EL DISTINTO!",
    difficulty_tier: "¿PUEDES SUPERAR EL NIVEL 4?",
    true_false: "¿VERDADERO O FALSO?",
  },
  badgeTemplate: {
    mega_grid: (count) => `${count > 0 ? count : 100} PREGUNTAS`,
    split_vs: () => "¡ELIGE UNO! ⚡",
    mystery_silhouette: () => "¡SOLO EL 1% SABE! 🔥",
    odd_one_out: () => "¡10 SEGUNDOS! ⏱️",
    difficulty_tier: () => "SOLO IQ 140+ 🔥",
    true_false: () => "¿VERDADERO O FALSO? ⚡",
  },
};
