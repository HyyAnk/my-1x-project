import { canonicalJsonStringify, ShortReelEditCommandSchema, type ReelKey, type ShortReelRecord } from "@studio/shared";
import type { RepositoryService } from "../repository/service.js";
import { mutateShortReelRecord } from "../repository/shortReelTransaction.js";
import { applyShortReelEdit } from "../repository/shortReelEdits.js";
import { requireCompleteShortReelSource } from "../repository/shortReelSourcePolicy.js";
import { compileFlowPrompts } from "./flowPromptCompiler.js";
import { computeDependencyFingerprint, type DeliverableUnitKey } from "./dependencyPolicy.js";
import type { ScriptGenerationErrorCode } from "./scriptProvider.js";
import { RepositoryError } from "../repository/errors.js";
import { extractShortReelDisplayProjection, loadShortReelLocalizationArtifact } from "../quiz/bank/localization/productLocalization.js";

export interface UnitAttemptInfo {
  operationId: string;
  dependencyFingerprint: string;
}

export type AcceptResult =
  | {
      accepted: true;
      record: ShortReelRecord;
    }
  | {
      accepted: false;
      reason: "CANCELLED" | "SUPERSEDED_OPERATION" | "STALE_DEPENDENCY" | "VALIDATION_FAILED";
      detail?: string;
      record: ShortReelRecord;
    };

/**
 * Validates, records and applies a generated unit deliverable to the Short-Reel record.
 * Rejects application if the attempt was cancelled, superseded by another attempt,
 * or if upstream dependencies changed during execution.
 * Executes under the repository record queue shared with edits and cancellation.
 */
export async function acceptReelUnitResult(
  repository: RepositoryService,
  key: ReelKey,
  unitKey: DeliverableUnitKey,
  attempt: UnitAttemptInfo,
  payload: unknown,
): Promise<AcceptResult> {
  let reason: "CANCELLED" | "SUPERSEDED_OPERATION" | "STALE_DEPENDENCY" | "VALIDATION_FAILED" | undefined;
  const localization = unitKey === "script" ? await loadShortReelLocalizationArtifact(repository, key.channel_id, key.reel_id) : null;
  const record = await mutateShortReelRecord(repository, key, (current) => {
    const unit = current.units[unitKey];
    if (unit.state === "cancelled") {
      reason = "CANCELLED";
      return null;
    }
    if (
      !unit.current_attempt ||
      unit.current_attempt.operation_id !== attempt.operationId ||
      (unit.state !== "pending" && unit.state !== "ready")
    ) {
      reason = "SUPERSEDED_OPERATION";
      return null;
    }
    requireCompleteShortReelSource(current.source);
    const registeredAttempt = unit.current_attempt;
    const scriptPayload = typeof payload === "object" && payload !== null && "script" in payload ? payload.script : payload;
    const displayProjection = unitKey === "script" ? extractShortReelDisplayProjection(current.source, localization) : undefined;
    const parsedCommand = ShortReelEditCommandSchema.safeParse(
      unitKey === "script"
        ? { kind: "update_script", script: scriptPayload, display_projection: displayProjection }
        : unitKey === "references"
          ? { kind: "update_references", references: payload }
          : unitKey === "cover"
            ? { kind: "update_cover", cover: payload }
            : { kind: "update_publishing", publishing: payload },
    );
    if (!parsedCommand.success) {
      reason = "VALIDATION_FAILED";
      return null;
    }
    const command = parsedCommand.data;
    if (registeredAttempt.dependency_fingerprint !== attempt.dependencyFingerprint) {
      reason = "STALE_DEPENDENCY";
      return null;
    }
    if (registeredAttempt.completed_at && unit.state === "ready") {
      const prior = unitKey === "script" ? current.script : unit.last_accepted_payload;
      const proposed = unitKey === "script" ? scriptPayload : payload;
      if (canonicalJsonStringify(prior) !== canonicalJsonStringify(proposed)) {
        reason = "SUPERSEDED_OPERATION";
      }
      return null;
    }
    if (computeDependencyFingerprint(unitKey, current) !== attempt.dependencyFingerprint) {
      reason = "STALE_DEPENDENCY";
      return null;
    }
    try {
      applyShortReelEdit(current, command);
    } catch (error) {
      if (!(error instanceof RepositoryError) || error.code !== "INVALID_SCRIPT") throw error;
      reason = "VALIDATION_FAILED";
      return null;
    }
    if (unitKey === "script" && current.script && current.units.script.last_accepted_payload) {
      current.units.script.last_accepted_payload.compiled_prompts = compileFlowPrompts(current.script, undefined, current.model_note);
    }
    unit.current_attempt = { ...registeredAttempt, completed_at: new Date().toISOString() };
    return current;
  });
  return reason ? { accepted: false, reason, record } : { accepted: true, record };
}

/** Persist attempt identity before provider dispatch; same identity is an idempotent replay. */
export async function beginReelUnitAttempt(
  repository: RepositoryService,
  key: ReelKey,
  unitKey: DeliverableUnitKey,
  operationId: string,
): Promise<ShortReelRecord> {
  return mutateShortReelRecord(repository, key, (record) => {
    requireCompleteShortReelSource(record.source);
    const unit = record.units[unitKey];
    if (unit.current_attempt?.operation_id === operationId) return null;
    unit.state = "pending";
    unit.current_attempt = {
      operation_id: operationId,
      dependency_fingerprint: computeDependencyFingerprint(unitKey, record),
      started_at: new Date().toISOString(),
      completed_at: null,
      error: null,
    };
    return record;
  });
}

/** A late cancel never retroactively marks accepted output cancelled. */
export async function cancelReelUnitAttempt(
  repository: RepositoryService,
  key: ReelKey,
  unitKey: DeliverableUnitKey,
  operationId: string,
): Promise<ShortReelRecord> {
  return mutateShortReelRecord(repository, key, (record) => {
    const unit = record.units[unitKey];
    if (unit.state !== "pending" || unit.current_attempt?.operation_id !== operationId) return null;
    unit.state = "cancelled";
    unit.current_attempt.completed_at = new Date().toISOString();
    return record;
  });
}

/** Store only safe structured failure codes and preserve the last accepted payload. */
export async function failReelUnitAttempt(
  repository: RepositoryService,
  key: ReelKey,
  unitKey: DeliverableUnitKey,
  operationId: string,
  code: ScriptGenerationErrorCode,
): Promise<ShortReelRecord> {
  return mutateShortReelRecord(repository, key, (record) => {
    const unit = record.units[unitKey];
    if (unit.state !== "pending" || unit.current_attempt?.operation_id !== operationId) return null;
    unit.state = code === "ABORTED" ? "cancelled" : "failed";
    unit.current_attempt.completed_at = new Date().toISOString();
    unit.current_attempt.error = code;
    return record;
  });
}
