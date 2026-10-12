import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { FastifyPluginCallback, FastifyReply } from "fastify";
import { QuizShortBookendKindSchema } from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import { RepositoryError } from "../repository/errors.js";
import {
  CreateQuizShortBookendPairInputSchema,
  UpdateQuizShortBookendPairInputSchema,
  createQuizShortBookendDeps,
} from "../quizShortBookends/index.js";

export type QuizShortBookendRouteDeps = { repository: RepositoryService };

const BASE = "/api/channels/:channelId/quiz-short-bookends";

type PairParams = { channelId: string; pairId: string };
type MediaParams = PairParams & { kind: string };

async function streamFile(reply: FastifyReply, filePath: string, contentType: string) {
  const fileStat = await stat(filePath);
  return reply
    .headers({ "content-type": contentType, "content-length": fileStat.size, "cache-control": "no-cache" })
    .send(createReadStream(filePath));
}

/** Short Intro & Outro pairs: list, categories, upload, update, delete and media streaming. */
export function registerQuizShortBookendRoutes({ repository }: QuizShortBookendRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { store, service } = createQuizShortBookendDeps(repository);

    server.get("/api/channels/:channelId/quiz-short-bookend-categories", async (request) => {
      const { channelId } = request.params as { channelId: string };
      return { categories: await service.listCategories(channelId) };
    });

    server.get(BASE, async (request) => {
      const { channelId } = request.params as { channelId: string };
      const { style_preset_id: stylePresetId } = request.query as { style_preset_id?: string };
      const pairs = await store.listPairs(channelId);
      return { pairs: stylePresetId ? pairs.filter((pair) => pair.style_preset_id === stylePresetId) : pairs };
    });

    server.post(BASE, { bodyLimit: 250 * 1024 * 1024 }, async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      await repository.getChannel(channelId);
      const pair = await service.create(channelId, CreateQuizShortBookendPairInputSchema.parse(request.body));
      return reply.status(201).send({ pair });
    });

    server.patch(`${BASE}/:pairId`, async (request) => {
      const { channelId, pairId } = request.params as PairParams;
      return { pair: await service.update(channelId, pairId, UpdateQuizShortBookendPairInputSchema.parse(request.body)) };
    });

    server.delete(`${BASE}/:pairId`, async (request) => {
      const { channelId, pairId } = request.params as PairParams;
      await service.delete(channelId, pairId);
      return { ok: true };
    });

    server.get(`${BASE}/:pairId/clips/:kind`, async (request, reply) => {
      const { channelId, pairId, kind } = request.params as MediaParams;
      const clipPath = await store.clipPath(channelId, pairId, QuizShortBookendKindSchema.parse(kind));
      return streamFile(reply, clipPath, "video/mp4");
    });

    server.get(`${BASE}/:pairId/thumbs/:kind`, async (request, reply) => {
      const { channelId, pairId, kind } = request.params as MediaParams;
      const thumbPath = await store.thumbPath(channelId, pairId, QuizShortBookendKindSchema.parse(kind));
      if (!thumbPath) throw new RepositoryError("Thumbnail not found", "NOT_FOUND");
      return streamFile(reply, thumbPath, "image/jpeg");
    });

    done();
  };
}
