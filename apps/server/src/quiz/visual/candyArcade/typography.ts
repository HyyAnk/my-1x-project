import type { QuizLayoutId } from "@studio/shared";
import type { TextLayout, TextTier } from "../types.js";

export type TextLayoutOptions = {
  hasMascot?: boolean;
  layoutId?: QuizLayoutId | "baseline";
};

type ChoiceTextTier = Exclude<TextTier, "ultra_short">;

/**
 * Resolves the typography tier for question or choice text.
 * The canonical default geometry is the Mascot-Ready 1420px grid, where `hasMascot` defaults
 * to `true` when `options` or `options.hasMascot` is omitted or undefined.
 * Explicit `hasMascot: false` or `hasMascot: true` is preserved for backward compatibility
 * and dual-boundary characterization testing.
 */
export function textTier(value: string, role: "question", options?: TextLayoutOptions | boolean): TextTier;
export function textTier(value: string, role: "choice", options?: TextLayoutOptions | boolean): ChoiceTextTier;
export function textTier(value: string, role: "question" | "choice", options?: TextLayoutOptions | boolean): TextTier;
export function textTier(value: string, role: "question" | "choice", options?: TextLayoutOptions | boolean): TextTier {
  const hasMascot = typeof options === "boolean" ? options : (options?.hasMascot ?? true);
  const length = [...value.trim()].length;
  if (role === "question") {
    const limits = hasMascot ? [22, 44, 76, 125, 165] : [28, 50, 85, 135, 176];
    if (length <= limits[0]) return "ultra_short";
    if (length <= limits[1]) return "short";
    if (length <= limits[2]) return "medium";
    if (length <= limits[3]) return "long";
    if (length <= limits[4]) return "very_long";
    return "overflow";
  }
  const limits = hasMascot ? [10, 22, 40, 60] : [18, 34, 58, 82];
  if (length <= limits[0]) return "short";
  if (length <= limits[1]) return "medium";
  if (length <= limits[2]) return "long";
  if (length <= limits[3]) return "very_long";
  return "overflow";
}

/**
 * Calculates typography layout, font sizing, line height, and line clamping for question or choice text.
 * The canonical default geometry is the Mascot-Ready 1420px grid, where `hasMascot` defaults
 * to `true` when `options` or `options.hasMascot` is omitted or undefined.
 * Explicit `hasMascot: false` or `hasMascot: true` is preserved for backward compatibility
 * and dual-boundary characterization testing.
 */
export function textLayout(value: string, role: "question" | "choice", options?: TextLayoutOptions | boolean): TextLayout {
  const hasMascot = typeof options === "boolean" ? options : (options?.hasMascot ?? true);
  if (role === "question") {
    const tier = textTier(value, role, options);
    const questionOptions = hasMascot
      ? ({
          ultra_short: [70, 1.12, 1],
          short: [60, 1.15, 2],
          medium: [50, 1.18, 2],
          long: [42, 1.2, 2],
          very_long: [35, 1.22, 2],
          overflow: [30, 1.24, 2],
        } as const)
      : ({
          ultra_short: [74, 1.12, 1],
          short: [64, 1.15, 2],
          medium: [54, 1.18, 2],
          long: [45, 1.2, 2],
          very_long: [38, 1.22, 2],
          overflow: [32, 1.24, 2],
        } as const);
    const [fontSize, lineHeight, maxLines] = questionOptions[tier];
    return { tier, fontSize, lineHeight, maxLines, fits: tier !== "overflow" };
  }
  const tier = textTier(value, role, options);
  const choiceOptions = hasMascot
    ? {
        short: [28, 1.1, 2],
        medium: [24, 1.12, 2],
        long: [21, 1.15, 3],
        very_long: [18, 1.16, 3],
        overflow: [18, 1.16, 3],
      }
    : {
        short: [34, 1.1, 2],
        medium: [30, 1.12, 2],
        long: [26, 1.15, 3],
        very_long: [24, 1.16, 3],
        overflow: [24, 1.16, 3],
      };
  const [fontSize, lineHeight, maxLines] = choiceOptions[tier];
  return { tier, fontSize, lineHeight, maxLines, fits: tier !== "overflow" };
}
