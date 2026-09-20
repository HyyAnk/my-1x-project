import type { ThumbnailLocalization } from "./types.js";

export const zhLocale: ThumbnailLocalization = {
  hookText: {
    mega_grid: "\u7efc\u5408\u77e5\u8bc6\u6311\u6218",
    split_vs: "\u4f60\u4f1a\u9009\u54ea\u4e2a\uff1f",
    mystery_silhouette: "\u8fd9\u662f\u8c01\uff1f",
    odd_one_out: "\u627e\u51fa\u4e0d\u540c\uff01",
    difficulty_tier: "\u4f60\u80fd\u8fc7\u7b2c4\u5173\u5417\uff1f",
    true_false: "\u662f\u771f\u662f\u5047\uff1f",
  },
  badgeTemplate: {
    mega_grid: (count) => `${count > 0 ? count : 100}\u9053\u9898`,
    split_vs: () => "\u4e8c\u9009\u4e00\uff01\u26a1",
    mystery_silhouette: () => "\u53ea\u67091%\u7b54\u5bf9\uff01\ud83d\udd25",
    odd_one_out: () => "10\u79d2\u627e\u51fa\u6765\uff01\u23f1\ufe0f",
    difficulty_tier: () => "\u4ec5\u9650IQ 140+ \ud83d\udd25",
    true_false: () => "\u771f\u8fd8\u662f\u5047\uff1f\u26a1",
  },
};
