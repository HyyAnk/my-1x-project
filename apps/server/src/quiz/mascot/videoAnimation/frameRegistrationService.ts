import type { AnimationStorageAdapter } from "./adapters/animationStorageAdapter.js";
import {
  computeRegistrationFromGeometry,
  loadAttemptFrameGeometries,
  type ComputeAttemptRegistrationParams,
  type FrameRegistrationService,
  type SequenceRegistrationResult,
} from "./registration/index.js";

export * from "./registration/index.js";

/**
 * Creates FrameRegistrationService coordinating disk frame loading and
 * geometric sequence registration calculations.
 */
export function createFrameRegistrationService(storageAdapter: AnimationStorageAdapter): FrameRegistrationService {
  async function computeAttemptRegistration(params: ComputeAttemptRegistrationParams): Promise<SequenceRegistrationResult> {
    const { frameGeometries, targetCount } = await loadAttemptFrameGeometries(storageAdapter, params);

    return computeRegistrationFromGeometry({
      frames: frameGeometries,
      expectedFrameCount: targetCount,
    });
  }

  return {
    computeRegistrationFromGeometry,
    computeAttemptRegistration,
  };
}
