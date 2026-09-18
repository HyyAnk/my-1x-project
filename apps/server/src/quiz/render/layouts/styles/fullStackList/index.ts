import type { MascotRenderAspectRatio } from "@studio/shared";
import { fullStackListBaseStyles } from "./fullStackListBaseStyles.js";
import { fullStackListAnimationStyles } from "./fullStackListAnimationStyles.js";

export function fullStackListStyles(aspectRatio?: MascotRenderAspectRatio): string {
  return `${fullStackListBaseStyles(aspectRatio)}\n${fullStackListAnimationStyles(aspectRatio)}`;
}

export { fullStackListBaseStyles, fullStackListAnimationStyles };
