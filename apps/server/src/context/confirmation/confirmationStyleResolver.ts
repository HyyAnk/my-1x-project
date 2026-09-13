import { ALL_QUIZ_IMAGE_STYLES, type QuizImageStyle } from "@studio/shared";

export interface ResolvedCandidateStyles {
  requestedStyle: QuizImageStyle | "mixed";
  resolvedStyle: QuizImageStyle;
}

/**
 * Resolves candidate visual styles based on user request, candidate default, and channel style pool.
 */
export function resolveCandidateStyles(
  requested?: QuizImageStyle | "mixed",
  candidateStyle?: QuizImageStyle | "mixed",
  channelStyles?: QuizImageStyle[],
): ResolvedCandidateStyles {
  const req = requested ?? candidateStyle ?? "mixed";
  const availableStyles = channelStyles && channelStyles.length > 0 ? channelStyles : ALL_QUIZ_IMAGE_STYLES;
  const resolved: QuizImageStyle =
    req === "mixed" ? availableStyles[Math.floor(Math.random() * availableStyles.length)] || "pixar_3d" : req;
  return { requestedStyle: req, resolvedStyle: resolved };
}
