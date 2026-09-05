import type { ThumbnailLocalization } from "./types.js";

export const jaLocale: ThumbnailLocalization = {
  hookText: {
    mega_grid: "一般常識クイズ",
    split_vs: "どっちを選ぶ？",
    mystery_silhouette: "この人は誰？",
    odd_one_out: "間違い探し！",
    difficulty_tier: "レベル4解ける？",
    true_false: "ウソ？ホント？",
  },
  badgeTemplate: {
    mega_grid: (count) => `全${count > 0 ? count : 100}問`,
    split_vs: () => "究極の２択！⚡",
    mystery_silhouette: () => "正解率1%！🔥",
    odd_one_out: () => "10秒で見つけて！⏱️",
    difficulty_tier: () => "IQ140以上のみ🔥",
    true_false: () => "○か✕か！？✅",
  },
};
