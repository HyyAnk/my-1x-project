import type { GenerateShortReelRequest, ReelKey, ShortReelRecord } from "@studio/shared";
import type { RepositoryService } from "../../repository/service.js";
import { PackageServiceError } from "../packageAttempt.js";
import { planReelGeneration } from "../generationPlan.js";
import { resolveMascotReference } from "../mascotReferenceService.js";
import { adoptVisualContext } from "../visualContextService.js";
import type { PlannedReelStage, ReelGenerationDependencies } from "../generation.types.js";
import { GenerationError } from "../generationErrors.js";
import type { ProgressEmitter } from "./stageTypes.js";

/**
 * Validates dependencies required for the planned generation stages.
 */
export async function validatePreflight(
  record: ShortReelRecord,
  plan: PlannedReelStage[],
  dependencies: ReelGenerationDependencies,
  emit: ProgressEmitter,
): Promise<void> {
  const willRunScript = plan.some((s) => s.stage === "script" && s.action === "run");
  const willRunPublishing = plan.some((s) => s.stage === "publishing" && s.action === "run");
  const willRunStyle = plan.some((s) => s.stage === "style" && s.action === "run");
  const willRunCover = plan.some((s) => s.stage === "cover" && s.action === "run");

  if (willRunScript || willRunPublishing) {
    if (!dependencies.llmClient) {
      await emit("preflight", "failed", "LLM client is not configured or unavailable.", record.revision);
      throw new PackageServiceError("VALIDATION_FAILED", "LLM client is not configured or unavailable.");
    }
  }

  if (willRunStyle || willRunCover) {
    if (!dependencies.imageClient) {
      await emit("preflight", "failed", "Image client is not configured or unavailable.", record.revision);
      throw new PackageServiceError("VALIDATION_FAILED", "Image generation client is not configured.");
    }
    if (!dependencies.imageClient.supportsReferenceImage) {
      await emit("preflight", "failed", "Configured image client does not support reference images.", record.revision);
      throw new PackageServiceError("VALIDATION_FAILED", "Configured image client does not support reference images.");
    }
  }

  await emit("preflight", "completed", "Prerequisites verified.", record.revision);
}

/**
 * Prepares and adopts visual context when required by the target.
 */
export async function prepareVisualContext(
  repository: RepositoryService,
  key: ReelKey,
  request: GenerateShortReelRequest,
  signal: AbortSignal,
  emit: ProgressEmitter,
): Promise<void> {
  const requiresVisualContext =
    request.target === "package" || request.target === "script" || request.target.startsWith("segment_") || request.target === "references";

  if (!requiresVisualContext) {
    return;
  }

  try {
    const visualContext = await resolveMascotReference(repository, key, signal);
    await adoptVisualContext(repository, key, visualContext);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Channel mascot master image is missing.";
    await emit("preflight", "failed", msg);
    if (error instanceof GenerationError || error instanceof PackageServiceError) {
      throw error;
    }
    throw new PackageServiceError("VALIDATION_FAILED", msg);
  }
}

/**
 * Executes the full preflight stage: visual context preparation, planning, and prerequisite validation.
 */
export async function executePreflightStage(
  repository: RepositoryService,
  key: ReelKey,
  request: GenerateShortReelRequest,
  dependencies: ReelGenerationDependencies,
  emit: ProgressEmitter,
): Promise<{ record: ShortReelRecord; plan: PlannedReelStage[] }> {
  await emit("preflight", "running", "Checking generation prerequisites...");

  await prepareVisualContext(repository, key, request, dependencies.signal, emit);

  const record = await repository.getShortReel(key);
  let plan: PlannedReelStage[];
  try {
    plan = planReelGeneration(record, request);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Validation failed during generation planning.";
    await emit("preflight", "failed", msg, record.revision);
    throw error;
  }

  await validatePreflight(record, plan, dependencies, emit);

  return { record, plan };
}
