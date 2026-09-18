import type { MascotRenderAspectRatio } from "@studio/shared";
import { verdictTrueFalseAnimationStyles } from "./verdictTrueFalseAnimationStyles.js";
import { verdictTrueFalseBaseStyles } from "./verdictTrueFalseBaseStyles.js";
import { verdictTrueFalseButtonStyles } from "./verdictTrueFalseButtonStyles.js";

/**
 * Returns the composed CSS styles for the Verdict True/False layout.
 */
export function verdictTrueFalseCss(aspectRatio?: MascotRenderAspectRatio): string {
  return [verdictTrueFalseBaseStyles(aspectRatio), verdictTrueFalseButtonStyles(), verdictTrueFalseAnimationStyles()].join("");
}
