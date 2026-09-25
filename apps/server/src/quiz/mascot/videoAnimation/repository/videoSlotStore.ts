import fs from "node:fs/promises";
import {
  ANIMATION_STATES,
  SLOTS_PER_STATE,
  type AnimationState,
  type MascotAnimationRevision,
  type MascotSlotProjection,
  type MascotSlotState,
  type MascotVideoProcessingJob,
} from "@studio/shared";
import { sanitizeIdentifier } from "../adapters/animationStorageAdapter.js";
import { atomicWriteJson } from "../utils/atomicFs.js";
import {
  applyActiveRevision,
  applyAttemptFailure,
  applyJobToSlotProjection,
  applyStateTransition,
  createDefaultSlotProjection,
  getSlotFilePath,
  makeSlotKey,
} from "../projections/slotProjectionMapper.js";
import type { VideoSlotStore } from "./repositoryTypes.js";
import { pinRevisionArtifactUrls } from "../projections/revisionArtifactUrls.js";

export function createVideoSlotStore(storageRoot: string): VideoSlotStore {
  const slotProjections = new Map<string, MascotSlotProjection>();

  async function loadSlotProjectionsIfPresent(mascotId: string, styleId: string): Promise<void> {
    const filePath = getSlotFilePath(storageRoot, mascotId, styleId);
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as Record<string, MascotSlotProjection>;
      for (const [key, val] of Object.entries(parsed)) {
        if (!slotProjections.has(key)) slotProjections.set(key, val);
      }
    } catch {
      // State file uninitialized
    }
  }

  async function persistSlotProjections(mascotId: string, styleId: string): Promise<void> {
    const filePath = getSlotFilePath(storageRoot, mascotId, styleId);
    const prefix = `${sanitizeIdentifier(mascotId)}:${sanitizeIdentifier(styleId)}:`;
    const relevant: Record<string, MascotSlotProjection> = {};
    for (const [key, val] of slotProjections.entries()) {
      if (key.startsWith(prefix)) relevant[key] = val;
    }
    await atomicWriteJson(filePath, relevant);
  }

  async function getSlotProjection(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
  ): Promise<MascotSlotProjection> {
    await loadSlotProjectionsIfPresent(mascotId, styleId);
    const key = makeSlotKey(mascotId, styleId, state, slotIndex);
    const existing = slotProjections.get(key);
    if (existing) {
      return {
        ...existing,
        ...(existing.active_revision ? { active_revision: pinRevisionArtifactUrls(existing.active_revision) } : {}),
      };
    }

    const initial = createDefaultSlotProjection(styleId, state, slotIndex);
    slotProjections.set(key, initial);
    return { ...initial };
  }

  async function listSlotProjections(mascotId: string, styleId: string): Promise<MascotSlotProjection[]> {
    await loadSlotProjectionsIfPresent(mascotId, styleId);
    const projections: MascotSlotProjection[] = [];
    for (const state of ANIMATION_STATES) {
      for (let slot = 1; slot <= SLOTS_PER_STATE; slot += 1) {
        projections.push(await getSlotProjection(mascotId, styleId, state, slot));
      }
    }
    return projections;
  }

  async function transitionSlotState(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    toState: MascotSlotState,
    jobId?: string,
  ): Promise<MascotSlotProjection> {
    const key = makeSlotKey(mascotId, styleId, state, slotIndex);
    const current = await getSlotProjection(mascotId, styleId, state, slotIndex);
    const updated = applyStateTransition(current, toState, jobId);

    slotProjections.set(key, updated);
    await persistSlotProjections(mascotId, styleId);
    return { ...updated };
  }

  async function recordAttemptFailure(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    attemptId: number,
    error: { code?: string; message?: string },
    qaFailed = false,
  ): Promise<MascotSlotProjection> {
    const key = makeSlotKey(mascotId, styleId, state, slotIndex);
    const current = await getSlotProjection(mascotId, styleId, state, slotIndex);

    if (current.active_attempt !== undefined && current.active_attempt !== null && attemptId < current.active_attempt) {
      return { ...current };
    }

    const updated = applyAttemptFailure(current, attemptId, error, qaFailed);
    slotProjections.set(key, updated);
    await persistSlotProjections(mascotId, styleId);
    return { ...updated };
  }

  async function applyJobToSlot(job: MascotVideoProcessingJob): Promise<MascotSlotProjection> {
    const slotKey = makeSlotKey(job.mascot_id, job.style_id, job.state, job.slot_index);
    const current = await getSlotProjection(job.mascot_id, job.style_id, job.state, job.slot_index);
    const updated = applyJobToSlotProjection(current, job);
    slotProjections.set(slotKey, updated);
    await persistSlotProjections(job.mascot_id, job.style_id);
    return { ...updated };
  }

  async function prepareActiveRevision(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    attemptId: number,
    revision: MascotAnimationRevision,
  ): Promise<MascotSlotProjection> {
    const current = await getSlotProjection(mascotId, styleId, state, slotIndex);
    return applyActiveRevision(current, attemptId, revision);
  }

  async function commitSlotProjection(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    projection: MascotSlotProjection,
  ): Promise<void> {
    const key = makeSlotKey(mascotId, styleId, state, slotIndex);
    slotProjections.set(key, projection);
    await persistSlotProjections(mascotId, styleId);
  }

  function setCachedActiveRevision(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    revision: MascotAnimationRevision,
  ): void {
    const key = makeSlotKey(mascotId, styleId, state, slotIndex);
    const existing = slotProjections.get(key);
    if (existing) {
      existing.active_revision = revision;
    }
  }

  return {
    loadSlotProjectionsIfPresent,
    persistSlotProjections,
    getSlotProjection,
    listSlotProjections,
    transitionSlotState,
    recordAttemptFailure,
    applyJobToSlot,
    prepareActiveRevision,
    commitSlotProjection,
    setCachedActiveRevision,
  };
}
