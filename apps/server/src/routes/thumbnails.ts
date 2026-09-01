import type { FastifyPluginCallback } from "fastify";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  ThumbnailAspectRatioSchema,
  ThumbnailGenerationRequestSchema,
  ThumbnailLayoutTypeSchema,
  type ThumbnailLayoutType,
} from "@studio/shared";
import { z } from "zod";
import type { RepositoryService } from "../repository.js";
import type { AppState } from "./state.js";
import { generateEpisodeThumbnail, getEpisodeThumbnailManifest } from "../quiz/thumbnail/index.js";
import type { AntigravityClient } from "../antigravity.js";

export type ThumbnailsRouteDeps = {
  repository: RepositoryService;
  state: AppState;
  antigravity?: AntigravityClient;
};

const GenerateThumbnailBodySchema = z
  .object({
    layout_override: ThumbnailLayoutTypeSchema.optional(),
    aspect_ratio: z.union([ThumbnailAspectRatioSchema, z.literal("both"), z.literal("auto")]).default("auto"),
    custom_hook_text: z.string().optional(),
  })
  .default({});


export function registerThumbnailsRoutes(deps: ThumbnailsRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository, state, antigravity } = deps;

    // 1. Generate Thumbnail Endpoint
    server.post("/api/channels/:channelId/episodes/:episodeId/thumbnail/generate", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string };
      const body = GenerateThumbnailBodySchema.parse(request.body || {});

      const manifest = await generateEpisodeThumbnail(repository, {
        channelId: params.channelId,
        episodeId: params.episodeId,
        layoutOverride: body.layout_override,
        aspectRatio: body.aspect_ratio,
        customHookText: body.custom_hook_text,
        activeEngine: state.config.active_engine,
        antigravityClient: antigravity,
        imageConfig: {
          api_key: state.config.image_generation?.api_key || process.env.GEMINI_API_KEY,
          model: state.config.image_generation?.model,
          provider: state.config.image_generation?.provider as any,
          base_url: state.config.image_generation?.base_url,
        },
      });

      return reply.code(200).send({ ok: true, manifest });
    });

    // 2. Get Thumbnail Manifest & Preview Metadata
    server.get("/api/channels/:channelId/episodes/:episodeId/thumbnail", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string };
      const manifest = await getEpisodeThumbnailManifest(repository, params.channelId, params.episodeId);
      return reply.code(200).send({ manifest });
    });

    // 3. Serve Thumbnail Image File Directly
    server.get("/api/channels/:channelId/episodes/:episodeId/thumbnail/file/:ratio", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string; ratio: string };
      const filename = params.ratio === "9_16" || params.ratio === "9-16" ? "thumbnail_9_16.jpg" : "thumbnail_16_9.jpg";

      const episode = await repository.getEpisode(params.channelId, params.episodeId);
      const channel = await repository.getChannel(params.channelId);
      const filePath = repository.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", filename);

      try {
        const [buffer, stats] = await Promise.all([readFile(filePath), stat(filePath)]);
        void reply.header("Content-Type", "image/jpeg");
        void reply.header("Content-Length", stats.size);
        return reply.send(buffer);
      } catch {
        return reply.code(404).send({ error: "Thumbnail asset not found" });
      }
    });

    done();
  };
}
