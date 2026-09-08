import type { MascotRenderAspectRatio } from "@studio/shared";
import { clueDeductionAnimationStyles } from "./clueDeduction/clueDeductionAnimationStyles.js";
import { clueDeductionBaseStyles } from "./clueDeduction/clueDeductionBaseStyles.js";
import { clueDeductionChoiceStyles } from "./clueDeduction/clueDeductionChoiceStyles.js";
import { clueDeductionEvidenceStyles } from "./clueDeduction/clueDeductionEvidenceStyles.js";
import { clueDeductionPhaseStyles } from "./clueDeduction/clueDeductionPhaseStyles.js";
import { clueDeductionPortraitStyles } from "./clueDeduction/clueDeductionPortraitStyles.js";
import { clueDeductionStageStyles } from "./clueDeduction/clueDeductionStageStyles.js";

/**
 * Returns the CSS styles for the Clue Deduction layout by composing the
 * focused block generators. The concatenation preserves the exact byte
 * layout of the original monolithic template literal.
 */
export function getClueDeductionCss(aspectRatio: MascotRenderAspectRatio): string {
  return [
    clueDeductionBaseStyles(),
    clueDeductionStageStyles(),
    clueDeductionEvidenceStyles(),
    clueDeductionChoiceStyles(),
    clueDeductionPhaseStyles(),
    clueDeductionAnimationStyles(),
    `
/* --- Portrait 9:16 Fallback Guardrail (BUG-CD-10) --- */
${clueDeductionPortraitStyles(aspectRatio)}`,
  ].join("");
}
