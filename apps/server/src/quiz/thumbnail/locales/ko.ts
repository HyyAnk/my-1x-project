import type { ThumbnailLocalization } from "./types.js";

export const koLocale: ThumbnailLocalization = {
  hookText: {
    mega_grid: "상식 퀴즈",
    split_vs: "당신의 선택은?",
    mystery_silhouette: "이 사람은 누구?",
    odd_one_out: "다른 그림 찾기!",
    difficulty_tier: "레벨 4 풀 수 있을까?",
    true_false: "O vs X 퀴즈",
  },
  badgeTemplate: {
    mega_grid: (count) => `총 ${count > 0 ? count : 100}문제`,
    split_vs: () => "하나만 골라봐! ⚡",
    mystery_silhouette: () => "정답률 1%! 🔥",
    odd_one_out: () => "10초 도전! ⏱️",
    difficulty_tier: () => "IQ 140 이상만🔥",
    true_false: () => "진실 혹은 거짓? ⚡",
  },
};
