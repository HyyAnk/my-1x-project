import type { MascotRenderAspectRatio } from "@studio/shared";
import { mysteryRevealAnimationStyles } from "./mysteryReveal/mysteryRevealAnimationStyles.js";
import { mysteryRevealBaseStyles } from "./mysteryReveal/mysteryRevealBaseStyles.js";
import { mysteryRevealChoiceStyles } from "./mysteryReveal/mysteryRevealChoiceStyles.js";
import { mysteryRevealPhaseStyles } from "./mysteryReveal/mysteryRevealPhaseStyles.js";
import { mysteryRevealPortraitStyles } from "./mysteryReveal/mysteryRevealPortraitStyles.js";
import { mysteryRevealRevealMotionStyles } from "./mysteryReveal/mysteryRevealRevealMotionStyles.js";
import { mysteryRevealStageStyles } from "./mysteryReveal/mysteryRevealStageStyles.js";

/**
 * Returns the CSS styles for the Mystery Reveal layout by composing the
 * focused block generators. The concatenation preserves the exact byte
 * layout of the original monolithic template literal.
 */
export function getMysteryRevealCss(aspectRatio: MascotRenderAspectRatio): string {
  return [
    mysteryRevealBaseStyles(),
    mysteryRevealStageStyles(),
    mysteryRevealRevealMotionStyles(),
    mysteryRevealChoiceStyles(),
    mysteryRevealPhaseStyles(),
    mysteryRevealAnimationStyles(),
    `
/* --- Portrait 9:16 Fallback Guardrail (BUG-MR-09) --- */
${mysteryRevealPortraitStyles(aspectRatio)}`,
  ].join("");
}
