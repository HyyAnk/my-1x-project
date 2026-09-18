import fs from "node:fs/promises";
import path from "node:path";
import {
  ANIMATION_STATES,
  isValidSlotStateTransition,
  MascotAnimationRevisionSchema,
  SLOTS_PER_STATE,
  type AnimationState,
  type MascotAnimationRevision,
  type MascotSlotProjection,
  type MascotSlotState,
  type MascotVideoProcessingJob,
} from "@studio/shared";
import { sanitizeIdentifier } from "../adapters/animationStorageAdapter.js";
import { InvalidStateTransitionError, StaleCompletionError } from "../errors/videoProcessingErrors.js";

export type SlotProjection = MascotSlotProjection;

/**
 * Builds a standardized cache/lookup key for a mascot slot.
 */
export function makeSlotKey(mascotId: string, styleId: string, state: AnimationState, slotIndex: number): string {
  return `${sanitizeIdentifier(mascotId)}:${sanitizeIdentifier(styleId)}:${state}:${slotIndex}`;
}

/**
 * Resolves the filesystem path for persisted slot projections state file.
 */
export function getSlotFilePath(storageRoot: string, mascotId: string, styleId: string): string {
  const safeMascot = sanitizeIdentifier(mascotId);
  const safeStyle = sanitizeIdentifier(styleId);
  return path.join(storageRoot, "mascots", safeMascot, "animations", safeStyle, "video_processing_state.json");
}

/**
 * Creates a default empty slot projection fallback.
 */
export function createDefaultSlotProjection(styleId: string, state: AnimationState, slotIndex: number): MascotSlotProjection {
  return {
    style_id: styleId,
    state,
    slot_index: slotIndex,
    status: "empty",
    updated_at: new Date().toISOString(),
  };
}

/**
 * Enumerates all default slot projections for a given style across all states and slots.
 */
export function buildAllDefaultSlotProjections(styleId: string): MascotSlotProjection[] {
  const projections: MascotSlotProjection[] = [];
  for (const state of ANIMATION_STATES) {
    for (let slot = 1; slot <= SLOTS_PER_STATE; slot += 1) {
      projections.push(createDefaultSlotProjection(styleId, state, slot));
    }
  }
  return projections;
}

/**
 * Computes an updated slot projection when a job is scheduled or saved.
 */
export function applyJobToSlotProjection(current: MascotSlotProjection, job: MascotVideoProcessingJob): MascotSlotProjection {
  return {
    ...current,
    active_job_id: job.id,
    active_attempt: job.attempt,
    source_video_url: job.source_video_url,
    source_video_fingerprint: job.source_video_fingerprint,
    updated_at: job.updated_at ?? new Date().toISOString(),
  };
}

/**
 * Validates and maps a slot state transition according to the slot state machine.
 */
export function applyStateTransition(current: MascotSlotProjection, toState: MascotSlotState, jobId?: string): MascotSlotProjection {
  if (current.status !== toState && !isValidSlotStateTransition(current.status, toState)) {
    throw new InvalidStateTransitionError(
      current.status,
      toState,
      `Invalid state transition for slot ${current.state}:${current.slot_index} from "${current.status}" to "${toState}"`,
    );
  }

  return {
    ...current,
    status: toState,
    active_job_id: jobId ?? current.active_job_id,
    active_revision_id: current.active_revision_id,
    active_revision: current.active_revision,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Computes slot projection update upon successful revision creation,
 * validating against stale attempts and updating approved revision state.
 */
export function applyActiveRevision(
  current: MascotSlotProjection,
  attemptId: number,
  revision: MascotAnimationRevision,
): MascotSlotProjection {
  if (current.active_attempt !== undefined && current.active_attempt !== null && attemptId < current.active_attempt) {
    throw new StaleCompletionError(attemptId, current.active_attempt);
  }

  const validatedRevision = MascotAnimationRevisionSchema.parse(revision);

  return {
    ...current,
    status: "ready",
    active_attempt: attemptId,
    active_revision_id: validatedRevision.id,
    active_revision: validatedRevision,
    error_code: null,
    error_message: null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Computes slot projection update upon attempt failure, defending approved revisions
 * and guarding against stale attempt completions.
 */
export function applyAttemptFailure(
  current: MascotSlotProjection,
  attemptId: number,
  error: { code?: string; message?: string },
  qaFailed = false,
): MascotSlotProjection {
  if (current.active_attempt !== undefined && current.active_attempt !== null && attemptId < current.active_attempt) {
    return { ...current };
  }

  if (current.active_revision_id) {
    return {
      ...current,
      status: "ready",
      error_code: error.code ?? null,
      error_message: error.message ?? null,
      updated_at: new Date().toISOString(),
    };
  }

  const newStatus: MascotSlotState = qaFailed ? "qa_failed" : "failed";
  return {
    ...current,
    status: newStatus,
    error_code: error.code ?? null,
    error_message: error.message ?? null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Collates and sorts revisions chronologically by attempt number.
 */
export function collateRevisions(revisions: MascotAnimationRevision[]): MascotAnimationRevision[] {
  return [...revisions].sort((a, b) => a.attempt - b.attempt);
}

/**
 * Reads, validates, and collates all stored revision files from a slot's revision directory.
 */
export async function readRevisionsFromDirectory(revisionsDir: string): Promise<MascotAnimationRevision[]> {
  try {
    const files = await fs.readdir(revisionsDir);
    const revFiles = files.filter((f) => f.startsWith("rev_") && f.endsWith(".json"));
    const revisions: MascotAnimationRevision[] = [];
    for (const f of revFiles) {
      try {
        const raw = await fs.readFile(path.join(revisionsDir, f), "utf8");
        const parsed: unknown = JSON.parse(raw);
        const validated = MascotAnimationRevisionSchema.parse(parsed);
        revisions.push(validated);
      } catch {
        // Skip corrupted or unreadable revision files
      }
    }
    return collateRevisions(revisions);
  } catch {
    return [];
  }
}
