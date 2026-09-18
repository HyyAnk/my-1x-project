import type { GenerateShortReelRequest, ReelKey, ShortReelRecord } from "@studio/shared";
import type { RepositoryService } from "../../repository/service.js";
import type { PlannedReelStage, ReelGenerationDependencies } from "../generation.types.js";
import type { ProgressEmitter } from "./stageTypes.js";
import { executeStyleStage } from "./styleStage.js";
import { executeCoverStage } from "./coverStage.js";

export type { ProgressEmitter } from "./stageTypes.js";
export { validatePreflight, prepareVisualContext, executePreflightStage } from "./preflightStage.js";
export { executeScriptStage } from "./scriptStage.js";
export { executeStyleStage } from "./styleStage.js";
export { executeCoverStage } from "./coverStage.js";
export { executePublishingStage } from "./publishingStage.js";
export { validateFinalDeliverables, executeFinalizeStage } from "./finalizeStage.js";

/**
 * Executes the sequential style and cover branch of generation.
 * If style generation fails, cover generation is skipped.
 */
export async function executeStyleAndCoverBranch(
  repository: RepositoryService,
  key: ReelKey,
  currentRecord: ShortReelRecord,
  plan: PlannedReelStage[],
  request: GenerateShortReelRequest,
  dependencies: ReelGenerationDependencies,
  emit: ProgressEmitter,
): Promise<ShortReelRecord> {
  const styleRecord = await executeStyleStage(repository, key, currentRecord, plan, request, dependencies, emit);
  return executeCoverStage(repository, key, styleRecord, plan, request, dependencies, emit);
}
