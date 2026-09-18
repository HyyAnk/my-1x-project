import { randomUUID } from "node:crypto";
import type { GenerateShortReelRequest, ReelKey, ShortReelRecord } from "@studio/shared";
import type { RepositoryService } from "../../repository/service.js";
import { PackageServiceError, runPackageAttempt } from "../packageAttempt.js";
import { generateReelStyleReferences } from "../styleImageService.js";
import type { PlannedReelStage, ReelGenerationDependencies } from "../generation.types.js";
import type { ProgressEmitter } from "./stageTypes.js";

/**
 * Executes the style references stage of short-reel generation.
 */
export async function executeStyleStage(
  repository: RepositoryService,
  key: ReelKey,
  currentRecord: ShortReelRecord,
  plan: PlannedReelStage[],
  request: GenerateShortReelRequest,
  dependencies: ReelGenerationDependencies,
  emit: ProgressEmitter,
): Promise<ShortReelRecord> {
  const styleStage = plan.find((s) => s.stage === "style");
  if (!styleStage) return currentRecord;

  if (dependencies.signal.aborted) {
    await emit("style", "cancelled", "Style generation cancelled.");
    throw new PackageServiceError("CANCELLED", "Style generation cancelled.");
  }

  if (styleStage.action === "reuse") {
    const current = await repository.getShortReel(key);
    await emit("style", "completed", "Reusing current style references.", current.revision);
    return current;
  }

  await emit("style", "running", "Generating style references...");
  const styleOpId = `style-${randomUUID()}`;
  try {
    const updated = await runPackageAttempt(repository, key, "references", styleOpId, async (snapshot) => {
      return generateReelStyleReferences(repository, key, snapshot, dependencies.imageClient, styleOpId, dependencies.signal);
    });
    await emit("style", "completed", "Style references accepted.", updated.revision);
    return updated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Style generation failed.";
    await emit("style", "failed", msg);
    if (plan.some((s) => s.stage === "cover")) {
      await emit("cover", "skipped", "Cover generation skipped due to style generation failure.");
    }
    throw error;
  }
}
