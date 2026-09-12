import path from "node:path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  CancelShortReelRequestSchema,
  GenerateShortReelRequestSchema,
  type ReelKey,
  type ShortReelRecord,
  type Task,
} from "@studio/shared";
import { RepositoryError } from "../../repository/errors.js";
import { requireCompleteShortReelSource } from "../../repository/shortReelSourcePolicy.js";
import { exportShortReelPackage } from "../../shortReel/exportService.js";
import { readBoundedAsset } from "../../shortReel/packageAssets.js";
import { handleRouteError } from "./shortReelsErrorMapper.js";
import type { ShortReelsRouteDeps } from "./shortReelsTypes.js";
import {
  buildSyntheticCompletedTask,
  cancelMatchingPendingUnits,
  checkTaskReplayOrConflict,
  runDirectFallbackGeneration,
} from "./shortReelsActionHelpers.js";

/**
 * Registers action endpoints for Short-Reels: generate, cancel, assets, and export.
 */
export function registerShortReelsActionRoutes(server: FastifyInstance, deps: ShortReelsRouteDeps): void {
  const { repository, tasks, logger } = deps;

  // Dispatch async generation returning HTTP 202
  server.post("/api/channels/:channelId/short-reels/:reelId/generate", async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { channelId: string; reelId: string };
    try {
      await repository.getChannel(params.channelId);
      const parsedBody = GenerateShortReelRequestSchema.parse(request.body);
      const key: ReelKey = { channel_id: params.channelId, reel_id: params.reelId };
      const reel = await repository.getShortReel(key);

      if (tasks) {
        const check = checkTaskReplayOrConflict(tasks, params.channelId, params.reelId, parsedBody, reel);
        if (check.kind === "replay") {
          return reply.code(check.statusCode).send(check.body);
        }
        if (check.kind === "active_conflict") {
          return reply.code(409).send({
            error: "Another generation operation is currently active for this Short-Reel",
            code: "CONFLICT",
          });
        }
      }

      if (parsedBody.expected_revision !== reel.revision) {
        throw new RepositoryError("Stale revision for short reel", "STALE_REVISION");
      }

      requireCompleteShortReelSource(reel.source);

      if (tasks) {
        const task = tasks.submitShortReel(params.channelId, params.reelId, parsedBody);
        return reply.code(202).send({ task, short_reel: reel });
      }

      const result = await runDirectFallbackGeneration(deps, key, parsedBody);
      if ("unavailableError" in result) {
        return reply.code(503).send({ error: result.unavailableError, code: "SERVICE_UNAVAILABLE" });
      }

      const completedTask = buildSyntheticCompletedTask(params.channelId, params.reelId, parsedBody);
      return reply.code(202).send({ task: completedTask, short_reel: result });
    } catch (error) {
      return handleRouteError(error, reply, logger);
    }
  });

  // Cancel active operation or task
  server.post("/api/channels/:channelId/short-reels/:reelId/cancel", async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { channelId: string; reelId: string };
    try {
      await repository.getChannel(params.channelId);
      const parsedBody = CancelShortReelRequestSchema.parse(request.body);
      const key: ReelKey = { channel_id: params.channelId, reel_id: params.reelId };
      const reel = await repository.getShortReel(key);

      const pendingUnits = (["script", "references", "cover", "publishing"] as const).filter(
        (unitKey) => reel.units[unitKey].state === "pending" && reel.units[unitKey].current_attempt,
      );
      const matchesUnit = pendingUnits.some((unitKey) => reel.units[unitKey].current_attempt?.operation_id === parsedBody.operation_id);
      let cancelledTask: Task | null = null;

      if (tasks) {
        const active = tasks
          .list()
          .find((t) => t.reel_id === params.reelId && ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(t.status));
        if (active && (active.task_id === parsedBody.operation_id || matchesUnit)) {
          cancelledTask = await tasks.cancel(active.task_id);
        }
      }

      const acknowledged = cancelledTask !== null || matchesUnit;
      if (!acknowledged) {
        return { acknowledged: false, short_reel: reel, task: null };
      }

      const updatedReel = await cancelMatchingPendingUnits(repository, key, reel, parsedBody.operation_id, cancelledTask);
      return { acknowledged, short_reel: updatedReel, task: cancelledTask };
    } catch (error) {
      return handleRouteError(error, reply, logger);
    }
  });

  // Read bounded asset
  server.get("/api/channels/:channelId/short-reels/:reelId/assets/:assetId", async (request, reply) => {
    const params = request.params as { channelId: string; reelId: string; assetId: string };
    try {
      const key: ReelKey = { channel_id: params.channelId, reel_id: params.reelId };
      const reel = await repository.getShortReel(key);
      const references = reel.units.references.last_accepted_payload?.references ?? [];
      const cover = reel.units.cover.last_accepted_payload;
      const asset = [...references, ...(cover ? [cover] : [])].find((candidate) => candidate.asset_id === params.assetId);
      if (!asset) throw new RepositoryError("Short-Reel asset not found", "SHORT_REEL_ASSET_NOT_FOUND");

      const absolutePath = path.resolve(repository.storageRoot, asset.path);
      await repository.assertRealPathInside(repository.storageRoot, absolutePath);
      const bytes = await readBoundedAsset(repository, repository.storageRoot, absolutePath);
      reply.header("Cache-Control", "private, no-store");
      reply.header("Content-Disposition", `inline; filename="${asset.asset_id}"`);
      return reply.type(asset.mime_type).send(bytes);
    } catch (error) {
      return handleRouteError(error, reply, logger);
    }
  });

  // Export PKZIP archive with numeric revision
  server.get("/api/channels/:channelId/short-reels/:reelId/export", async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { channelId: string; reelId: string };
    const query = request.query as { revision?: string };

    try {
      await repository.getChannel(params.channelId);
      const revision = Number(query.revision);
      if (!Number.isInteger(revision) || revision < 1) {
        return reply.code(400).send({
          error: "Query parameter 'revision' must be a valid positive integer.",
          code: "INVALID_REVISION",
        });
      }

      const key: ReelKey = { channel_id: params.channelId, reel_id: params.reelId };
      await repository.getShortReel(key);

      const zipBuffer = await exportShortReelPackage(repository, key, revision);
      reply.header("Content-Type", "application/zip");
      reply.header("Content-Disposition", `attachment; filename="short-reel-${params.reelId}-rev${revision}.zip"`);
      return reply.send(zipBuffer);
    } catch (error) {
      return handleRouteError(error, reply, logger);
    }
  });
}
