import type { FastifyPluginCallback } from "fastify";
import { readFile, stat } from "node:fs/promises";
import {
  GenerateVideoDescriptionInputSchema,
  GenerateVideoTitleInputSchema,
  quizShortProductRef,
  type VideoDescription,
} from "@studio/shared";
import type { AntigravityClient } from "../antigravity.js";
import type { CodexAppServerClient } from "../codex.js";
import type { PortraitImageClient } from "../providers/imageGeneration/imageGeneration.types.js";
import { generateProductDescription, generateProductTitle } from "../quiz/pipeline/orchestrator.js";
import { readQuizShortCoverManifest } from "../quiz/thumbnail/quizShortCoverManifest.js";
import { generateQuizShortCoverForProduct } from "../quiz/thumbnail/quizShortCoverService.js";
import type { RepositoryService } from "../repository.js";
import type { TaskManager } from "../tasks.js";
import type { LLMClient } from "../utils/promptSanitizer.js";
import type { AppState } from "./state.js";

export type QuizShortMetadataRouteDeps = {
  repository: RepositoryService;
  tasks: TaskManager;
  codex: CodexAppServerClient;
  antigravity: AntigravityClient;
  state: AppState;
  portraitImageClient: PortraitImageClient;
  llmClient?: LLMClient | null;
};

type QuizShortParams = { channelId: string; quizShortId: string };

function parseBody(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

/**
 * Quiz Short cover, title and description endpoints. They mirror the Episode thumbnail and
 * quiz-v2 title/description routes, writing into the Quiz Short product directory.
 */
export function registerQuizShortMetadataRoutes(deps: QuizShortMetadataRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository, tasks, codex, antigravity, state } = deps;
    const metadataDeps = (params: QuizShortParams) => ({
      repository,
      config: state.config,
      channelId: params.channelId,
      episodeId: params.quizShortId,
      product: quizShortProductRef(params.channelId, params.quizShortId),
      activeEngine: tasks.getActiveEngine(),
      antigravityClient: antigravity,
      codexClient: codex,
      portraitImageClient: deps.portraitImageClient,
    });

    const syncDescription = async (params: QuizShortParams): Promise<VideoDescription | null> => {
      try {
        return (await generateProductDescription(metadataDeps(params))).description;
      } catch {
        return repository.readVideoDescription(params.channelId, params.quizShortId);
      }
    };

    server.post("/api/channels/:channelId/quiz-shorts/:quizShortId/thumbnail/generate", async (request, reply) => {
      const params = request.params as QuizShortParams;
      const result = await generateQuizShortCoverForProduct({
        repository,
        channelId: params.channelId,
        quizShortId: params.quizShortId,
        portraitImageClient: deps.portraitImageClient,
        llmClient: deps.llmClient ?? (tasks.getActiveEngine() === "antigravity" ? antigravity : codex),
        force: true,
      });
      return reply.code(200).send({ ok: true, manifest: result.manifest });
    });

    server.get("/api/channels/:channelId/quiz-shorts/:quizShortId/thumbnail", async (request, reply) => {
      const params = request.params as QuizShortParams;
      const quizShort = await repository.getQuizShort(params.channelId, params.quizShortId);
      const manifest = await readQuizShortCoverManifest(repository, params.channelId, params.quizShortId);
      return reply.code(200).send({ manifest, asset_path: quizShort.thumbnail_asset_path_9_16 });
    });

    server.get("/api/channels/:channelId/quiz-shorts/:quizShortId/thumbnail/file", async (request, reply) => {
      const params = request.params as QuizShortParams;
      const quizShort = await repository.getQuizShort(params.channelId, params.quizShortId);
      if (!quizShort.thumbnail_asset_path_9_16) return reply.code(404).send({ error: "Thumbnail asset not found" });
      try {
        const filePath = repository.resolveContextPath(quizShort.thumbnail_asset_path_9_16);
        const [buffer, stats] = await Promise.all([readFile(filePath), stat(filePath)]);
        void reply.header("Content-Type", "image/png");
        void reply.header("Content-Length", stats.size);
        return reply.send(buffer);
      } catch {
        return reply.code(404).send({ error: "Thumbnail asset not found" });
      }
    });

    server.get("/api/channels/:channelId/quiz-shorts/:quizShortId/title", async (request) => {
      const params = request.params as QuizShortParams;
      return { title: await repository.readVideoTitle(params.channelId, params.quizShortId) };
    });

    server.post("/api/channels/:channelId/quiz-shorts/:quizShortId/title/generate", async (request) => {
      const params = request.params as QuizShortParams;
      const input = GenerateVideoTitleInputSchema.parse(parseBody(request.body));
      const { title, artifact_path } = await generateProductTitle({ ...metadataDeps(params), toneHint: input.tone_hint });
      const description = await syncDescription(params);
      return { title, description, artifact_path };
    });

    server.get("/api/channels/:channelId/quiz-shorts/:quizShortId/description", async (request) => {
      const params = request.params as QuizShortParams;
      return { description: await repository.readVideoDescription(params.channelId, params.quizShortId) };
    });

    server.post("/api/channels/:channelId/quiz-shorts/:quizShortId/description/generate", async (request) => {
      const params = request.params as QuizShortParams;
      const input = GenerateVideoDescriptionInputSchema.parse(parseBody(request.body));
      return generateProductDescription({ ...metadataDeps(params), toneHint: input.tone_hint, force: input.force });
    });

    done();
  };
}
