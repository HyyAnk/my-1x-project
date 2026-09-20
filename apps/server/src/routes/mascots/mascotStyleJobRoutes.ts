/**
 * Mascot Style Concept Generation Background Job Routes
 *
 * Provides endpoints for enqueuing style concept generations,
 * monitoring queue status across reloads, and cancelling in-flight batches.
 */

import type { FastifyInstance } from "fastify";
import {
  CancelStyleGenerationInputSchema,
  QueueStyleGenerationInputSchema,
  type MascotStyleBatchJob,
  type StyleBatchStatusResponse,
} from "@studio/shared";
import {
  createMascotStyleJobManager,
  createMascotStyleJobRepository,
  type MascotStyleJobManager,
} from "../../quiz/mascot/styleJobs/index.js";
import type { MascotsRouteDeps } from "./mascotTypes.js";

/**
 * Resolves the MascotStyleJobManager from route dependencies or creates a fallback instance.
 */
export function resolveStyleJobManager(deps: MascotsRouteDeps): MascotStyleJobManager {
  if (deps.mascotStyleJobManager) {
    return deps.mascotStyleJobManager;
  }
  const jobRepository = createMascotStyleJobRepository(deps.repository);
  const manager = createMascotStyleJobManager({
    repository: deps.repository,
    jobRepository,
    imageConfig: deps.state.config.image_generation,
    imageFallbackConfig: deps.state.config.image_fallback,
    logger: deps.logger,
  });
  deps.mascotStyleJobManager = manager;
  return manager;
}

/**
 * Registers mascot style concept generation background job endpoints:
 * - POST /api/mascots/:mascotId/styles/jobs/queue
 * - GET  /api/mascots/:mascotId/styles/jobs/status
 * - POST /api/mascots/:mascotId/styles/jobs/cancel
 */
export function registerMascotStyleJobRoutes(server: FastifyInstance, deps: MascotsRouteDeps): void {
  const { repository } = deps;

  /**
   * Enqueues one or more style concept generation jobs.
   * Returns 202 Accepted immediately while generation proceeds in the background.
   */
  server.post("/api/mascots/:mascotId/styles/jobs/queue", async (request, reply) => {
    const { mascotId } = request.params as { mascotId: string };
    const rawBody = typeof request.body === "object" && request.body !== null ? request.body : {};
    const input = QueueStyleGenerationInputSchema.parse(rawBody);

    const mascot = await repository.getMascot(mascotId);
    if (!mascot) {
      return reply.code(404).send({ error: `Mascot "${mascotId}" not found` });
    }

    const availableStyleIds = new Set(["core", ...(mascot.styles || []).map((s) => s.id)]);

    for (const item of input.styles) {
      if (!availableStyleIds.has(item.style_id)) {
        return reply.code(404).send({ error: `Style "${item.style_id}" not found for mascot "${mascotId}"` });
      }
    }

    const jobManager = resolveStyleJobManager(deps);
    const batch: MascotStyleBatchJob = await jobManager.enqueueBatch(mascotId, input);
    return reply.code(202).send(batch);
  });

  /**
   * Retrieves current style concept batch status and recent batch history for frequent client polling.
   */
  server.get("/api/mascots/:mascotId/styles/jobs/status", async (request, reply) => {
    const { mascotId } = request.params as { mascotId: string };
    const mascot = await repository.getMascot(mascotId);
    if (!mascot) {
      return reply.code(404).send({ error: `Mascot "${mascotId}" not found` });
    }

    const jobManager = resolveStyleJobManager(deps);
    const status: StyleBatchStatusResponse = await jobManager.getBatchStatus(mascotId);
    return reply.code(200).send(status);
  });

  /**
   * Cancels an in-flight style concept batch or specific style.
   */
  server.post("/api/mascots/:mascotId/styles/jobs/cancel", async (request, reply) => {
    const { mascotId } = request.params as { mascotId: string };
    const rawBody = typeof request.body === "object" && request.body !== null ? request.body : {};
    const input = CancelStyleGenerationInputSchema.parse(rawBody);

    const mascot = await repository.getMascot(mascotId);
    if (!mascot) {
      return reply.code(404).send({ error: `Mascot "${mascotId}" not found` });
    }

    const jobManager = resolveStyleJobManager(deps);
    const cancelledBatch = await jobManager.cancelBatch(mascotId, input);
    if (!cancelledBatch) {
      return reply.code(404).send({
        ok: false,
        error: `No active batch found to cancel for mascot "${mascotId}"`,
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
