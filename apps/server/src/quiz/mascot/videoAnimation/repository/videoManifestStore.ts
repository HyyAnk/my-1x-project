import fs from "node:fs/promises";
import path from "node:path";
import {
  MascotAnimationRevisionSchema,
  MascotAttemptMetadataSchema,
  type AnimationState,
  type MascotAnimationRevision,
  type MascotAttemptMetadata,
  type MascotSlotProjection,
} from "@studio/shared";
import type { AnimationStorageAdapter } from "../adapters/animationStorageAdapter.js";
import { atomicWriteJson } from "../utils/atomicFs.js";
import { readRevisionsFromDirectory } from "../projections/slotProjectionMapper.js";
import { RECOGNIZED_ARTIFACT_FILES, type RecognizedArtifactFile, type VideoManifestStore, type VideoSlotStore } from "./repositoryTypes.js";

export function isRecognizedArtifact(filename: string): boolean {
  if (RECOGNIZED_ARTIFACT_FILES.includes(filename as RecognizedArtifactFile)) {
    return true;
  }
  return /^frame_\d{3,4}\.png$/.test(filename);
}

export function createVideoManifestStore(storageAdapter: AnimationStorageAdapter, slotStore: VideoSlotStore): VideoManifestStore {
  async function saveAttemptMetadata(metadata: MascotAttemptMetadata): Promise<void> {
    const validated = MascotAttemptMetadataSchema.parse(metadata);
    const attemptDir = storageAdapter.getAttemptDir(
      validated.mascot_id,
      validated.style_id,
      validated.state,
      validated.slot_index,
      validated.attempt,
    );
    await atomicWriteJson(path.join(attemptDir, "attempt.json"), validated);
  }

  async function getAttemptMetadata(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    attemptId: number,
  ): Promise<MascotAttemptMetadata | null> {
    const attemptDir = storageAdapter.getAttemptDir(mascotId, styleId, state, slotIndex, attemptId);
    try {
      const raw = await fs.readFile(path.join(attemptDir, "attempt.json"), "utf8");
      return MascotAttemptMetadataSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async function saveActiveRevision(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    attemptId: number,
    revision: MascotAnimationRevision,
  ): Promise<MascotSlotProjection> {
    const updated = await slotStore.prepareActiveRevision(mascotId, styleId, state, slotIndex, attemptId, revision);

    const revisionsDir = storageAdapter.getSlotRevisionsDir(mascotId, styleId, state, slotIndex);
    await atomicWriteJson(path.join(revisionsDir, `rev_${attemptId}.json`), updated.active_revision);

    const slotDir = storageAdapter.getSlotDir(mascotId, styleId, state, slotIndex);
    await atomicWriteJson(path.join(slotDir, "active_revision.json"), updated.active_revision);

    await slotStore.commitSlotProjection(mascotId, styleId, state, slotIndex, updated);
    return { ...updated };
  }

  async function getActiveRevision(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
  ): Promise<MascotAnimationRevision | null> {
    const current = await slotStore.getSlotProjection(mascotId, styleId, state, slotIndex);
    if (current.active_revision) return { ...current.active_revision };

    const slotDir = storageAdapter.getSlotDir(mascotId, styleId, state, slotIndex);
    try {
      const raw = await fs.readFile(path.join(slotDir, "active_revision.json"), "utf8");
      const validated = MascotAnimationRevisionSchema.parse(JSON.parse(raw));
      slotStore.setCachedActiveRevision(mascotId, styleId, state, slotIndex, validated);
      return validated;
    } catch {
      return null;
    }
  }

  async function listRevisions(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
  ): Promise<MascotAnimationRevision[]> {
    const revisionsDir = storageAdapter.getSlotRevisionsDir(mascotId, styleId, state, slotIndex);
    return readRevisionsFromDirectory(revisionsDir);
  }

  async function resolveArtifactPath(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    filename: string,
    attemptId?: number,
  ): Promise<string | null> {
    if (!isRecognizedArtifact(filename)) return null;

    const slotDir = storageAdapter.getSlotDir(mascotId, styleId, state, slotIndex);
    const legacyPaths = [
      path.join(slotDir, filename),
      path.join(storageAdapter.getPublishedArtifactsDir(mascotId, styleId, state, slotIndex), filename),
    ];
    const candidatePaths: string[] = [];

    const targetAttempts: number[] = [];
    if (attemptId !== undefined) {
      targetAttempts.push(attemptId);
    } else {
      const activeRev = await getActiveRevision(mascotId, styleId, state, slotIndex);
      if (activeRev) targetAttempts.push(activeRev.attempt);
      if (!activeRev)
        try {
          const entries = await fs.readdir(path.join(slotDir, "attempts"), { withFileTypes: true });
          const scanned = entries
            .filter((e) => e.isDirectory() && e.name.startsWith("att_"))
            .map((e) => parseInt(e.name.replace("att_", ""), 10))
            .filter((n) => !Number.isNaN(n))
            .sort((a, b) => b - a);
          targetAttempts.push(...scanned);
        } catch {
          // attempts dir uninitialized
        }
    }

    for (const att of targetAttempts) {
      const attDir = storageAdapter.getAttemptDir(mascotId, styleId, state, slotIndex, att);
      candidatePaths.push(
        path.join(attDir, filename),
        path.join(attDir, "frames", "matted", filename),
        path.join(attDir, "frames", "extracted", filename),
      );
    }

    if (attemptId === undefined && targetAttempts.length === 0) candidatePaths.push(...legacyPaths);

    for (const candidate of candidatePaths) {
      try {
        const stat = await fs.stat(candidate);
        if (stat.isFile()) return candidate;
      } catch {
        // Continue searching
      }
    }
    return null;
  }

  return {
    saveAttemptMetadata,
    getAttemptMetadata,
    saveActiveRevision,
    getActiveRevision,
    listRevisions,
    resolveArtifactPath,
  };
}
