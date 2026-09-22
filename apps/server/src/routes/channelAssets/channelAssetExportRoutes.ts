import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { createZipArchive, type ZipEntry } from "../../quiz/zipHelper.js";
import { collectAssetFilesRecursively } from "./channelAssetHelpers.js";
import type { ChannelAssetsRouteDeps } from "./channelAssetTypes.js";

export function registerChannelAssetExportRoutes(server: FastifyInstance, deps: ChannelAssetsRouteDeps): void {
  const { repository } = deps;

  server.get("/api/channels/:channelId/assets/export-zip", async (request, reply) => {
    const { channelId } = request.params as { channelId: string };
    const channel = await repository.getChannel(channelId);
    await repository.ensureChannelAssetDirs(channel.slug);

    const assetsRoot = path.resolve(repository.storageRoot, "channels", channel.slug, "assets");
    const collected = await collectAssetFilesRecursively(assetsRoot);

    const entries: ZipEntry[] = await Promise.all(
      collected.map(async (file) => ({
        filename: file.relativePath,
        data: new Uint8Array(await readFile(file.absolutePath)),
      })),
    );

    const zipBuffer = createZipArchive(entries);

    return reply
      .header("content-type", "application/zip")
      .header("content-disposition", `attachment; filename="${channel.slug}-brand-kit.zip"`)
      .send(zipBuffer);
  });
}
