import type { MascotRenderAspectRatio } from "@studio/shared";
import { visualChoicesThreeBaseStyles } from "./visualChoicesThreeBaseStyles.js";
import { visualChoicesThreeAnimationStyles } from "./visualChoicesThreeAnimationStyles.js";

export function visualChoicesThreeStyles(aspectRatio?: MascotRenderAspectRatio): string {
  return `${visualChoicesThreeBaseStyles(aspectRatio)}\n${visualChoicesThreeAnimationStyles(aspectRatio)}`;
}

export { visualChoicesThreeBaseStyles, visualChoicesThreeAnimationStyles };
