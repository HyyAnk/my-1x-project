import type { QuizConfig } from "@studio/shared";

/** Resolve gameplay separately from prompt wording; legacy image guessing remains supported. */
export function resolveQuizPromptGameplay(config?: QuizConfig) {
  const layout = config?.target_layout;
  const archetype = config?.archetype;
  const isVersus = layout === "split_versus_two" || archetype === "versus_faceoff";
  const isMystery =
    layout === "mystery_reveal" ||
    archetype === "mystery_reveal" ||
    (!archetype && (!layout || layout === "auto") && config?.quiz_format === "image_guess");
  const isYesNo =
    !isMystery &&
    !isVersus &&
    (config?.quiz_format === "yes_no" || archetype === "verdict_yes_no" || layout === "verdict_yes_no");
  const isTrueFalse = !isMystery && !isVersus && !isYesNo && config?.quiz_format === "true_false";
  const questionFormat = isMystery
    ? "image_guess"
    : isVersus
      ? "multiple_choice"
      : isYesNo
        ? "yes_no"
        : config?.quiz_format === "knowledge"
          ? "multiple_choice"
          : (config?.quiz_format ?? "multiple_choice");
  return { isVersus, isMystery, isYesNo, isTrueFalse, questionFormat };
}
