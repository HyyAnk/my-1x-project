import { randomUUID } from "node:crypto";
import type { GenerateShortReelRequest, ReelKey, ShortReelRecord } from "@studio/shared";
import type { RepositoryService } from "../../repository/service.js";
import { PackageServiceError, runPackageAttempt } from "../packageAttempt.js";
import { generateReelPublishing } from "../publishingService.js";
import { loadShortReelLocalizationArtifact } from "../../quiz/bank/localization/productLocalization.js";
import type { PlannedReelStage, ReelGenerationDependencies } from "../generation.types.js";
import type { ProgressEmitter } from "./stageTypes.js";

/**
 * Executes the publishing metadata stage of short-reel generation.
 */
export async function executePublishingStage(
  repository: RepositoryService,
  key: ReelKey,
  currentRecord: ShortReelRecord,
  plan: PlannedReelStage[],
  request: GenerateShortReelRequest,
  dependencies: ReelGenerationDependencies,
  emit: ProgressEmitter,
): Promise<ShortReelRecord> {
  const publishingStage = plan.find((s) => s.stage === "publishing");
  if (!publishingStage) return currentRecord;

  if (dependencies.signal.aborted) {
    await emit("publishing", "cancelled", "Publishing generation cancelled.");
    throw new PackageServiceError("CANCELLED", "Publishing generation cancelled.");
  }

  if (publishingStage.action === "reuse") {
    const current = await repository.getShortReel(key);
    await emit("publishing", "completed", "Reusing current publishing copy.", current.revision);
    return current;
  }

  await emit("publishing", "running", "Generating publishing copy...");
  const pubOpId = `publishing-${randomUUID()}`;
  try {
    const updated = await runPackageAttempt(repository, key, "publishing", pubOpId, async (snapshot) => {
      const localization = await loadShortReelLocalizationArtifact(repository, key.channel_id, key.reel_id);
      return generateReelPublishing(snapshot, {
        llmClient: dependencies.llmClient,
        signal: dependencies.signal,
        localization,
      });
    });
    await emit("publishing", "completed", "Publishing copy accepted.", updated.revision);
    return updated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Publishing generation failed.";
    await emit("publishing", "failed", msg);
    throw error;
  }
}
