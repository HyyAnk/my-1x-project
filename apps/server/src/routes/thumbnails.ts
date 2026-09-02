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
import { loadConfig } from "../config.js";
import {
  deleteThumbnailVersion,
  generateEpisodeThumbnail,
  getEpisodeThumbnailManifest,
  setActiveThumbnailVersion,
} from "../quiz/thumbnail/index.js";
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
    badge_override: z.string().optional(),
  })
  .default({});

const SetActiveThumbnailBodySchema = z.object({
  version_id: z.string().min(1),
});

export function registerThumbnailsRoutes(deps: ThumbnailsRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository, state, antigravity } = deps;

    // 1. Generate Thumbnail Endpoint
    server.post("/api/channels/:channelId/episodes/:episodeId/thumbnail/generate", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string };
      const body = GenerateThumbnailBodySchema.parse(request.body || {});

      const currentConfig = await loadConfig(repository.rootDirectory).catch(() => state.config);
      const activeImageConfig = currentConfig.image_generation || state.config.image_generation;

      const manifest = await generateEpisodeThumbnail(repository, {
        channelId: params.channelId,
        episodeId: params.episodeId,
        layoutOverride: body.layout_override,
        aspectRatio: body.aspect_ratio,
        customHookText: body.custom_hook_text,
        badgeOverride: body.badge_override,
        activeEngine: currentConfig.active_engine || state.config.active_engine,
        antigravityClient: antigravity,

        imageConfig: activeImageConfig
          ? {
              api_key: activeImageConfig.api_key,
              model: activeImageConfig.model,
              provider: activeImageConfig.provider as any,
              base_url: activeImageConfig.base_url,
              quality: activeImageConfig.quality,
            }
          : undefined,
        throwOnError: true,
      });

      return reply.code(200).send({ ok: true, manifest });
    });

    // 2. Get Thumbnail Manifest & Preview Metadata
    server.get("/api/channels/:channelId/episodes/:episodeId/thumbnail", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string };
      const manifest = await getEpisodeThumbnailManifest(repository, params.channelId, params.episodeId);
      return reply.code(200).send({ manifest });
    });

    // 3. Set Active Thumbnail Version from History
    server.post("/api/channels/:channelId/episodes/:episodeId/thumbnail/active", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string };
      const body = SetActiveThumbnailBodySchema.parse(request.body || {});
      const manifest = await setActiveThumbnailVersion(repository, params.channelId, params.episodeId, body.version_id);
      return reply.code(200).send({ ok: true, manifest });
    });

    // 4. Delete Thumbnail Version
    server.delete("/api/channels/:channelId/episodes/:episodeId/thumbnail/variants/:variantId", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string; variantId: string };
      const manifest = await deleteThumbnailVersion(repository, params.channelId, params.episodeId, params.variantId);
      return reply.code(200).send({ ok: true, manifest });
    });

    // 5. Serve Thumbnail Image File Directly (Active or Specific Variant)
    server.get("/api/channels/:channelId/episodes/:episodeId/thumbnail/file/:ratio", async (request, reply) => {
      const params = request.params as { channelId: string; episodeId: string; ratio: string };
      const query = (request.query || {}) as { variant_id?: string };

      const episode = await repository.getEpisode(params.channelId, params.episodeId);
      const channel = await repository.getChannel(params.channelId);

      let filePath: string;
      if (query.variant_id && query.variant_id.trim()) {
        const sanitizedId = query.variant_id.replace(/[^a-zA-Z0-9_-]/g, "");
        filePath = repository.resolvePath(
          "channels",
          channel.slug,
          "episodes",
          episode.slug,
          "assets",
          "thumbnails",
          `${sanitizedId}.jpg`,
        );
      } else {
        const filename = params.ratio === "9_16" || params.ratio === "9-16" ? "thumbnail_9_16.jpg" : "thumbnail_16_9.jpg";
        filePath = repository.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", filename);
      }

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


