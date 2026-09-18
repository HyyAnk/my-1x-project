import fs from "node:fs/promises";
import path from "node:path";
import type { AnimationState, MascotSlotProjection, MascotVideoProcessingJob } from "@studio/shared";
import { OrchestrationError } from "./orchestrator/orchestratorErrors.js";
import type {
  ActiveJobContext,
  QueueStatus,
  ReplaceSlotParams,
  VideoProcessingOrchestrator,
  VideoProcessingOrchestratorDeps,
} from "./orchestrator/orchestratorTypes.js";
import { createOrchestratorQueue } from "./orchestrator/orchestratorQueue.js";

export { OrchestrationError };
export type { ActiveJobContext, QueueStatus, ReplaceSlotParams, VideoProcessingOrchestrator, VideoProcessingOrchestratorDeps };

/**
 * Creates and initializes the video processing orchestrator coordinator.
 */
export function createVideoProcessingOrchestrator(deps: VideoProcessingOrchestratorDeps): VideoProcessingOrchestrator {
  const queue = createOrchestratorQueue(deps);

  async function retrySlot(mascotId: string, styleId: string, state: AnimationState, slotIndex: number): Promise<MascotVideoProcessingJob> {
    const currentProj = await deps.repository.getSlotProjection(mascotId, styleId, state, slotIndex);

    if (!["failed", "qa_failed", "cancelled"].includes(currentProj.status)) {
      throw new OrchestrationError(
        `Cannot retry slot ${state}:${slotIndex} in status "${currentProj.status}". Must be failed, qa_failed, or cancelled.`,
        "INVALID_STATE_TRANSITION",
      );
    }

    const previousJob = currentProj.active_job_id ? await deps.repository.getJob(currentProj.active_job_id) : null;

    if (!previousJob) {
      throw new OrchestrationError(`No previous job found for slot ${state}:${slotIndex} to retry`, "JOB_NOT_FOUND");
    }

    // Transition retrying -> processing
    await deps.repository.transitionSlotState(mascotId, styleId, state, slotIndex, "retrying");

    const nextAttempt = (currentProj.active_attempt ?? 1) + 1;

    // Copy source video from previous attempt to new attempt directory
    const prevAttemptDir = deps.storageAdapter.getAttemptDir(mascotId, styleId, state, slotIndex, currentProj.active_attempt ?? 1);
    const nextAttemptDir = deps.storageAdapter.getAttemptDir(mascotId, styleId, state, slotIndex, nextAttempt);
    await fs.mkdir(nextAttemptDir, { recursive: true });

    try {
      const prevFiles = await fs.readdir(prevAttemptDir);
      for (const f of prevFiles) {
        const lower = f.toLowerCase();
        if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm")) {
          await fs.copyFile(path.join(prevAttemptDir, f), path.join(nextAttemptDir, f));
        }
      }
    } catch {
      // Continue if readdir fails
    }

    const now = new Date().toISOString();
    const newJob: MascotVideoProcessingJob = {
      id: `job_${mascotId}_${styleId}_${state}_${slotIndex}_att${nextAttempt}`,
      mascot_id: mascotId,
      style_id: styleId,
      state,
      slot_index: slotIndex,
      attempt: nextAttempt,
      source_video_url: previousJob.source_video_url,
      source_video_fingerprint: previousJob.source_video_fingerprint,
      status: "queued",
      progress: 0,
      error_code: null,
      error_message: null,
      created_at: now,
      updated_at: now,
    };

    return queue.scheduleJob(newJob);
  }

  async function replaceSlot(params: ReplaceSlotParams): Promise<{
    job: MascotVideoProcessingJob;
    slotProjection: MascotSlotProjection;
  }> {
    const { mascotId, styleId, state, slotIndex, filename, buffer, mimeType } = params;
    const currentProj = await deps.repository.getSlotProjection(mascotId, styleId, state, slotIndex);

    if (currentProj.status !== "ready") {
      throw new OrchestrationError(
        `Cannot replace slot ${state}:${slotIndex} in status "${currentProj.status}". Slot must be ready.`,
        "INVALID_STATE_TRANSITION",
      );
    }

    // Transition ready -> replacing
    await deps.repository.transitionSlotState(mascotId, styleId, state, slotIndex, "replacing");

    const nextAttempt = (currentProj.active_attempt ?? 1) + 1;
    const uploadResult = await deps.uploadService.validateAndStageSourceVideo({
      mascotId,
      styleId,
      state,
      slotIndex,
      attemptId: nextAttempt,
      filename,
      buffer,
      mimeType,
    });

    const now = new Date().toISOString();
    const jobId = `job_${mascotId}_${styleId}_${state}_${slotIndex}_att${nextAttempt}`;
    const job: MascotVideoProcessingJob = {
      id: jobId,
      mascot_id: mascotId,
      style_id: styleId,
      state,
      slot_index: slotIndex,
      attempt: nextAttempt,
      source_video_url: uploadResult.sourceVideoUrl,
      source_video_fingerprint: uploadResult.sourceVideoFingerprint,
      status: "queued",
      progress: 0,
      error_code: null,
      error_message: null,
      created_at: now,
      updated_at: now,
    };

    const scheduled = await queue.scheduleJob(job);
    const updatedProj = await deps.repository.getSlotProjection(mascotId, styleId, state, slotIndex);

    return { job: scheduled, slotProjection: updatedProj };
  }

  return {
    scheduleJob: queue.scheduleJob,
    runJobSync: queue.runJobSync,
    cancelJob: queue.cancelJob,
    retrySlot,
    replaceSlot,
    getQueueStatus: queue.getQueueStatus,
  };
}
