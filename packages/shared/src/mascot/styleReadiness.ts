import type { MascotStyle } from "../schemas/mascot.js";

export type MascotStyleReadiness = "concept_locked" | "fully_expressive" | "empty";

/**
 * Determines the readiness level of a mascot style:
 * - "empty": no concept anchor and no active state variants
 * - "concept_locked": concept anchor image or partial state variants exist (< 10 per state)
 * - "fully_expressive": all 10 thinking and 10 celebrate slots are fully populated
 */
export function getMascotStyleReadiness(style: MascotStyle | null | undefined): MascotStyleReadiness {
  if (!style) {
    return "empty";
  }

  const thinkingCount = (style.states?.thinking || []).filter((v) => Boolean(v.image_url?.trim())).length;
  const celebrateCount = (style.states?.celebrate || []).filter((v) => Boolean(v.image_url?.trim())).length;

  if (thinkingCount >= 10 && celebrateCount >= 10) {
    return "fully_expressive";
  }

  if (Boolean(style.anchor_image_url?.trim()) || thinkingCount > 0 || celebrateCount > 0) {
    return "concept_locked";
  }

  return "empty";
}
