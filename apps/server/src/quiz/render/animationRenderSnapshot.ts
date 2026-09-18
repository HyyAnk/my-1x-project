/**
 * Animation Render Snapshot (Stage 15)
 *
 * Captures and restores deterministic mascot animation selection snapshots
 * to guarantee bit-for-bit reproducibility on resume and re-render.
 */

import type { AnimationState } from "@studio/shared";

export interface MascotAnimationRenderSnapshotEntry {
  videoId: string;
  questionId: string;
  state: AnimationState;
  styleId: string;
  slot_index: number;
  revision: number;
  seed: number;
  candidate_index: number;
  fingerprint?: string;
  atlas_url?: string;
  transparent_video_url?: string;
  alpha_codec?: string;
}

export interface MascotAnimationRenderSnapshot {
  version: 1;
  videoId: string;
  entries: MascotAnimationRenderSnapshotEntry[];
}

export function createMascotAnimationRenderSnapshot(videoId: string): MascotAnimationRenderSnapshot {
  return {
    version: 1,
    videoId,
    entries: [],
  };
}

export function recordMascotAnimationSnapshotEntry(
  snapshot: MascotAnimationRenderSnapshot,
  entry: MascotAnimationRenderSnapshotEntry,
): void {
  const existingIndex = snapshot.entries.findIndex(
    (e) => e.videoId === entry.videoId && e.questionId === entry.questionId && e.state === entry.state && e.styleId === entry.styleId,
  );

  if (existingIndex >= 0) {
    snapshot.entries[existingIndex] = entry;
  } else {
    snapshot.entries.push(entry);
  }
}

export function findSnapshotEntry(
  snapshot: MascotAnimationRenderSnapshot | undefined,
  query: {
    videoId?: string;
    questionId: string;
    state: AnimationState;
    styleId: string;
  },
): MascotAnimationRenderSnapshotEntry | undefined {
  if (!snapshot) return undefined;
  return snapshot.entries.find(
    (e) =>
      (!query.videoId || e.videoId === query.videoId) &&
      e.questionId === query.questionId &&
      e.state === query.state &&
      e.styleId === query.styleId,
  );
}
