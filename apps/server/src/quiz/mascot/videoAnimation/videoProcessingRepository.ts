import {
  type AnimationState,
  type MascotAnimationRevision,
  type MascotAttemptMetadata,
  type MascotProcessingJobStatus,
  type MascotSlotProjection,
  type MascotSlotState,
  type MascotVideoProcessingJob,
} from "@studio/shared";
import { type AnimationStorageAdapter } from "./adapters/animationStorageAdapter.js";
import { atomicWriteJson } from "./utils/atomicFs.js";
import { InvalidStateTransitionError, StaleCompletionError } from "./errors/videoProcessingErrors.js";
import {
  type SlotProjection,
  applyActiveRevision,
  applyAttemptFailure,
  applyJobToSlotProjection,
  applyStateTransition,
  createDefaultSlotProjection,
  getSlotFilePath,
  makeSlotKey,
  readRevisionsFromDirectory,
} from "./projections/slotProjectionMapper.js";
import {
  type VideoJobStore,
  createVideoJobStore,
  type VideoSlotStore,
  createVideoSlotStore,
  type VideoManifestStore,
  createVideoManifestStore,
  RECOGNIZED_ARTIFACT_FILES,
  type RecognizedArtifactFile,
  isRecognizedArtifact,
} from "./repository/index.js";

// Re-export core utilities, errors, and projections for backwards compatibility
export { atomicWriteJson };
export { InvalidStateTransitionError, StaleCompletionError };
export type { SlotProjection };
export {
  applyActiveRevision,
  applyAttemptFailure,
  applyJobToSlotProjection,
  applyStateTransition,
  createDefaultSlotProjection,
  getSlotFilePath,
  makeSlotKey,
  readRevisionsFromDirectory,
};
export {
  type VideoJobStore,
  createVideoJobStore,
  type VideoSlotStore,
  createVideoSlotStore,
  type VideoManifestStore,
  createVideoManifestStore,
  RECOGNIZED_ARTIFACT_FILES,
  type RecognizedArtifactFile,
  isRecognizedArtifact,
};

export interface VideoProcessingRepository {
  getJob: (jobId: string) => Promise<MascotVideoProcessingJob | null>;
  getSlotJob: (mascotId: string, styleId: string, state: AnimationState, slotIndex: number) => Promise<MascotVideoProcessingJob | null>;
  saveJob: (job: MascotVideoProcessingJob) => Promise<MascotVideoProcessingJob>;
  updateJobStatus: (
    jobId: string,
    status: MascotProcessingJobStatus,
    progress?: number,
    error?: { code?: string; message?: string } | null,
  ) => Promise<MascotVideoProcessingJob>;
  getSlotProjection: (mascotId: string, styleId: string, state: AnimationState, slotIndex: number) => Promise<MascotSlotProjection>;
  listSlotProjections: (mascotId: string, styleId: string) => Promise<MascotSlotProjection[]>;
  transitionSlotState: (
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    toState: MascotSlotState,
    jobId?: string,
  ) => Promise<MascotSlotProjection>;
  saveAttemptMetadata: (metadata: MascotAttemptMetadata) => Promise<void>;
  getAttemptMetadata: (
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    attemptId: number,
  ) => Promise<MascotAttemptMetadata | null>;
  saveActiveRevision: (
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    attemptId: number,
    revision: MascotAnimationRevision,
  ) => Promise<MascotSlotProjection>;
  getActiveRevision: (
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
  ) => Promise<MascotAnimationRevision | null>;
  listRevisions: (mascotId: string, styleId: string, state: AnimationState, slotIndex: number) => Promise<MascotAnimationRevision[]>;
  recordAttemptFailure: (
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    attemptId: number,
    error: { code?: string; message?: string },
    qaFailed?: boolean,
  ) => Promise<MascotSlotProjection>;
  resolveArtifactPath: (
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    filename: string,
    attemptId?: number,
  ) => Promise<string | null>;
}

export function createVideoProcessingRepository(storageAdapter: AnimationStorageAdapter): VideoProcessingRepository {
  const slotStore = createVideoSlotStore(storageAdapter.storageRoot);
  const jobStore = createVideoJobStore(slotStore);
  const manifestStore = createVideoManifestStore(storageAdapter, slotStore);

  return {
    getJob: jobStore.getJob,
    getSlotJob: jobStore.getSlotJob,
    saveJob: jobStore.saveJob,
    updateJobStatus: jobStore.updateJobStatus,
    getSlotProjection: slotStore.getSlotProjection,
    listSlotProjections: slotStore.listSlotProjections,
    transitionSlotState: slotStore.transitionSlotState,
    saveAttemptMetadata: manifestStore.saveAttemptMetadata,
    getAttemptMetadata: manifestStore.getAttemptMetadata,
    saveActiveRevision: manifestStore.saveActiveRevision,
    getActiveRevision: manifestStore.getActiveRevision,
    listRevisions: manifestStore.listRevisions,
    recordAttemptFailure: slotStore.recordAttemptFailure,
    resolveArtifactPath: manifestStore.resolveArtifactPath,
  };
}
