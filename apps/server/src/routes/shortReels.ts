import { randomUUID } from "node:crypto";
import path from "node:path";
import type { FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  CancelShortReelRequestSchema,
  CreateShortReelRequestSchema,
  GenerateShortReelRequestSchema,
  PaginationQuerySchema,
  TaskSchema,
  UpdateShortReelRequestSchema,
  normalizeLegacyPublishing,
  type ReelKey,
  type ShortReelRecord,
  type Task,
} from "@studio/shared";
import { paginateShortReels } from "./paginationUtils.js";
import type { StudioLogger } from "../logger.js";
import { RepositoryError } from "../repository/errors.js";
import type { RepositoryService } from "../repository/service.js";
import { requireCompleteShortReelSource } from "../repository/shortReelSourcePolicy.js";
import { ExportError, exportShortReelPackage } from "../shortReel/exportService.js";
import {
  generateFullReelPackage,
  generateReelCover,
  generateReelPublishingUnit,
  generateReelReferencesUnit,
  generateReelScriptUnit,
  PackageServiceError,
} from "../shortReel/packageService.js";
import { ReferenceError } from "../shortReel/packageImage.js";
import { CoverGenerationError } from "../shortReel/thumbnailAdapter.js";
import { GenerationError } from "../shortReel/generationErrors.js";
import { cancelReelUnitAttempt } from "../shortReel/unitLifecycle.js";
import { readBoundedAsset } from "../shortReel/packageAssets.js";
import { confirmShortReelTopic } from "../shortReel/topicConfirmation.js";
import { createDirectShortReelCandidate } from "../shortReel/directCreation.js";
import type { TaskManager } from "../tasks/manager.js";
import type { LLMClient } from "../utils/promptSanitizer.js";
import type { PortraitImageClient } from "../providers/imageGeneration/imageGeneration.types.js";
import { executeReelGeneration } from "../shortReel/generationWorkflow.js";

export type ShortReelsRouteDeps = {
  repository: RepositoryService;
  tasks?: TaskManager;
  logger: StudioLogger;
  llmClient?: LLMClient | null;
  imageClient?: PortraitImageClient | null;
  executor?: typeof executeReelGeneration;
};

type RouteErrorResponse = { status: number; body: { error: string; code: string } };

function knownErrorResponse(error: unknown): RouteErrorResponse | null {
  if (error instanceof RepositoryError) {
    const status = error.code.endsWith("NOT_FOUND")
      ? 404
      : error.code === "STALE_REVISION" || error.code.includes("CONFLICT")
        ? 409
        : ["INVALID_SOURCE", "INCOMPLETE_SOURCE", "INVALID_SCRIPT", "BANK_EMPTY"].includes(error.code)
          ? 422
          : error.code === "STORAGE_BUSY"
            ? 503
            : 400;
    return { status, body: { error: error.message, code: error.code } };
  }
  if (error instanceof ExportError) {
    const status = ["REVISION_CONFLICT", "STALE_EXPORT"].includes(error.code)
      ? 409
      : ["INCOMPLETE_PACKAGE", "INVALID_SCRIPT", "INVALID_ASSET"].includes(error.code)
        ? 422
        : 400;
    return { status, body: { error: error.message, code: error.code } };
  }
  if (error instanceof PackageServiceError) {
    const status = ["SUPERSEDED_OPERATION", "PENDING_OPERATION", "STALE_DEPENDENCY"].includes(error.code)
      ? 409
      : error.code === "VALIDATION_FAILED" || (error.code as string) === "MISSING_MASCOT"
        ? 422
        : error.code === "STATE_WRITE_FAILED"
          ? 503
          : 400;
    return { status, body: { error: error.message, code: error.code } };
  }
  if (error instanceof GenerationError) {
    const status = ["MISSING_REFERENCE", "ANIMATION_ATLAS_REJECTED", "VALIDATION_FAILED"].includes(String(error.code)) ? 422 : 400;
    return { status, body: { error: error.message, code: String(error.code) } };
  }
  if (error instanceof ReferenceError) {
    const status = ["MISSING_REFERENCE", "ANIMATION_ATLAS_REJECTED"].includes(error.code) ? 422 : 400;
    return { status, body: { error: error.message, code: error.code } };
  }
  if (error instanceof CoverGenerationError) {
    return { status: error.code === "PROVIDER_ERROR" ? 503 : 422, body: { error: error.message, code: error.code } };
  }
  return null;
}

export function registerShortReelsRoutes(deps: ShortReelsRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository, tasks, logger } = deps;

    function handleRouteError(error: unknown, reply: FastifyReply) {
      const known = knownErrorResponse(error);
      if (known) return reply.code(known.status).send(known.body);

      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Validation error", details: error.issues });
      }

      const message = error instanceof Error ? error.message : "Request failed";
      logger.error(`Short-Reels route error: ${message}`, { step: "http_route" });
      return reply.code(500).send({ error: "Internal server error" });
    }

    // List all Short-Reels for a channel
    server.get("/api/channels/:channelId/short-reels", async (request, reply) => {
      const params = request.params as { channelId: string };
      try {
        await repository.getChannel(params.channelId);
        const query = PaginationQuerySchema.parse(request.query);
        const shortReels = await repository.listShortReels(params.channelId);
        const result = paginateShortReels(shortReels, query);
        return {
          short_reels: result.items,
          total: result.total,
          page: result.page,
          limit: result.limit,
          total_pages: result.total_pages,
          pagination: result.pagination,
        };
      } catch (error) {
        return handleRouteError(error, reply);
      }
    });

    // Create a Short-Reel directly from Question Bank
    server.post("/api/channels/:channelId/short-reels", async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as { channelId: string };
      try {
        await repository.getChannel(params.channelId);
        const body = CreateShortReelRequestSchema.parse(request.body);
        const { topicId } = await createDirectShortReelCandidate({
          repository,
          channelId: params.channelId,
          questionId: body.question_id,
        });
        const result = await confirmShortReelTopic({
          repository,
          channelId: params.channelId,
          topicId,
          options: {
            question_count: 1,
            visual_style: body.visual_style,
          },
          llmClient: deps.llmClient,
        });
        return reply.code(201).send({ short_reel: result.short_reel });
      } catch (error) {
        return handleRouteError(error, reply);
      }
    });

    // Get a specific Short-Reel detail by ID
    server.get("/api/channels/:channelId/short-reels/:reelId", async (request, reply) => {
      const params = request.params as { channelId: string; reelId: string };
      try {
        await repository.getChannel(params.channelId);
        const shortReel = await repository.getShortReel({
          channel_id: params.channelId,
          reel_id: params.reelId,
        });
        const task = tasks
          ?.list()
          .find(
            (candidate) =>
              candidate.channel_id === params.channelId &&
              candidate.reel_id === params.reelId &&
              ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(candidate.status),
          );
        return { short_reel: shortReel, task: task ?? null };
      } catch (error) {
        return handleRouteError(error, reply);
      }
    });

    // Delete a Short-Reel
    server.delete("/api/channels/:channelId/short-reels/:reelId", async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as { channelId: string; reelId: string };
      try {
        await repository.getChannel(params.channelId);
        await repository.deleteShortReel({
          channel_id: params.channelId,
          reel_id: params.reelId,
        });
        return { success: true };
      } catch (error) {
        return handleRouteError(error, reply);
      }
    });

    // Edit command with expected revision and idempotency
    server.patch("/api/channels/:channelId/short-reels/:reelId", async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as { channelId: string; reelId: string };
      try {
        await repository.getChannel(params.channelId);
        let rawBody = request.body as any;
        if (
          rawBody &&
          typeof rawBody === "object" &&
          rawBody.command &&
          rawBody.command.kind === "update_publishing" &&
          rawBody.command.publishing &&
          typeof rawBody.command.publishing.hook === "string"
        ) {
          rawBody = {
            ...rawBody,
            command: {
              ...rawBody.command,
              publishing: normalizeLegacyPublishing(rawBody.command.publishing),
            },
          };
        }
        const parsedBody = UpdateShortReelRequestSchema.parse(rawBody);
        const key: ReelKey = { channel_id: params.channelId, reel_id: params.reelId };

        const updated = await repository.updateShortReel(
          key,
          {
            expected_revision: parsedBody.expected_revision,
            request_id: parsedBody.request_id,
          },
          parsedBody.command,
        );

        return { short_reel: updated };
      } catch (error) {
        return handleRouteError(error, reply);
      }
    });

    // Dispatch async generation returning HTTP 202
    server.post("/api/channels/:channelId/short-reels/:reelId/generate", async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as { channelId: string; reelId: string };
      try {
        await repository.getChannel(params.channelId);
        const parsedBody = GenerateShortReelRequestSchema.parse(request.body);
        const key: ReelKey = { channel_id: params.channelId, reel_id: params.reelId };
        const reel = await repository.getShortReel(key);

        if (tasks) {
          const reelTasks = tasks.list().filter((task) => task.channel_id === params.channelId && task.reel_id === params.reelId);
          const replay = reelTasks.find((task) => task.short_reel_request?.request_id === parsedBody.request_id);
          if (replay) {
            const normalizedRequestedMode = parsedBody.mode ?? (parsedBody.target === "package" ? "repair" : "regenerate");
            const replayReq = replay.short_reel_request;
            const normalizedReplayMode = replayReq?.mode ?? (replayReq?.target === "package" ? "repair" : "regenerate");
            if (
              replayReq?.expected_revision !== parsedBody.expected_revision ||
              replayReq?.target !== parsedBody.target ||
              normalizedReplayMode !== normalizedRequestedMode
            ) {
              return reply
                .code(409)
                .send({ error: "Request ID was already used with a different generation request", code: "IDEMPOTENCY_CONFLICT" });
            }
            return reply.code(202).send({ task: replay, short_reel: reel });
          }
          const active = reelTasks.find((task) => ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(task.status));
          if (active) {
            return reply
              .code(409)
              .send({ error: "Another generation operation is currently active for this Short-Reel", code: "CONFLICT" });
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

        // Direct fallback when task manager is not wired (e.g. standalone route test)
        let updated: ShortReelRecord;
        if (deps.executor) {
          updated = await deps.executor(repository, key, parsedBody, {
            llmClient: (deps.llmClient ?? undefined) as any,
            imageClient: (deps.imageClient ?? undefined) as any,
            signal: new AbortController().signal,
            onProgress: async () => {},
          });
        } else if (parsedBody.target === "cover") {
          updated = await generateReelCover(repository, key, "cover-" + randomUUID());
        } else if (parsedBody.target === "references") {
          updated = await generateReelReferencesUnit(repository, key, "references-" + randomUUID());
        } else if (parsedBody.target === "publishing") {
          updated = await generateReelPublishingUnit(repository, key, "publishing-" + randomUUID(), {
            llmClient: deps.llmClient ?? undefined,
          });
        } else if (parsedBody.target === "script") {
          if (!deps.llmClient) {
            return reply.code(503).send({
              error: "LLM client is unavailable to generate script.",
              code: "SERVICE_UNAVAILABLE",
            });
          }
          updated = await generateReelScriptUnit(repository, key, "script-" + randomUUID(), deps.llmClient);
        } else {
          if (!deps.llmClient) {
            return reply.code(503).send({
              error: "Generation service is unavailable. LLM client is required.",
              code: "SERVICE_UNAVAILABLE",
            });
          }
          updated = await executeReelGeneration(repository, key, parsedBody, {
            llmClient: deps.llmClient,
            imageClient: (deps.imageClient ?? undefined) as any,
            signal: new AbortController().signal,
            onProgress: async () => {},
          });
        }
        const completedTask = TaskSchema.parse({
          task_id: `task-${parsedBody.request_id}`,
          task_type: "GENERATE_SHORT_REEL_PACKAGE",
          channel_id: params.channelId,
          episode_id: null,
          reel_id: params.reelId,
          short_reel_request: parsedBody,
          status: "COMPLETED",
          created_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          lock_key: `${params.reelId}:reel`,
          progress_message: "Completed",
        });

        return reply.code(202).send({ task: completedTask, short_reel: updated });
      } catch (error) {
        return handleRouteError(error, reply);
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

        let updatedReel: ShortReelRecord = await repository.getShortReel(key);
        const acknowledged = cancelledTask !== null || matchesUnit;
        if (!acknowledged) {
          return { acknowledged: false, short_reel: updatedReel, task: null };
        }
        const unitKeys = ["script", "references", "cover", "publishing"] as const;
        for (const unitKey of unitKeys) {
          const unit = updatedReel.units[unitKey];
          if (unit.state === "pending" && unit.current_attempt) {
            const shouldCancel = unit.current_attempt.operation_id === parsedBody.operation_id || cancelledTask !== null;
            if (shouldCancel) {
              updatedReel = await cancelReelUnitAttempt(repository, key, unitKey, unit.current_attempt.operation_id);
            }
          }
        }

        return {
          acknowledged,
          short_reel: updatedReel,
          task: cancelledTask,
        };
      } catch (error) {
        return handleRouteError(error, reply);
      }
    });

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
        return handleRouteError(error, reply);
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
        // Ensure reel exists
        await repository.getShortReel(key);

        const zipBuffer = await exportShortReelPackage(repository, key, revision);

        reply.header("Content-Type", "application/zip");
        reply.header("Content-Disposition", `attachment; filename="short-reel-${params.reelId}-rev${revision}.zip"`);
        return reply.send(zipBuffer);
      } catch (error) {
        return handleRouteError(error, reply);
      }
    });

    done();
  };
}
