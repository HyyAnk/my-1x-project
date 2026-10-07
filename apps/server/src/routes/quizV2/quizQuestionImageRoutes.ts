import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import {
  GenerateQuestionImageInputSchema,
  QuestionImagesOverviewResponseSchema,
  ResetQuestionImageResponseSchema,
  UploadQuestionImageInputSchema,
  UploadQuestionImageResponseSchema,
} from "@studio/shared";
import { RepositoryError } from "../../repository.js";
import type { QuizV2RouteDeps } from "./quizV2Types.js";
import {
  buildQuestionIdCandidates,
  buildSlotAliases,
  decodeBase64Image,
  isAssetForQuestion,
  matchesSlot,
  resolveImageContentType,
} from "./questionImageRouteHelpers.js";

/**
 * Registers REST API endpoints for question images management and manual upload.
 */
export function registerQuizQuestionImageRoutes(server: FastifyInstance, deps: QuizV2RouteDeps): void {
  const { repository, tasks, state } = deps;

  server.get("/api/channels/:channelId/episodes/:episodeId/question-images", async (request) => {
    const params = request.params as { channelId: string; episodeId: string };
    const overview = await repository.listEpisodeQuestionImages(params.channelId, params.episodeId);
    return QuestionImagesOverviewResponseSchema.parse(overview);
  });

  server.post("/api/channels/:channelId/episodes/:episodeId/questions/:questionNumber/image/upload", async (request, reply) => {
    const params = request.params as { channelId: string; episodeId: string; questionNumber: string };
    const query = (request.query as { slotId?: string; assetId?: string } | undefined) ?? {};
    const questionNumber = Number(params.questionNumber);
    if (!Number.isInteger(questionNumber) || questionNumber < 1) {
      throw new RepositoryError("Invalid question number", "INVALID_QUESTION_NUMBER");
    }

    const input = UploadQuestionImageInputSchema.parse(request.body);
    const content = decodeBase64Image(input.data);

    if (content.byteLength > 15 * 1024 * 1024) {
      throw new RepositoryError("Image exceeds 15MB file size limit", "IMAGE_TOO_LARGE");
    }

    const targetSlotId = query.slotId || input.slot_id;
    const targetAssetId = query.assetId || input.asset_id;

    const result = await repository.saveUploadedQuestionImage(
      params.channelId,
      params.episodeId,
      questionNumber,
      content,
      input.filename,
      { slotId: targetSlotId, assetId: targetAssetId },
    );

    const response = UploadQuestionImageResponseSchema.parse({
      success: true,
      item: result.item,
      invalidated: result.invalidated,
    });

    return reply.code(200).send(response);
  });

  server.delete("/api/channels/:channelId/episodes/:episodeId/questions/:questionNumber/image/custom", async (request, reply) => {
    const params = request.params as { channelId: string; episodeId: string; questionNumber: string };
    const query = (request.query as { slotId?: string; assetId?: string } | undefined) ?? {};
    const questionNumber = Number(params.questionNumber);
    if (!Number.isInteger(questionNumber) || questionNumber < 1) {
      throw new RepositoryError("Invalid question number", "INVALID_QUESTION_NUMBER");
    }

    const result = await repository.deleteUploadedQuestionImage(
      params.channelId,
      params.episodeId,
      questionNumber,
      { slotId: query.slotId, assetId: query.assetId },
    );

    const response = ResetQuestionImageResponseSchema.parse({
      success: true,
      item: result.item,
      invalidated: result.invalidated,
    });

    return reply.code(200).send(response);
  });

  server.post("/api/channels/:channelId/episodes/:episodeId/questions/:questionNumber/image/generate", async (request, reply) => {
    const params = request.params as { channelId: string; episodeId: string; questionNumber: string };
    const questionNumber = Number(params.questionNumber);
    if (!Number.isInteger(questionNumber) || questionNumber < 1) {
      throw new RepositoryError("Invalid question number", "INVALID_QUESTION_NUMBER");
    }

    if (!state.config.image_generation.enabled) {
      throw new RepositoryError("Image generation is disabled in Settings", "IMAGE_GENERATION_DISABLED");
    }

    GenerateQuestionImageInputSchema.parse(request.body ?? {});

    const task = tasks.submit("GENERATE_BUNDLE_IMAGE", params.channelId, params.episodeId, questionNumber);
    return reply.code(202).send({ task });
  });

  server.get("/api/channels/:channelId/episodes/:episodeId/questions/:questionNumber/image", async (request, reply) => {
    const params = request.params as { channelId: string; episodeId: string; questionNumber: string };
    const query = (request.query as { slotId?: string; assetId?: string } | undefined) ?? {};
    const questionNumber = Number(params.questionNumber);
    if (!Number.isInteger(questionNumber) || questionNumber < 1) {
      throw new RepositoryError("Invalid question number", "INVALID_QUESTION_NUMBER");
    }

    const [quiz, resolution] = await Promise.all([
      repository.readQuiz(params.channelId, params.episodeId),
      repository.readQuizAssetResolution(params.channelId, params.episodeId),
    ]);

    const targetQuestion = quiz?.questions.find((q) => q.number === questionNumber);
    const qCandidates = buildQuestionIdCandidates(questionNumber, targetQuestion?.id);

    if (query.slotId || query.assetId) {
      const normSlot = query.slotId?.toLowerCase();
      const slotAliases = normSlot ? buildSlotAliases(normSlot, targetQuestion) : new Set<string>();

      const resolved = resolution?.assets.find((a) => {
        if (query.assetId && a.asset_id === query.assetId) return true;
        if (normSlot) return isAssetForQuestion(a, qCandidates) && matchesSlot(a, normSlot, slotAliases);
        return false;
      });

      if (resolved?.path) {
        const absolutePath = await repository.resolveQuizAssetPath(params.channelId, params.episodeId, resolved.path);
        const metadata = await stat(absolutePath);
        return reply
          .headers({
            "content-type": resolveImageContentType(resolved.path),
            "content-length": metadata.size,
            "last-modified": metadata.mtime.toISOString(),
            "cache-control": "no-store",
            "content-disposition": "inline",
          })
          .send(createReadStream(absolutePath));
      }
    }

    const bundleTarget = await repository.getBundleImagePath(params.channelId, params.episodeId, questionNumber);
    if (await repository.exists(bundleTarget.absolutePath)) {
      const file = await repository.getBundleImageFile(params.channelId, params.episodeId, bundleTarget.filename);
      return reply
        .headers({
          "content-type": "image/png",
          "content-length": file.size,
          "last-modified": file.modified_at,
          "cache-control": "no-store",
          "content-disposition": `inline; filename="${file.filename}"`,
        })
        .send(createReadStream(file.absolutePath));
    }

    const resolved = resolution?.assets.find(
      (a) =>
        isAssetForQuestion(a, qCandidates) &&
        (a.purpose === "hero_question_image" || Boolean(a.asset_id?.includes("hero"))),
    ) ?? resolution?.assets.find((a) => isAssetForQuestion(a, qCandidates));

    if (resolved?.path) {
      const absolutePath = await repository.resolveQuizAssetPath(params.channelId, params.episodeId, resolved.path);
      const metadata = await stat(absolutePath);
      return reply
        .headers({
          "content-type": resolveImageContentType(resolved.path),
          "content-length": metadata.size,
          "last-modified": metadata.mtime.toISOString(),
          "cache-control": "no-store",
          "content-disposition": "inline",
        })
        .send(createReadStream(absolutePath));
    }

    throw new RepositoryError("Question image not found", "IMAGE_NOT_FOUND");
  });
}
