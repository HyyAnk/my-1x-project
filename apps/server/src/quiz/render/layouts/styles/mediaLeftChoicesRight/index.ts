import type { MascotRenderAspectRatio } from "@studio/shared";
import { mediaLeftChoicesRightBaseStyles } from "./mediaLeftChoicesRightBaseStyles.js";
import { mediaLeftChoicesRightAnimationStyles } from "./mediaLeftChoicesRightAnimationStyles.js";

export function mediaLeftChoicesRightStyles(aspectRatio?: MascotRenderAspectRatio): string {
  return `${mediaLeftChoicesRightBaseStyles(aspectRatio)}\n${mediaLeftChoicesRightAnimationStyles(aspectRatio)}`;
}

export { mediaLeftChoicesRightBaseStyles, mediaLeftChoicesRightAnimationStyles };
