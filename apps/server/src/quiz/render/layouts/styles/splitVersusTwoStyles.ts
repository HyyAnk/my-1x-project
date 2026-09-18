import type { MascotRenderAspectRatio } from "@studio/shared";
import { splitVersusTwoAnimationStyles } from "./splitVersusTwo/splitVersusTwoAnimationStyles.js";
import { splitVersusTwoBaseStyles } from "./splitVersusTwo/splitVersusTwoBaseStyles.js";
import { splitVersusTwoChoiceStyles } from "./splitVersusTwo/splitVersusTwoChoiceStyles.js";

/**
 * Returns the CSS styles for the Split Versus Two layout (16:9 Landscape Video, 1920×1080).
 */
export function splitVersusTwoCss(aspectRatio?: MascotRenderAspectRatio): string {
  return [splitVersusTwoBaseStyles(aspectRatio), splitVersusTwoChoiceStyles(), splitVersusTwoAnimationStyles()].join("");
}

/**
 * Backwards compatibility alias for splitVersusTwoCss.
 */
export const getSplitVersusTwoCss = splitVersusTwoCss;
