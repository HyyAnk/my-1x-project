import { type AnimationState, type MascotProcessingJobStatus, type MascotVideoProcessingJob } from "@studio/shared";
import { sanitizeIdentifier } from "../adapters/animationStorageAdapter.js";
import { makeSlotKey } from "../projections/slotProjectionMapper.js";
import type { VideoJobStore, VideoSlotStore } from "./repositoryTypes.js";

export function createVideoJobStore(slotStore: VideoSlotStore): VideoJobStore {
  const jobsById = new Map<string, MascotVideoProcessingJob>();
  const slotJobs = new Map<string, string>();

  function getJob(jobId: string): Promise<MascotVideoProcessingJob | null> {
    const safeId = sanitizeIdentifier(jobId, "jobId");
    const found = jobsById.get(safeId);
    return Promise.resolve(found ? { ...found } : null);
  }

  async function getSlotJob(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
  ): Promise<MascotVideoProcessingJob | null> {
    const key = makeSlotKey(mascotId, styleId, state, slotIndex);
    const jobId = slotJobs.get(key);
    return jobId ? getJob(jobId) : null;
  }

  async function saveJob(job: MascotVideoProcessingJob): Promise<MascotVideoProcessingJob> {
    const safeId = sanitizeIdentifier(job.id, "job.id");
    const updated: MascotVideoProcessingJob = {
      ...job,
      id: safeId,
      updated_at: new Date().toISOString(),
    };
    jobsById.set(safeId, updated);

    const slotKey = makeSlotKey(job.mascot_id, job.style_id, job.state, job.slot_index);
    slotJobs.set(slotKey, safeId);

    await slotStore.applyJobToSlot(updated);
    return { ...updated };
  }

  async function updateJobStatus(
    jobId: string,
    status: MascotProcessingJobStatus,
    progress = 0,
    error: { code?: string; message?: string } | null = null,
  ): Promise<MascotVideoProcessingJob> {
    const job = await getJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const updated: MascotVideoProcessingJob = {
      ...job,
      status,
      progress: Math.max(0, Math.min(100, progress)),
      error_code: error?.code ?? null,
      error_message: error?.message ?? null,
      updated_at: new Date().toISOString(),
    };

    jobsById.set(job.id, updated);
    return { ...updated };
  }

  return {
    getJob,
    getSlotJob,
    saveJob,
    updateJobStatus,
  };
}
