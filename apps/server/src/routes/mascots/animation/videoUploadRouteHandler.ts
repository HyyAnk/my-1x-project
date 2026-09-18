import type { FastifyReply, FastifyRequest } from "fastify";
import type { MascotVideoProcessingJob } from "@studio/shared";
import { UploadMascotSlotVideoBodySchema, UploadMascotSlotVideoParamsSchema } from "../mascotAnimationRouteSchemas.js";
import { handleVideoRouteError, sendError } from "./animationRouteHelpers.js";
import type { MascotAnimationVideoRouteDeps } from "./animationServices.js";

/**
 * Handles validation, slot state transitions, upload staging, and orchestrator job dispatch for mascot slot video.
 */
export async function handleSlotVideoUpload(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: MascotAnimationVideoRouteDeps,
): Promise<FastifyReply> {
  const { repository, videoProcessingRepo, videoUploadService, orchestrator } = deps;
  try {
    const { mascotId, styleId, state, slot } = UploadMascotSlotVideoParamsSchema.parse(request.params);
    const mascot = await repository.getMascot(mascotId);
    const style = (mascot.styles || []).find((s) => s.id === styleId);
    if (!style) {
      return sendError(reply, 404, "STYLE_NOT_FOUND", `Style ${styleId} not found`);
    }

    const body = UploadMascotSlotVideoBodySchema.parse(request.body);

    const currentProjection = await videoProcessingRepo.getSlotProjection(mascotId, styleId, state, slot);
    if (currentProjection.status === "processing" || currentProjection.status === "queued") {
      return sendError(
        reply,
        409,
        "INVALID_STATE_TRANSITION",
        `Slot ${state}:${slot} is currently ${currentProjection.status}. Cancel or wait for completion before uploading.`,
      );
    }

    await videoProcessingRepo.transitionSlotState(mascotId, styleId, state, slot, "uploading");

    const base64Data = body.data.replace(/^data:video\/[^;]+;base64,/i, "");
    const buffer = Buffer.from(base64Data, "base64");

    const attemptNumber = (currentProjection.active_attempt ?? 0) + 1;
    const attemptId = `${attemptNumber}`;

    const uploadResult = await videoUploadService.validateAndStageSourceVideo({
      mascotId,
      styleId,
      state,
      slotIndex: slot,
      attemptId,
      filename: body.filename,
      buffer,
      mimeType: body.mime_type,
    });

    const jobId = `job_${mascotId}_${styleId}_${state}_${slot}_att${attemptNumber}`;
    const now = new Date().toISOString();
    const job: MascotVideoProcessingJob = {
      id: jobId,
      mascot_id: mascotId,
      style_id: styleId,
      state,
      slot_index: slot,
      attempt: attemptNumber,
      source_video_url: uploadResult.sourceVideoUrl,
      source_video_fingerprint: uploadResult.sourceVideoFingerprint,
      status: "queued",
      progress: 0,
      error_code: null,
      error_message: null,
      created_at: now,
      updated_at: now,
    };
    await orchestrator.scheduleJob(job);

    const updatedProjection = await videoProcessingRepo.getSlotProjection(mascotId, styleId, state, slot);

    return reply.code(200).send({
      ok: true,
      job_id: jobId,
      attempt: attemptNumber,
      status: "queued",
      slot_projection: updatedProjection,
      upload: {
        source_video_url: uploadResult.sourceVideoUrl,
        source_video_fingerprint: uploadResult.sourceVideoFingerprint,
        file_size_bytes: uploadResult.fileSizeBytes,
        sha256: uploadResult.videoSha256,
        metadata: uploadResult.metadata,
      },
    });
  } catch (err: unknown) {
    return handleVideoRouteError(reply, err, "UPLOAD_FAILED");
  }
}
