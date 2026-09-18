import { randomUUID } from "node:crypto";
import type { GenerateShortReelRequest, ReelKey, ShortReelRecord } from "@studio/shared";
import type { RepositoryService } from "../../repository/service.js";
import { PackageServiceError, runPackageAttempt } from "../packageAttempt.js";
import { generateReelCoverPayload } from "../coverImageService.js";
import type { PlannedReelStage, ReelGenerationDependencies } from "../generation.types.js";
import type { ProgressEmitter } from "./stageTypes.js";

/**
 * Executes the cover image stage of short-reel generation.
 */
export async function executeCoverStage(
  repository: RepositoryService,
  key: ReelKey,
  currentRecord: ShortReelRecord,
  plan: PlannedReelStage[],
  request: GenerateShortReelRequest,
  dependencies: ReelGenerationDependencies,
  emit: ProgressEmitter,
): Promise<ShortReelRecord> {
  const coverStage = plan.find((s) => s.stage === "cover");
  if (!coverStage) return currentRecord;

  if (dependencies.signal.aborted) {
    await emit("cover", "cancelled", "Cover generation cancelled.");
    throw new PackageServiceError("CANCELLED", "Cover generation cancelled.");
  }

  if (coverStage.action === "reuse") {
    const current = await repository.getShortReel(key);
    await emit("cover", "completed", "Reusing current cover.", current.revision);
    return current;
  }

  await emit("cover", "running", "Generating cover image...");
  const coverOpId = `cover-${randomUUID()}`;
  try {
    const updated = await runPackageAttempt(repository, key, "cover", coverOpId, async (snapshot) => {
      return generateReelCoverPayload(repository, key, snapshot, dependencies.imageClient, coverOpId, dependencies.signal, {
        llmClient: dependencies.llmClient,
      });
    });
    await emit("cover", "completed", "Cover image accepted.", updated.revision);
    return updated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Cover generation failed.";
    await emit("cover", "failed", msg);
    throw error;
  }
}
