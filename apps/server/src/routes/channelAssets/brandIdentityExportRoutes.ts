import type { FastifyInstance } from "fastify";
import { collectIdentity } from "../../brandIdentity/collectIdentity.js";
import { createZipArchive } from "../../quiz/zipHelper.js";
import type { ChannelAssetsRouteDeps } from "./channelAssetTypes.js";

export function registerBrandIdentityExportRoutes(server: FastifyInstance, { repository }: ChannelAssetsRouteDeps): void {
  server.get("/api/channels/:channelId/assets/identity-export", async (request, reply) => {
    const { channelId } = request.params as { channelId: string };
    const { format = "files" } = request.query as { format?: string };
    if (format !== "files" && format !== "zip") return reply.code(400).send({ error: "Invalid export format." });
    const { folder, entries, warnings } = await collectIdentity(repository, channelId);
    reply.header("cache-control", "no-store");
    if (!entries.length) return reply.code(409).send({ error: `No identity assets are ready to download. ${warnings.join(" ")}` });
    const files = format === "zip" ? [{ filename: `${folder}.zip`, data: createZipArchive(entries) }] : entries;
    return {
      folder,
      files: files.map((file) => ({ filename: file.filename, base64: Buffer.from(file.data).toString("base64") })),
      warnings,
    };
  });
}
