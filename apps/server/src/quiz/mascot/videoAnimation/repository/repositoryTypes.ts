import {
  type AnimationState,
  type MascotAnimationRevision,
  type MascotAttemptMetadata,
  type MascotProcessingJobStatus,
  type MascotSlotProjection,
  type MascotSlotState,
  type MascotVideoProcessingJob,
} from "@studio/shared";

export const RECOGNIZED_ARTIFACT_FILES = [
  "video_transparent.webm",
  "atlas.png",
  "preview.webp",
  "preview.png",
  "manifest.json",
  "contact_sheet.png",
  "source.mp4",
  "attempt.json",
] as const;

export type RecognizedArtifactFile = (typeof RECOGNIZED_ARTIFACT_FILES)[number];

export interface VideoSlotStore {
  loadSlotProjectionsIfPresent: (mascotId: string, styleId: string) => Promise<void>;
  persistSlotProjections: (mascotId: string, styleId: string) => Promise<void>;
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
  recordAttemptFailure: (
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    attemptId: number,
    error: { code?: string; message?: string },
    qaFailed?: boolean,
  ) => Promise<MascotSlotProjection>;
  applyJobToSlot: (job: MascotVideoProcessingJob) => Promise<MascotSlotProjection>;
  prepareActiveRevision: (
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    attemptId: number,
    revision: MascotAnimationRevision,
  ) => Promise<MascotSlotProjection>;
  commitSlotProjection: (
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    projection: MascotSlotProjection,
  ) => Promise<void>;
  setCachedActiveRevision: (
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    revision: MascotAnimationRevision,
  ) => void;
}

export interface VideoJobStore {
  getJob: (jobId: string) => Promise<MascotVideoProcessingJob | null>;
  getSlotJob: (mascotId: string, styleId: string, state: AnimationState, slotIndex: number) => Promise<MascotVideoProcessingJob | null>;
  saveJob: (job: MascotVideoProcessingJob) => Promise<MascotVideoProcessingJob>;
  updateJobStatus: (
    jobId: string,
    status: MascotProcessingJobStatus,
    progress?: number,
    error?: { code?: string; message?: string } | null,
  ) => Promise<MascotVideoProcessingJob>;
}

export interface VideoManifestStore {
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
  resolveArtifactPath: (
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    filename: string,
    attemptId?: number,
  ) => Promise<string | null>;
}
