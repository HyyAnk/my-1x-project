import type { MascotRenderAspectRatio } from "@studio/shared";
import { visualChoicesThreePureAnimationStyles } from "./visualChoicesThreePureAnimationStyles.js";
import { visualChoicesThreePureBaseStyles } from "./visualChoicesThreePureBaseStyles.js";
import { visualChoicesThreePureCardStyles } from "./visualChoicesThreePureCardStyles.js";

/**
 * Returns the composed CSS styles for the Visual Choices Three Pure layout.
 */
export function visualChoicesThreePureCss(aspectRatio?: MascotRenderAspectRatio): string {
  return [visualChoicesThreePureBaseStyles(aspectRatio), visualChoicesThreePureCardStyles(), visualChoicesThreePureAnimationStyles()].join(
    "",
  );
}
