import type { AllocatedSlot } from "../bankTopicAllocation.js";
import type { CandidateSupportingCopy } from "./candidateFieldValidator.js";

/** Matches the label the topic card already shows when no potential estimate is available. */
export const DEFAULT_ESTIMATED_POTENTIAL = "Normal";

/**
 * Describes a source-backed slot from facts the server already knows, so the model only spends
 * output on the creative copy (title, premise, hook).
 */
export function deriveSlotSupportingCopy(slot: AllocatedSlot): CandidateSupportingCopy {
  const questionLabel = slot.questionCount === 1 ? "question" : "questions";
  const themeNote = slot.isKeySteered ? ", steered toward the requested theme" : "";
  return {
    whyItFits: `Built from ${slot.questionCount} approved ${slot.domainTitle} ${questionLabel} in the Question Bank${themeNote}.`,
    estimatedPotential: DEFAULT_ESTIMATED_POTENTIAL,
  };
}
