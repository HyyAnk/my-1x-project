import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import {
  CancelAnimationProcessingJobBodySchema,
  GetAnimationProcessingJobParamsSchema,
  GetStyleAnimationSlotsParamsSchema,
  UploadMascotSlotVideoBodySchema,
  UploadMascotSlotVideoParamsSchema,
} from "../mascotAnimationRouteSchemas.js";
import { handleVideoRouteError, sendError } from "./animationRouteHelpers.js";
import type { MascotAnimationVideoRouteDeps } from "./animationServices.js";
import { handleSlotVideoUpload } from "./videoUploadRouteHandler.js";

/**
 * Registers routes for video animation slot upload, retry, replace, job tracking, and source video streaming.
 */
export function registerMascotAnimationVideoRoutes(server: FastifyInstance, deps: MascotAnimationVideoRouteDeps): void {
  const { repository, storageAdapter, videoProcessingRepo, orchestrator } = deps;

  // 1. Video Upload Endpoint
  server.post("/api/mascots/:mascotId/styles/:styleId/animation-slots/:state/:slot/video", async (request, reply) => {
    return handleSlotVideoUpload(request, reply, deps);
  });

  // 2. Retry slot animation
  server.post("/api/mascots/:mascotId/styles/:styleId/animation-slots/:state/:slot/retry", async (request, reply) => {
    try {
      const { mascotId, styleId, state, slot } = UploadMascotSlotVideoParamsSchema.parse(request.params);
      const mascot = await repository.getMascot(mascotId);
      const style = (mascot.styles || []).find((s) => s.id === styleId);
      if (!style) return sendError(reply, 404, "STYLE_NOT_FOUND", `Style ${styleId} not found`);

      const job = await orchestrator.retrySlot(mascotId, styleId, state, slot);
      const updatedProjection = await videoProcessingRepo.getSlotProjection(mascotId, styleId, state, slot);

      return reply.code(200).send({
        ok: true,
        job_id: job.id,
        attempt: job.attempt,
        status: job.status,
        slot_projection: updatedProjection,
      });
    } catch (err: unknown) {
      return handleVideoRouteError(reply, err, "RETRY_FAILED");
    }
  });

  // 3. Replace slot animation video
  server.post("/api/mascots/:mascotId/styles/:styleId/animation-slots/:state/:slot/replace", async (request, reply) => {
    try {
      const { mascotId, styleId, state, slot } = UploadMascotSlotVideoParamsSchema.parse(request.params);
      const mascot = await repository.getMascot(mascotId);
      const style = (mascot.styles || []).find((s) => s.id === styleId);
      if (!style) return sendError(reply, 404, "STYLE_NOT_FOUND", `Style ${styleId} not found`);

      const body = UploadMascotSlotVideoBodySchema.parse(request.body);
      const base64Data = body.data.replace(/^data:video\/[^;]+;base64,/i, "");
      const buffer = Buffer.from(base64Data, "base64");

      const result = await orchestrator.replaceSlot({
        mascotId,
        styleId,
        state,
        slotIndex: slot,
        filename: body.filename,
        buffer,
        mimeType: body.mime_type || "video/mp4",
      });

      return reply.code(200).send({
        ok: true,
        job_id: result.job.id,
        attempt: result.job.attempt,
        status: result.job.status,
        slot_projection: result.slotProjection,
      });
    } catch (err: unknown) {
      return handleVideoRouteError(reply, err, "REPLACE_FAILED");
    }
  });

  // 4. Cancel processing job
  server.post("/api/mascots/:mascotId/animation-processing/:jobId/cancel", async (request, reply) => {
    try {
      const { mascotId, jobId } = GetAnimationProcessingJobParamsSchema.parse(request.params);
      const body = CancelAnimationProcessingJobBodySchema.parse(request.body);
      const job = await orchestrator.cancelJob(jobId, body?.reason || "Job cancelled by user");
      const updatedProjection = await videoProcessingRepo.getSlotProjection(mascotId, job.style_id, job.state, job.slot_index);

      return reply.code(200).send({
        ok: true,
        job,
        slot_projection: updatedProjection,
      });
    } catch (err: unknown) {
      return handleVideoRouteError(reply, err, "CANCEL_FAILED");
    }
  });

  // 5. Get animation processing job status
  server.get("/api/mascots/:mascotId/animation-processing/:jobId", async (request, reply) => {
    try {
      const { mascotId, jobId } = GetAnimationProcessingJobParamsSchema.parse(request.params);
      const job = await videoProcessingRepo.getJob(jobId);
      if (!job || job.mascot_id !== mascotId) {
        return sendError(reply, 404, "JOB_NOT_FOUND", `Processing job ${jobId} not found`);
      }
      return { ok: true, job };
    } catch (err: unknown) {
      return sendError(reply, 400, "BAD_REQUEST", (err as Error).message);
    }
  });

  // 6. Get style animation slots projections
  server.get("/api/mascots/:mascotId/styles/:styleId/animation-slots", async (request, reply) => {
    try {
      const { mascotId, styleId } = GetStyleAnimationSlotsParamsSchema.parse(request.params);
      const mascot = await repository.getMascot(mascotId);
      const style = (mascot.styles || []).find((s) => s.id === styleId);
      if (!style) return sendError(reply, 404, "STYLE_NOT_FOUND", `Style ${styleId} not found`);

      const thinking = [];
      const celebrate = [];
      for (let i = 1; i <= 10; i++) {
        thinking.push(await videoProcessingRepo.getSlotProjection(mascotId, styleId, "thinking", i));
        celebrate.push(await videoProcessingRepo.getSlotProjection(mascotId, styleId, "celebrate", i));
      }

      return {
        ok: true,
        mascot_id: mascotId,
        style_id: styleId,
        slots: { thinking, celebrate },
      };
    } catch (err: unknown) {
      return sendError(reply, 400, "BAD_REQUEST", (err as Error).message);
    }
  });

  // 7. Stream staged source video
  server.get("/api/mascots/:mascotId/styles/:styleId/slots/:state/:slotIndex/attempts/:attemptId/source", async (request, reply) => {
    try {
      const params = request.params as {
        mascotId: string;
        styleId: string;
        state: "thinking" | "celebrate";
        slotIndex: string;
        attemptId: string;
      };
      const filePath = storageAdapter.getAttemptSourceVideoPath(
        params.mascotId,
        params.styleId,
        params.state,
        parseInt(params.slotIndex, 10),
        params.attemptId,
      );

      const stat = await fs.stat(filePath);
      return reply
        .headers({
          "content-type": "video/mp4",
          "content-length": stat.size,
          "cache-control": "private, max-age=3600",
        })
        .send(createReadStream(filePath));
    } catch {
      return sendError(reply, 404, "SOURCE_VIDEO_NOT_FOUND", "Source video not found for this attempt");
    }
  });
}
