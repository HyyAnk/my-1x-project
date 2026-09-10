import type { ReelKey, ReelVisualContext, ShortReelRecord } from "@studio/shared";
import type { RepositoryService } from "../repository/service.js";
import { mutateShortReelRecord } from "../repository/shortReelTransaction.js";

/**
 * Adopts a resolved ReelVisualContext into the ShortReelRecord via atomic record mutation.
 * - Identical fingerprint is a no-op (zero disk writes, zero revision bump).
 * - Changed visual context invalidates script, references, and cover (marking ready states as stale),
 *   retires conflicting attempts, preserves previous accepted payloads, and leaves publishing intact.
 */
export async function adoptVisualContext(
  repository: RepositoryService,
  key: ReelKey,
  context: ReelVisualContext,
): Promise<ShortReelRecord> {
  return mutateShortReelRecord(repository, key, (current) => {
    if (current.visual_context?.fingerprint === context.fingerprint) {
      return null; // No-op: exact same visual context
    }

    const hadPriorContext = current.visual_context !== null;
    current.visual_context = context;

    // Per Dependency Matrix: Mascot identity / master / art direction changes mark script, references, and cover stale
    // Initial adoption of visual context on a newly created reel does not invalidate ready units
    if (hadPriorContext) {
      const affectedUnits = ["script", "references", "cover"] as const;
      for (const unitKey of affectedUnits) {
        const unit = current.units[unitKey];
        if (unit.state === "ready") {
          unit.state = "stale";
        }
        // If an active in-flight attempt exists, retire it
        if (unit.current_attempt && !unit.current_attempt.completed_at) {
          unit.current_attempt.completed_at = new Date().toISOString();
          unit.current_attempt.error = "STALE_DEPENDENCY";
          unit.current_attempt.error_message = "Visual context changed; retiring in-flight attempt.";
          unit.current_attempt.retryable = false;
        }
      }
    }

    return current;
  });
}
