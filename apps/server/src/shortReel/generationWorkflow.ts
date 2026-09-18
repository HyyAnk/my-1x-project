import type { GenerateShortReelRequest, ReelKey, ShortReelRecord } from "@studio/shared";
import type { RepositoryService } from "../repository/service.js";
import { PackageServiceError } from "./packageAttempt.js";
import type { ReelGenerationDependencies } from "./generation.types.js";
import {
  type ProgressEmitter,
  executePreflightStage,
  executeScriptStage,
  executeStyleAndCoverBranch,
  executePublishingStage,
  executeFinalizeStage,
} from "./stages/index.js";

/**
 * Orchestrates Short-Reel portrait-package generation adhering to the Dependency Matrix.
 * Owns ordering, runs atomic unit-attempt lifecycles, coordinates concurrent branches,
 * and emits structured durable stage progress.
 */
export async function executeWorkflow(
  repository: RepositoryService,
  key: ReelKey,
  request: GenerateShortReelRequest,
  dependencies: ReelGenerationDependencies,
): Promise<ShortReelRecord> {
  const signal = dependencies.signal;
  if (signal.aborted) {
    throw new PackageServiceError("CANCELLED", "Generation cancelled before start.");
  }

  const emit: ProgressEmitter = async (stage, state, message, recordRevision) => {
    try {
      await dependencies.onProgress({ stage, state, message, recordRevision });
    } catch {
      // Progress listener failure must not derail generation
    }
  };

  // 1. Preflight Stage (visual context, planning, prerequisites validation)
  const { record, plan } = await executePreflightStage(repository, key, request, dependencies, emit);

  // 2. Script Stage
  const scriptRecord = await executeScriptStage(repository, key, record, plan, request, dependencies, emit);

  // 3. Concurrent Branches: Style + Cover branch vs Publishing branch
  const branchErrors: unknown[] = [];
  const branchResults = await Promise.allSettled([
    executeStyleAndCoverBranch(repository, key, scriptRecord, plan, request, dependencies, emit),
    executePublishingStage(repository, key, scriptRecord, plan, request, dependencies, emit),
  ]);

  for (const result of branchResults) {
    if (result.status === "rejected") {
      branchErrors.push(result.reason);
    }
  }

  // 4. Finalize Stage (validation of deliverables & error checks)
  return executeFinalizeStage(repository, key, plan, dependencies, branchErrors, emit);
}

/**
 * Alias for executeWorkflow preserving backwards compatibility with existing consumers.
 */
export const executeReelGeneration = executeWorkflow;

// Re-export stage executors, validators, and types for backwards compatibility
export * from "./stages/index.js";
