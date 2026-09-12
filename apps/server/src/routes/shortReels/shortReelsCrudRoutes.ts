import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  CreateShortReelRequestSchema,
  PaginationQuerySchema,
  UpdateShortReelRequestSchema,
  normalizeLegacyPublishing,
  type ReelKey,
} from "@studio/shared";
import { paginateShortReels } from "../paginationUtils.js";
import { createDirectShortReelCandidate } from "../../shortReel/directCreation.js";
import { confirmShortReelTopic } from "../../shortReel/topicConfirmation.js";
import { handleRouteError } from "./shortReelsErrorMapper.js";
import type { ShortReelsRouteDeps } from "./shortReelsTypes.js";

/**
 * Registers CRUD endpoints for Short-Reels: list, direct creation, get detail, delete, and patch.
 */
export function registerShortReelsCrudRoutes(server: FastifyInstance, deps: ShortReelsRouteDeps): void {
  const { repository, tasks, logger } = deps;

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
      return handleRouteError(error, reply, logger);
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
      return handleRouteError(error, reply, logger);
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
      return handleRouteError(error, reply, logger);
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
      return handleRouteError(error, reply, logger);
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
      return handleRouteError(error, reply, logger);
    }
  });
}
