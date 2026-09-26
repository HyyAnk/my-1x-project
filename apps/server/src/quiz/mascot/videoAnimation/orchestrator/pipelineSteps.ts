import {
  DEFAULT_LOOP_POLICY_BY_STATE,
  type MascotAnimationRevision,
  type MascotAttemptMetadata,
  type MascotSlotState,
  type MascotVideoProcessingJob,
} from "@studio/shared";
import type { VideoProcessingOrchestratorDeps } from "./orchestratorTypes.js";
import { OrchestrationError } from "./orchestratorErrors.js";
import type { SequenceRegistrationResult } from "../frameRegistrationService.js";
import type { PackageAnimationResult } from "../animationPackagingService.js";

/**
 * Reverts slot state and marks job as cancelled when a job execution is aborted or cancelled.
 */
export async function rollbackSlotStateOnCancellation(
  deps: VideoProcessingOrchestratorDeps,
  job: MascotVideoProcessingJob,
  reason?: string,
): Promise<void> {
  await deps.repository.updateJobStatus(job.id, "cancelled", job.progress, {
    code: "CANCELLED",
    message: reason || "Job cancelled by user or newer attempt",
  });

  const { mascot_id, style_id, state, slot_index } = job;
  const currentProj = await deps.repository.getSlotProjection(mascot_id, style_id, state, slot_index);
  if (currentProj.active_job_id && currentProj.active_job_id !== job.id) return;
  const transition = (s: MascotSlotState) => deps.repository.transitionSlotState(mascot_id, style_id, state, slot_index, s);

  if (currentProj.active_revision_id) {
    await transition("ready");
  } else if (currentProj.status === "empty") {
    await transition("uploading");
    await transition("cancelled");
  } else {
    await transition("cancelled");
  }
}

/**
 * Handles error reporting and failure persistence when a pipeline execution fails.
 */
export async function handlePipelineFailure(
  deps: VideoProcessingOrchestratorDeps,
  job: MascotVideoProcessingJob,
  err: unknown,
  signal: AbortSignal,
): Promise<MascotVideoProcessingJob> {
  const error = err as Error & { code?: string };
  const isCancelled = signal.aborted || error.code === "CANCELLED";

  if (isCancelled) {
    const reason = signal.reason instanceof Error ? signal.reason.message : error.message;
    await rollbackSlotStateOnCancellation(deps, job, reason || "Job cancelled by user or newer attempt");
  } else {
    const failure = { code: error.code ?? "PROCESSING_FAILED", message: error.message };
    await deps.repository.updateJobStatus(job.id, "qa_failed", job.progress, failure);
    await deps.repository.recordAttemptFailure(job.mascot_id, job.style_id, job.state, job.slot_index, job.attempt, failure, true);
  }

  const updated = await deps.repository.getJob(job.id);
  return updated ?? job;
}

interface RevisionBuildResult {
  revision: MascotAnimationRevision;
  durationMs: number;
  frameCount: number;
  playbackFps: number;
  transparentVideoUrl?: string;
  alphaCodec?: MascotAttemptMetadata["alpha_codec"];
}

function buildAnimationRevision(
  job: MascotVideoProcessingJob,
  packagingResult: PackageAnimationResult,
  registrationResult: SequenceRegistrationResult,
  now: string,
): RevisionBuildResult {
  const { mascot_id, style_id, state, slot_index, attempt } = job;
  const manifest = packagingResult.manifest;
  const loopMode = manifest.loop_policy ?? DEFAULT_LOOP_POLICY_BY_STATE[state];

  const hasTransparentWebm = Boolean(packagingResult.transparentVideoPath || manifest.transparent_video_url);
  const basePath = `/api/mascots/${mascot_id}/styles/${style_id}/animations/${state}/${slot_index}/artifacts`;
  const transparentVideoUrl = hasTransparentWebm ? `${basePath}/video_transparent.webm` : undefined;
  const alphaCodec = hasTransparentWebm ? (manifest.alpha_codec ?? "vp9_alpha") : undefined;

  const frameCount = manifest.frame_count ?? 12;
  const playbackFps = manifest.fps ?? 8;
  const durationMs = manifest.duration_ms ?? Math.round((frameCount / playbackFps) * 1000);
  const atlasUrl = packagingResult.atlasPath || manifest.atlas ? `${basePath}/atlas.png` : undefined;

  const revision: MascotAnimationRevision = {
    id: `rev_${mascot_id}_${style_id}_${state}_${slot_index}_att${attempt}`,
    attempt,
    created_at: now,
    version: 1,
    style_id,
    state,
    slot_index,
    source_video_url: job.source_video_url,
    atlas_url: atlasUrl,
    manifest_url: `${basePath}/manifest.json`,
    frame_urls: Array.from({ length: frameCount }, (_, i) => `${basePath}/frame_${String(i + 1).padStart(3, "0")}.png`),
    frame_count: frameCount,
    source_fps: manifest.fps ?? 24,
    playback_fps: playbackFps,
    duration_ms: durationMs,
    loop_mode: loopMode,
    canvas: registrationResult.canvas,
    content_bounds: registrationResult.commonBounds,
    pivot: registrationResult.commonPivot,
    registration: registrationResult.registration,
    source_fingerprint: job.source_video_fingerprint,
    processing_fingerprint: packagingResult.processingFingerprint,
    status: "ready",
    ...(transparentVideoUrl ? { transparent_video_url: transparentVideoUrl } : {}),
    ...(alphaCodec ? { alpha_codec: alphaCodec } : {}),
  };

  return { revision, durationMs, frameCount, playbackFps, transparentVideoUrl, alphaCodec };
}

/**
 * Executes the full sequential video processing pipeline for a job.
 */
export async function executePipeline(
  deps: VideoProcessingOrchestratorDeps,
  job: MascotVideoProcessingJob,
  signal: AbortSignal,
): Promise<MascotVideoProcessingJob> {
  const { mascot_id, style_id, state, slot_index, attempt } = job;

  // 1. Mark processing started
  await deps.repository.updateJobStatus(job.id, "processing", 10);
  const currentProj = await deps.repository.getSlotProjection(mascot_id, style_id, state, slot_index);
  if (currentProj.status === "empty") {
    await deps.repository.transitionSlotState(mascot_id, style_id, state, slot_index, "uploading");
  }
  await deps.repository.transitionSlotState(mascot_id, style_id, state, slot_index, "processing", job.id);

  if (signal.aborted) throw new OrchestrationError("Aborted before extraction", "CANCELLED");

  // 2. Extract frames
  await deps.extractionService.extractAttemptFrames({
    mascotId: mascot_id,
    styleId: style_id,
    state,
    slotIndex: slot_index,
    attemptId: attempt,
    signal,
  });
  await deps.repository.updateJobStatus(job.id, "processing", 35);
  if (signal.aborted) throw new OrchestrationError("Aborted before matting", "CANCELLED");

  // 3. Strict Frame Matting
  await deps.mattingService.matteAttemptFrames({
    signal,
    mascotId: mascot_id,
    styleId: style_id,
    state,
    slotIndex: slot_index,
    attemptId: attempt,
  });
  await deps.repository.updateJobStatus(job.id, "processing", 60);
  if (signal.aborted) throw new OrchestrationError("Aborted before registration", "CANCELLED");

  // 4. Common Registration
  const registrationResult = await deps.registrationService.computeAttemptRegistration({
    signal,
    mascotId: mascot_id,
    styleId: style_id,
    state,
    slotIndex: slot_index,
    attemptId: attempt,
  });
  await deps.repository.updateJobStatus(job.id, "processing", 75);
  if (signal.aborted) throw new OrchestrationError("Aborted before packaging", "CANCELLED");

  // 5. Sequence Packaging & Atlas
  const packagingResult = await deps.packagingService.packageAttemptAnimation({
    signal,
    mascotId: mascot_id,
    styleId: style_id,
    state,
    slotIndex: slot_index,
    attemptId: attempt,
    sourceVideoFingerprint: job.source_video_fingerprint,
    cropToContent: true,
  });
  await deps.repository.updateJobStatus(job.id, "processing", 90);
  if (signal.aborted) throw new OrchestrationError("Aborted before persistence", "CANCELLED");

  // 6. Build Revision Object & Attempt Metadata
  const now = new Date().toISOString();
  const { revision, durationMs, frameCount, playbackFps, transparentVideoUrl, alphaCodec } = buildAnimationRevision(
    job,
    packagingResult,
    registrationResult,
    now,
  );

  // 7. Atomic Persistence
  await deps.repository.saveActiveRevision(mascot_id, style_id, state, slot_index, attempt, revision);

  const attemptMeta: MascotAttemptMetadata = {
    job_id: job.id,
    mascot_id,
    style_id,
    state,
    slot_index,
    attempt,
    source_video_url: job.source_video_url,
    source_video_fingerprint: job.source_video_fingerprint,
    processing_fingerprint: packagingResult.processingFingerprint,
    status: "ready",
    progress: 100,
    error_code: null,
    error_message: null,
    created_at: job.created_at,
    updated_at: now,
    manifest_url: revision.manifest_url,
    atlas_url: revision.atlas_url,
    ...(transparentVideoUrl ? { transparent_video_url: transparentVideoUrl } : {}),
    ...(alphaCodec ? { alpha_codec: alphaCodec } : {}),
    duration_ms: durationMs,
    frame_count: frameCount,
    fps: playbackFps,
  };
  await deps.repository.saveAttemptMetadata(attemptMeta);

  // 8. Mark job ready
  return deps.repository.updateJobStatus(job.id, "ready", 100);
}
