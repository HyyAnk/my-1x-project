import { ANIMATION_STATES, SLOTS_PER_STATE, TOTAL_ANIMATION_SLOTS, type MascotSlotProjection } from "@studio/shared";
import type { MissingSlotDetail, StyleVideoReadinessResult } from "./rolloutTypes.js";

export class VideoStylePublishGateError extends Error {
  public readonly code = "PUBLISH_GATE_REJECTED";
  public readonly readyCount: number;
  public readonly totalRequired: number;
  public readonly missingSlots: MissingSlotDetail[];

  constructor(
    message: string,
    details: {
      readyCount: number;
      totalRequired: number;
      missingSlots: MissingSlotDetail[];
    },
  ) {
    super(message);
    this.name = "VideoStylePublishGateError";
    this.readyCount = details.readyCount;
    this.totalRequired = details.totalRequired;
    this.missingSlots = details.missingSlots;
  }
}

/**
 * Architectural alias for VideoStylePublishGateError.
 */
export const RolloutGateError = VideoStylePublishGateError;
export type RolloutGateError = VideoStylePublishGateError;

/**
 * Evaluates readiness across all 20 required slots (10 Thinking + 10 Celebrate).
 * A slot is considered ready if and only if its status is "ready" with an active revision.
 */
export function evaluateStyleVideoReadiness(projections: MascotSlotProjection[]): StyleVideoReadinessResult {
  const missingSlots: MissingSlotDetail[] = [];

  let readyCount = 0;
  let failedCount = 0;
  let emptyCount = 0;

  for (const state of ANIMATION_STATES) {
    for (let slot = 1; slot <= SLOTS_PER_STATE; slot += 1) {
      const proj = projections.find((p) => p.state === state && p.slot_index === slot);
      if (proj && proj.status === "ready" && proj.active_revision_id) {
        readyCount += 1;
      } else {
        const currentStatus = proj ? proj.status : "empty";
        if (currentStatus === "qa_failed" || currentStatus === "failed") {
          failedCount += 1;
        } else if (currentStatus === "empty") {
          emptyCount += 1;
        }
        missingSlots.push({
          state,
          slotIndex: slot,
          status: currentStatus,
          errorMessage: proj?.error_message ?? null,
        });
      }
    }
  }

  return {
    eligible: readyCount === TOTAL_ANIMATION_SLOTS && missingSlots.length === 0,
    readyCount,
    totalRequired: TOTAL_ANIMATION_SLOTS,
    failedCount,
    emptyCount,
    missingSlots,
  };
}

/**
 * Validates that style readiness fulfills publish criteria, throwing VideoStylePublishGateError if not.
 */
export function assertStylePublishEligibility(readiness: StyleVideoReadinessResult): void {
  if (!readiness.eligible) {
    const missingDetails = readiness.missingSlots.map((s) => `${s.state}[${s.slotIndex}]:${s.status}`).join(", ");
    throw new VideoStylePublishGateError(
      `Publish gate rejected: only ${readiness.readyCount} of ${readiness.totalRequired} slots are ready. Missing: ${missingDetails}`,
      readiness,
    );
  }
}
