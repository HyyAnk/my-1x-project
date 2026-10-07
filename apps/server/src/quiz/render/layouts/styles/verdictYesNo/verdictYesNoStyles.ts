import type { MascotRenderAspectRatio } from "@studio/shared";
import { verdictBinaryAnimationStyles, verdictBinaryBaseStyles, verdictBinaryButtonStyles } from "../verdictBinary/index.js";

/**
 * Returns the composed CSS styles for the Verdict Yes/No layout.
 */
export function verdictYesNoCss(aspectRatio?: MascotRenderAspectRatio): string {
  return [
    verdictBinaryBaseStyles("layout-verdict_yes_no", aspectRatio),
    verdictBinaryButtonStyles("layout-verdict_yes_no"),
    verdictBinaryAnimationStyles("layout-verdict_yes_no"),
  ].join("");
}
