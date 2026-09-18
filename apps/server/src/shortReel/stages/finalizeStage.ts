import type { ReelKey, ShortReelRecord } from "@studio/shared";
import type { RepositoryService } from "../../repository/service.js";
import { PackageServiceError } from "../packageAttempt.js";
import type { PlannedReelStage, ReelGenerationDependencies } from "../generation.types.js";
import type { ProgressEmitter } from "./stageTypes.js";

/**
 * Validates the consistency and completeness of all required deliverables in the final record.
 */
export function validateFinalDeliverables(finalRecord: ShortReelRecord): string[] {
  const validationErrors: string[] = [];
  if (
    !finalRecord.script ||
    finalRecord.units.script.state !== "ready" ||
    (finalRecord.stale_segments && finalRecord.stale_segments.length > 0)
  ) {
    validationErrors.push("Script is missing or has stale segments.");
  }

  const references = finalRecord.units.references.last_accepted_payload?.references ?? [];
  const mascotRefs = references.filter((r) => r.role === "mascot");
  const styleRefs = references.filter((r) => r.role === "style");
  if (finalRecord.units.references.state !== "ready" || mascotRefs.length !== 1 || styleRefs.length !== 1) {
    validationErrors.push("References must contain exactly one mascot and one style reference.");
  }

  if (!finalRecord.units.cover.last_accepted_payload || finalRecord.units.cover.state !== "ready") {
    validationErrors.push("Cover is missing or not ready.");
  }

  if (!finalRecord.units.publishing.last_accepted_payload || finalRecord.units.publishing.state !== "ready") {
    validationErrors.push("Publishing is missing or not ready.");
  }

  const compiledPrompts = finalRecord.units.script.last_accepted_payload?.compiled_prompts;
  if (!compiledPrompts || compiledPrompts.length !== 3) {
    validationErrors.push("Compiled prompts are missing or incomplete.");
  }

  return validationErrors;
}

/**
 * Executes final validation and marks generation as complete.
 */
export async function executeFinalizeStage(
  repository: RepositoryService,
  key: ReelKey,
  plan: PlannedReelStage[],
  dependencies: ReelGenerationDependencies,
  branchErrors: unknown[],
  emit: ProgressEmitter,
): Promise<ShortReelRecord> {
  const finalizeStage = plan.find((s) => s.stage === "finalize");
  if (finalizeStage) {
    const finalRecord = await repository.getShortReel(key);

    if (dependencies.signal.aborted) {
      await emit("finalize", "cancelled", "Finalization cancelled.", finalRecord.revision);
      throw new PackageServiceError("CANCELLED", "Generation cancelled.");
    }

    if (branchErrors.length > 0) {
      await emit("finalize", "failed", "Package incomplete: one or more stages failed.", finalRecord.revision);
      const first = branchErrors[0];
      if (first instanceof PackageServiceError) throw first;
      throw new PackageServiceError("ATTEMPT_FAILED", "Some package units failed. Successful units were preserved; retry failed units.");
    }

    await emit("finalize", "running", "Validating final package deliverables...", finalRecord.revision);
    const validationErrors = validateFinalDeliverables(finalRecord);

    if (validationErrors.length > 0) {
      await emit("finalize", "failed", `Partial completion: ${validationErrors.join(" ")}`, finalRecord.revision);
      throw new PackageServiceError("ATTEMPT_FAILED", `Package generation partially failed: ${validationErrors.join(" ")}`);
    }

    await emit("finalize", "completed", "Package complete.", finalRecord.revision);
    return finalRecord;
  }

  if (branchErrors.length > 0) {
    const first = branchErrors[0];
    if (first instanceof PackageServiceError) throw first;
    throw new PackageServiceError("ATTEMPT_FAILED", "Generation failed. Retry the affected unit.");
  }

  return repository.getShortReel(key);
}
