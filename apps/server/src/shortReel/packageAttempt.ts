import type { ReelKey, ShortReelRecord } from "@studio/shared";
import type { RepositoryService } from "../repository/service.js";
import { beginReelUnitAttempt, acceptReelUnitResult, failReelUnitAttempt, type DeliverableUnitKey } from "./revisionPolicy.js";
import { ScriptGenerationError } from "./scriptProvider.js";
import { ReferenceError } from "./packageImage.js";
import { CoverGenerationError } from "./thumbnailAdapter.js";
import { GenerationError } from "./generationErrors.js";
import { resolveCanonicalStorageRoot } from "../repository/shortReelStorage.js";

export type PackageServiceErrorCode =
  | "SUPERSEDED_OPERATION"
  | "STALE_DEPENDENCY"
  | "VALIDATION_FAILED"
  | "ATTEMPT_FAILED"
  | "CANCELLED"
  | "PENDING_OPERATION"
  | "STATE_WRITE_FAILED";
export class PackageServiceError extends Error {
  constructor(
    public readonly code: PackageServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PackageServiceError";
  }
}
const inFlight = new Map<string, Promise<ShortReelRecord>>();

export function runPackageAttempt(
  repository: RepositoryService,
  key: ReelKey,
  unit: DeliverableUnitKey,
  operationId: string,
  generate: (record: ShortReelRecord) => Promise<unknown>,
): Promise<ShortReelRecord> {
  const id = JSON.stringify([resolveCanonicalStorageRoot(repository.storageRoot), key.channel_id, key.reel_id, unit, operationId]);
  const existing = inFlight.get(id);
  if (existing) return existing;
  const running = execute(repository, key, unit, operationId, generate);
  inFlight.set(id, running);
  void running.then(
    () => inFlight.delete(id),
    () => inFlight.delete(id),
  );
  return running;
}

async function execute(
  repository: RepositoryService,
  key: ReelKey,
  unit: DeliverableUnitKey,
  operationId: string,
  generate: (record: ShortReelRecord) => Promise<unknown>,
): Promise<ShortReelRecord> {
  const root = repository.storageRoot;
  const before = await repository.getShortReel(key);
  if (before.units[unit].current_attempt?.operation_id === operationId) {
    if (before.units[unit].state === "ready") return before;
    throw new PackageServiceError("PENDING_OPERATION", "This operation already exists. Use a new operation ID to retry interrupted work.");
  }
  const started = await beginReelUnitAttempt(repository, key, unit, operationId);
  const attempt = started.units[unit].current_attempt;
  if (!attempt || attempt.operation_id !== operationId) throw new PackageServiceError("SUPERSEDED_OPERATION", "Operation was superseded.");
  try {
    const payload = await generate(started);
    if (repository.storageRoot !== root) throw new PackageServiceError("STALE_DEPENDENCY", "Storage changed during generation.");
    const result = await acceptReelUnitResult(
      repository,
      key,
      unit,
      { operationId, dependencyFingerprint: attempt.dependency_fingerprint },
      payload,
    );
    if (!result.accepted) throw new PackageServiceError(result.reason, "Generated result is no longer current.");
    return result.record;
  } catch (error) {
    const code =
      error instanceof ScriptGenerationError
        ? error.code
        : error instanceof GenerationError
          ? String(error.code)
          : error instanceof PackageServiceError && error.code === "VALIDATION_FAILED"
            ? "VALIDATION_FAILED"
            : "PROVIDER_ERROR";
    if (repository.storageRoot === root) {
      try {
        await failReelUnitAttempt(repository, key, unit, operationId, code);
      } catch {
        throw new PackageServiceError("STATE_WRITE_FAILED", "Could not record package failure. Restore storage access before retrying.");
      }
    }
    if (error instanceof PackageServiceError || error instanceof ScriptGenerationError || error instanceof GenerationError) throw error;
    // Domain errors already carry safe codes; do not forward unknown provider messages or I/O paths.
    if (error instanceof ReferenceError || error instanceof CoverGenerationError) throw error;
    throw new PackageServiceError("ATTEMPT_FAILED", "Package generation failed. Retry the affected unit.");
  }
}
