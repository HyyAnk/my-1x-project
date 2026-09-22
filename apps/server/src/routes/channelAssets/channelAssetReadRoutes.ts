import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import type { ChannelMascotSummary } from "@studio/shared";
import { generateAssetETag, isAssetNotModified, resolveMediaMimeType } from "../../utils/mediaMime.js";
import { attachAssetUrls } from "./channelAssetHelpers.js";
import type { ChannelAssetsRouteDeps } from "./channelAssetTypes.js";

const CACHE_CONTROL_IMMUTABLE = "public, max-age=31536000, immutable";

export function registerChannelAssetReadRoutes(server: FastifyInstance, deps: ChannelAssetsRouteDeps): void {
  const { repository } = deps;

  server.get("/api/channels/:channelId/assets", async (request) => {
    const { channelId } = request.params as { channelId: string };
    const channel = await repository.getChannel(channelId);
    const rawManifest = await repository.getChannelAssetManifest(channel.slug);

    let mascotSummary: ChannelMascotSummary | null = null;
    if (channel.mascot_id) {
      try {
        const mascot = await repository.getMascot(channel.mascot_id);
        if (mascot) {
          mascotSummary = {
            mascot_id: mascot.id,
            name: mascot.name,
            master_image_url: mascot.master_image_url ?? null,
          };
        }
      } catch {
        mascotSummary = null;
      }
    }

    const manifest = attachAssetUrls(channel.channel_id, rawManifest);
    return {
      manifest,
      mascot: mascotSummary,
      channel_id: channel.channel_id,
      channel_slug: channel.slug,
    };
  });

  server.get("/api/channels/:channelId/assets/file/*", async (request, reply) => {
    const params = request.params as { channelId: string; "*": string };
    const channel = await repository.getChannel(params.channelId);
    const assetsRoot = path.resolve(repository.storageRoot, "channels", channel.slug, "assets");
    const rawWildcard = params["*"] || "";
    let decodedWildcard = rawWildcard;
    try {
      decodedWildcard = decodeURIComponent(rawWildcard);
    } catch {
      return reply.code(400).send({ error: "Invalid file path encoding" });
    }
    const targetPath = path.resolve(assetsRoot, decodedWildcard);

    const relative = path.relative(assetsRoot, targetPath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return reply.code(403).send({ error: "Access denied: Path traversal detected" });
    }

    try {
      const fileStat = await stat(targetPath);
      if (!fileStat.isFile()) {
        return reply.code(404).send({ error: "Asset file not found" });
      }

      const etag = generateAssetETag(fileStat.size, fileStat.mtime.toISOString());
      const lastModified = fileStat.mtime.toUTCString();

      if (isAssetNotModified(request.headers, etag, fileStat.mtime.toISOString())) {
        return reply.code(304).headers({
          etag,
          "last-modified": lastModified,
          "cache-control": CACHE_CONTROL_IMMUTABLE,
        }).send();
      }

      const contentType = await resolveMediaMimeType(targetPath);
      return reply
        .headers({
          "content-type": contentType,
          "content-length": fileStat.size,
          "cache-control": CACHE_CONTROL_IMMUTABLE,
          etag,
          "last-modified": lastModified,
        })
        .send(createReadStream(targetPath));
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      if (error && error.code === "ENOENT") {
        return reply.code(404).send({ error: "Asset file not found" });
      }
      throw err;
    }
  });
}
