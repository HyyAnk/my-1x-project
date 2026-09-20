import type { FastifyInstance } from "fastify";
import {
  CancelSlotGenerationInputSchema,
  QueueSlotGenerationInputSchema,
  type MascotSlotBatchJob,
  type SlotBatchStatusResponse,
} from "@studio/shared";
import {
  createMascotSlotJobManager,
  createMascotSlotJobRepository,
  type MascotSlotJobManager,
} from "../../../quiz/mascot/slotJobs/index.js";
import type { MascotsRouteDeps } from "../mascotTypes.js";

/**
 * Resolves the MascotSlotJobManager from route dependencies or creates a fallback instance.
 */
export function resolveSlotJobManager(deps: MascotsRouteDeps): MascotSlotJobManager {
  if (deps.mascotSlotJobManager) {
    return deps.mascotSlotJobManager;
  }
  const jobRepository = createMascotSlotJobRepository(deps.repository);
  const manager = createMascotSlotJobManager({
    repository: deps.repository,
    jobRepository,
    imageConfig: deps.state.config.image_generation,
    imageFallbackConfig: deps.state.config.image_fallback,
    logger: deps.logger,
  });
  deps.mascotSlotJobManager = manager;
  return manager;
}

/**
 * Registers mascot style slot generation background job endpoints:
 * - POST /api/mascots/:mascotId/styles/:styleId/jobs/queue
 * - GET  /api/mascots/:mascotId/styles/:styleId/jobs/status
 * - POST /api/mascots/:mascotId/styles/:styleId/jobs/cancel
 */
export function registerMascotSlotJobRoutes(server: FastifyInstance, deps: MascotsRouteDeps): void {
  const { repository } = deps;

  /**
   * Enqueues a slot generation batch job.
   * Returns 202 Accepted immediately while generation proceeds in the background.
   */
  server.post("/api/mascots/:mascotId/styles/:styleId/jobs/queue", async (request, reply) => {
    const { mascotId, styleId } = request.params as { mascotId: string; styleId: string };
    const rawBody = typeof request.body === "object" && request.body !== null ? request.body : {};

    const bodyStyleId = "style_id" in rawBody && typeof rawBody.style_id === "string" ? rawBody.style_id : undefined;
    if (bodyStyleId && bodyStyleId !== styleId) {
      return reply.code(400).send({
        error: `Path parameter styleId "${styleId}" does not match body style_id "${bodyStyleId}"`,
      });
    }

    const input = QueueSlotGenerationInputSchema.parse({ ...rawBody, style_id: styleId });
    const mascot = await repository.getMascot(mascotId);
    const style = (mascot.styles || []).find((s) => s.id === styleId);
    if (!style) {
      return reply.code(404).send({ error: `Style "${styleId}" not found for mascot "${mascotId}"` });
    }

    const jobManager = resolveSlotJobManager(deps);
    const batch: MascotSlotBatchJob = await jobManager.enqueueBatch(mascotId, input);
    return reply.code(202).send(batch);
  });

  /**
   * Retrieves current batch status and recent batch history for frequent client polling.
   */
  server.get("/api/mascots/:mascotId/styles/:styleId/jobs/status", async (request, reply) => {
    const { mascotId, styleId } = request.params as { mascotId: string; styleId: string };
    const mascot = await repository.getMascot(mascotId);
    const style = (mascot.styles || []).find((s) => s.id === styleId);
    if (!style) {
      return reply.code(404).send({ error: `Style "${styleId}" not found for mascot "${mascotId}"` });
    }

    const jobManager = resolveSlotJobManager(deps);
    const status: SlotBatchStatusResponse = await jobManager.getBatchStatus(mascotId, styleId);
    return reply.code(200).send(status);
  });

  /**
   * Cancels an in-flight slot generation batch for the mascot style.
   */
  server.post("/api/mascots/:mascotId/styles/:styleId/jobs/cancel", async (request, reply) => {
    const { mascotId, styleId } = request.params as { mascotId: string; styleId: string };
    const rawBody = typeof request.body === "object" && request.body !== null ? request.body : {};

    const bodyStyleId = "style_id" in rawBody && typeof rawBody.style_id === "string" ? rawBody.style_id : undefined;
    if (bodyStyleId && bodyStyleId !== styleId) {
      return reply.code(400).send({
        error: `Path parameter styleId "${styleId}" does not match body style_id "${bodyStyleId}"`,
      });
    }

    const input = CancelSlotGenerationInputSchema.parse({ ...rawBody, style_id: styleId });
    const mascot = await repository.getMascot(mascotId);
    const style = (mascot.styles || []).find((s) => s.id === styleId);
    if (!style) {
      return reply.code(404).send({ error: `Style "${styleId}" not found for mascot "${mascotId}"` });
    }

    const jobManager = resolveSlotJobManager(deps);
    const cancelledBatch = await jobManager.cancelBatch(mascotId, input);
    if (!cancelledBatch) {
      return reply.code(404).send({
        ok: false,
        error: `No active or matching batch found to cancel for style "${styleId}"`,
        batch: null,
      });
    }

    return reply.code(200).send({
      ok: true,
      batch: cancelledBatch,
      ...cancelledBatch,
    });
  });
}
