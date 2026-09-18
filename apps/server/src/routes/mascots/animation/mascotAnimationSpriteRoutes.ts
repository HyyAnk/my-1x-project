import type { FastifyInstance } from "fastify";
import { getMascotStyleReadiness, isStyleAnimationPublishEligible } from "@studio/shared";
import { persistStylePlan, planStyleAnimation, PublishGateError } from "../../../quiz/mascot/animation/index.js";
import {
  CurateAnimationJobBodySchema,
  MascotAnimationBatchParamsSchema,
  MascotAnimationJobParamsSchema,
  MascotStyleAnimationParamsSchema,
  PlanStyleAnimationsBodySchema,
  RetryAnimationJobBodySchema,
  StartAnimationBatchBodySchema,
} from "../mascotAnimationSchemas.js";
import { sendError } from "./animationRouteHelpers.js";
import type { MascotAnimationSpriteRouteDeps } from "./animationServices.js";

/**
 * Registers routes for sprite animation planning, batch control, job status, curation, and publishing.
 */
export function registerMascotAnimationSpriteRoutes(server: FastifyInstance, deps: MascotAnimationSpriteRouteDeps): void {
  const { repository, logger, animRepo, jobService, publishService } = deps;

  // 1. Get style animations overview
  server.get("/api/mascots/:mascotId/styles/:styleId/animations", async (request, reply) => {
    try {
      const { mascotId, styleId } = MascotStyleAnimationParamsSchema.parse(request.params);
      const mascot = await repository.getMascot(mascotId);
      const style = (mascot.styles || []).find((s) => s.id === styleId);
      if (!style) return sendError(reply, 404, "STYLE_NOT_FOUND", `Style ${styleId} not found`);

      const slots = await animRepo.getStyleSlots(mascotId, styleId);
      const publishEligibility = isStyleAnimationPublishEligible(slots.thinking, slots.celebrate);
      const readiness = getMascotStyleReadiness(style);

      return {
        ok: true,
        mascotId,
        styleId,
        readiness,
        publishEligibility,
        thinking: slots.thinking,
        celebrate: slots.celebrate,
      };
    } catch (err: unknown) {
      return sendError(reply, 404, "NOT_FOUND", (err as Error).message);
    }
  });

  // 2. Plan style animation batch
  server.post("/api/mascots/:mascotId/styles/:styleId/animations/plan", async (request, reply) => {
    try {
      const { mascotId, styleId } = MascotStyleAnimationParamsSchema.parse(request.params);
      const body = PlanStyleAnimationsBodySchema.parse(request.body);
      const mascot = await repository.getMascot(mascotId);
      const plan = planStyleAnimation(mascot, styleId, body);
      const persisted = await persistStylePlan(animRepo, plan);

      return reply.code(200).send({ ok: true, plan, batch: persisted.batch, jobs: persisted.savedJobs });
    } catch (err: unknown) {
      return sendError(reply, 400, "PLANNING_FAILED", (err as Error).message);
    }
  });

  // 3. Start animation batch
  server.post("/api/mascots/:mascotId/animation-batches/:batchId/start", async (request, reply) => {
    try {
      const { mascotId, batchId } = MascotAnimationBatchParamsSchema.parse(request.params);
      const body = StartAnimationBatchBodySchema.parse(request.body);
      const mascot = await repository.getMascot(mascotId);
      const batch = await animRepo.getBatch(mascotId, batchId);
      if (!batch) return sendError(reply, 404, "BATCH_NOT_FOUND", `Batch ${batchId} not found`);

      if (body?.sync) {
        const result = await jobService.runBatch(mascot, batchId, { fixtureMode: body?.fixtureMode });
        return { ok: true, batch: result.batch, jobs: result.jobs };
      }

      // Async execution in background
      jobService.runBatch(mascot, batchId, { fixtureMode: body?.fixtureMode }).catch((err) => {
        logger.error(`Batch ${batchId} execution failed: ${(err as Error).message}`, { step: "anim_batch" });
      });
      return { ok: true, batch: { ...batch, status: "running" } };
    } catch (err: unknown) {
      return sendError(reply, 400, "BATCH_START_FAILED", (err as Error).message);
    }
  });

  // 4. Get batch status
  server.get("/api/mascots/:mascotId/animation-batches/:batchId", async (request, reply) => {
    const { mascotId, batchId } = MascotAnimationBatchParamsSchema.parse(request.params);
    const batch = await animRepo.getBatch(mascotId, batchId);
    if (!batch) return sendError(reply, 404, "BATCH_NOT_FOUND", `Batch ${batchId} not found`);
    const jobs = await animRepo.listJobsByBatch(mascotId, batchId);
    return { ok: true, batch, jobs };
  });

  // 5. Get job status
  server.get("/api/mascots/:mascotId/animation-jobs/:jobId", async (request, reply) => {
    const { mascotId, jobId } = MascotAnimationJobParamsSchema.parse(request.params);
    const job = await animRepo.getJob(mascotId, jobId);
    if (!job) return sendError(reply, 404, "JOB_NOT_FOUND", `Job ${jobId} not found`);
    return { ok: true, job };
  });

  // 6. Retry job
  server.post("/api/mascots/:mascotId/animation-jobs/:jobId/retry", async (request, reply) => {
    try {
      const { mascotId, jobId } = MascotAnimationJobParamsSchema.parse(request.params);
      const body = RetryAnimationJobBodySchema.parse(request.body);
      const mascot = await repository.getMascot(mascotId);
      const job = await jobService.retryJob(mascotId, jobId, mascot, { fixtureMode: body?.fixtureMode });
      return { ok: true, job };
    } catch (err: unknown) {
      return sendError(reply, 400, "RETRY_FAILED", (err as Error).message);
    }
  });

  // 7. Cancel job
  server.post("/api/mascots/:mascotId/animation-jobs/:jobId/cancel", async (request, reply) => {
    try {
      const { mascotId, jobId } = MascotAnimationJobParamsSchema.parse(request.params);
      const job = await jobService.cancelJob(mascotId, jobId);
      return { ok: true, job };
    } catch (err: unknown) {
      return sendError(reply, 400, "CANCEL_FAILED", (err as Error).message);
    }
  });

  // 8. Curation decision
  server.post("/api/mascots/:mascotId/animation-jobs/:jobId/curation", async (request, reply) => {
    try {
      const { mascotId, jobId } = MascotAnimationJobParamsSchema.parse(request.params);
      const body = CurateAnimationJobBodySchema.parse(request.body);
      const job = await animRepo.getJob(mascotId, jobId);
      if (!job) return sendError(reply, 404, "JOB_NOT_FOUND", `Job ${jobId} not found`);

      const nextStatus = body.approved ? "ready" : "qa_failed";
      const updatedJob = await animRepo.saveJob({
        ...job,
        status: nextStatus,
        error_message: body.approved ? null : body.notes || "Rejected by curation review",
        updated_at: new Date().toISOString(),
      });
      return { ok: true, job: updatedJob };
    } catch (err: unknown) {
      return sendError(reply, 400, "CURATION_FAILED", (err as Error).message);
    }
  });

  // 9. Publish style animations
  server.post("/api/mascots/:mascotId/styles/:styleId/animations/publish", async (request, reply) => {
    try {
      const { mascotId, styleId } = MascotStyleAnimationParamsSchema.parse(request.params);
      const result = await publishService.publishStyleAnimations(mascotId, styleId);
      return reply.code(200).send(result);
    } catch (err: unknown) {
      if (err instanceof PublishGateError) {
        return sendError(reply, 409, err.code, err.message, {
          readyCount: err.readyCount,
          totalRequired: err.totalRequired,
          missingSlots: err.missingSlots,
        });
      }
      return sendError(reply, 400, "PUBLISH_FAILED", (err as Error).message);
    }
  });
}
