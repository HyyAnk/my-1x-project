import type {
  AnimationState,
  MascotPublishedAnimationAsset,
  MascotAnimationAttempt,
  MascotAnimationBatch,
  MascotAnimationJob,
  MascotStateVariant,
} from "@studio/shared";

export type AnimationRepositoryErrorCode =
  "JOB_NOT_FOUND" | "BATCH_NOT_FOUND" | "STALE_ATTEMPT" | "IMMUTABLE_PUBLISH_RECORD" | "INVALID_REVISION" | "STORAGE_ERROR";

export class AnimationRepositoryError extends Error {
  public readonly code: AnimationRepositoryErrorCode;

  constructor(message: string, code: AnimationRepositoryErrorCode) {
    super(message);
    this.name = "AnimationRepositoryError";
    this.code = code;
  }
}

export class StaleAttemptError extends AnimationRepositoryError {
  constructor(message: string) {
    super(message, "STALE_ATTEMPT");
    this.name = "StaleAttemptError";
  }
}

export class ImmutableRecordError extends AnimationRepositoryError {
  constructor(message: string) {
    super(message, "IMMUTABLE_PUBLISH_RECORD");
    this.name = "ImmutableRecordError";
  }
}

export class JobNotFoundError extends AnimationRepositoryError {
  constructor(jobId: string) {
    super(`Animation job not found: ${jobId}`, "JOB_NOT_FOUND");
    this.name = "JobNotFoundError";
  }
}

export interface PublishedAnimationRecord {
  mascot_id: string;
  style_id: string;
  state: AnimationState;
  slot_index: number;
  revision: number;
  asset: MascotPublishedAnimationAsset;
  published_at: string;
}

export interface AnimationRepositoryOptions {
  storageRoot: string;
}

export interface AnimationRepository {
  // Job and attempt methods
  saveJob(job: MascotAnimationJob): Promise<MascotAnimationJob>;
  getJob(mascotId: string, jobId: string): Promise<MascotAnimationJob | null>;
  listJobsByStyle(mascotId: string, styleId: string): Promise<MascotAnimationJob[]>;
  listJobsByBatch(mascotId: string, batchId: string): Promise<MascotAnimationJob[]>;
  recordAttemptStart(
    mascotId: string,
    jobId: string,
    fingerprint: string,
  ): Promise<{ job: MascotAnimationJob; attempt: MascotAnimationAttempt }>;
  updateAttempt(
    mascotId: string,
    jobId: string,
    attemptNumber: number,
    patch: Partial<MascotAnimationAttempt>,
  ): Promise<MascotAnimationJob>;

  // Batch methods
  saveBatch(batch: MascotAnimationBatch): Promise<MascotAnimationBatch>;
  getBatch(mascotId: string, batchId: string): Promise<MascotAnimationBatch | null>;

  // Immutable publish methods
  savePublishedRecord(record: PublishedAnimationRecord): Promise<PublishedAnimationRecord>;
  getPublishedRecord(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    revision: number,
  ): Promise<PublishedAnimationRecord | null>;
  listPublishedRecords(mascotId: string, styleId: string, state: AnimationState, slotIndex: number): Promise<PublishedAnimationRecord[]>;

  // Style slots and publishing integration
  getStyleSlots(mascotId: string, styleId: string): Promise<{ thinking: MascotStateVariant[]; celebrate: MascotStateVariant[] }>;
  publishSlotAnimation(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    asset: MascotPublishedAnimationAsset,
  ): Promise<{ variant: MascotStateVariant; record: PublishedAnimationRecord }>;
}
