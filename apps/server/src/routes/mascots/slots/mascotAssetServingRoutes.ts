import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import { generateAssetETag, isAssetNotModified, resolveMediaMimeType } from "../../../utils/mediaMime.js";
import type { MascotsRouteDeps } from "../mascotTypes.js";

const CACHE_CONTROL_IMMUTABLE = "public, max-age=31536000, immutable";

/**
 * Registers mascot asset delivery, transparent rendering, and slot download endpoints.
 */
export function registerMascotAssetServingRoutes(server: FastifyInstance, deps: MascotsRouteDeps): void {
  const { repository } = deps;

  server.get("/api/mascots/:mascotId/assets/:filename", async (request, reply) => {
    const params = request.params as { mascotId: string; filename: string };
    const query = (request.query || {}) as { download?: string; transparent?: string };

    if (query.transparent === "true") {
      const transparentResult = await repository.getOrCreateTransparentMascotAsset(params.mascotId, params.filename);
      const fileStat = await stat(transparentResult.absolutePath);
      const etag = generateAssetETag(fileStat.size, fileStat.mtime.toISOString());
      const lastModified = fileStat.mtime.toUTCString();

      if (isAssetNotModified(request.headers, etag, fileStat.mtime.toISOString())) {
        return reply.code(304).headers({ etag, "last-modified": lastModified, "cache-control": CACHE_CONTROL_IMMUTABLE }).send();
      }

      const headers: Record<string, string | number> = {
        "content-type": "image/png",
        "content-length": fileStat.size,
        "cache-control": CACHE_CONTROL_IMMUTABLE,
        etag,
        "last-modified": lastModified,
      };
      if (query.download === "true") {
        const downloadName = params.filename.replace(/\.[^/.]+$/, "") + "_transparent.png";
        headers["content-disposition"] = `attachment; filename="${downloadName}"`;
      }
      return reply.headers(headers).send(createReadStream(transparentResult.absolutePath));
    }

    const file = await repository.getMascotAssetFile(params.mascotId, params.filename);
    const etag = generateAssetETag(file.size, file.modified_at);
    const lastModified = new Date(file.modified_at).toUTCString();

    if (isAssetNotModified(request.headers, etag, file.modified_at)) {
      return reply.code(304).headers({ etag, "last-modified": lastModified, "cache-control": CACHE_CONTROL_IMMUTABLE }).send();
    }

    const contentType = await resolveMediaMimeType(file.absolutePath, params.filename);
    const headers: Record<string, string | number> = {
      "content-type": contentType,
      "content-length": file.size,
      "cache-control": CACHE_CONTROL_IMMUTABLE,
      etag,
      "last-modified": lastModified,
    };
    if (query.download === "true") {
      headers["content-disposition"] = `attachment; filename="${params.filename}"`;
    }
    return reply.headers(headers).send(createReadStream(file.absolutePath));
  });

  server.get("/api/mascots/:mascotId/assets/transparent/:filename", async (request, reply) => {
    const params = request.params as { mascotId: string; filename: string };
    const query = (request.query || {}) as { download?: string };
    const transparentResult = await repository.getOrCreateTransparentMascotAsset(params.mascotId, params.filename);
    const fileStat = await stat(transparentResult.absolutePath);
    const etag = generateAssetETag(fileStat.size, fileStat.mtime.toISOString());
    const lastModified = fileStat.mtime.toUTCString();

    if (isAssetNotModified(request.headers, etag, fileStat.mtime.toISOString())) {
      return reply.code(304).headers({ etag, "last-modified": lastModified, "cache-control": CACHE_CONTROL_IMMUTABLE }).send();
    }

    const headers: Record<string, string | number> = {
      "content-type": "image/png",
      "content-length": fileStat.size,
      "cache-control": CACHE_CONTROL_IMMUTABLE,
      etag,
      "last-modified": lastModified,
    };
    if (query.download === "true") {
      const downloadName = params.filename.replace(/\.[^/.]+$/, "") + "_transparent.png";
      headers["content-disposition"] = `attachment; filename="${downloadName}"`;
    }
    return reply.headers(headers).send(createReadStream(transparentResult.absolutePath));
  });

  server.get("/api/mascots/:mascotId/styles/:styleId/slots/:state/:slotIndex/download", async (request, reply) => {
    const params = request.params as {
      mascotId: string;
      styleId: string;
      state: string;
      slotIndex: string;
    };
    const query = (request.query || {}) as { type?: "original" | "transparent" };
    const slotIdx = parseInt(params.slotIndex, 10);
    const isTransparent = query.type === "transparent";

    const mascot = await repository.getMascot(params.mascotId);
    const style = mascot.styles?.find((s) => s.id === params.styleId);
    if (!style) {
      return reply.code(404).send({ error: "Style not found" });
    }
    const stateSlots = style.states[params.state as "thinking" | "celebrate"] || [];
    const slot = stateSlots.find((s) => s.slot_index === slotIdx);
    if (!slot || (!slot.image_url && !slot.raw_image_url)) {
      return reply.code(404).send({ error: "Slot asset not found" });
    }

    const cleanMascotName = mascot.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanStyleName = style.name.replace(/[^a-zA-Z0-9_-]/g, "_");

    if (isTransparent) {
      const sourceUrl = slot.image_url || slot.raw_image_url || "";
      const filename = sourceUrl.split("/").pop()?.split("?")[0];
      if (!filename) return reply.code(404).send({ error: "Invalid asset filename" });

      const transparentResult = await repository.getOrCreateTransparentMascotAsset(params.mascotId, filename);
      const fileStat = await stat(transparentResult.absolutePath);
      const downloadFilename = `${cleanMascotName}_${cleanStyleName}_${params.state}_slot${slotIdx}_transparent.png`;

      return reply
        .headers({
          "content-type": "image/png",
          "content-length": fileStat.size,
          "content-disposition": `attachment; filename="${downloadFilename}"`,
        })
        .send(createReadStream(transparentResult.absolutePath));
    }

    // Original download (preserves full 16:9 canvas with original background)
    const rawUrl = slot.raw_image_url || slot.image_url;
    const filename = rawUrl.split("/").pop()?.split("?")[0];
    if (!filename) return reply.code(404).send({ error: "Invalid asset filename" });

    const file = await repository.getMascotAssetFile(params.mascotId, filename);
    const contentType = await resolveMediaMimeType(file.absolutePath, filename);
    const ext = filename.split(".").pop() || "png";
    const downloadFilename = `${cleanMascotName}_${cleanStyleName}_${params.state}_slot${slotIdx}_original.${ext}`;

    return reply
      .headers({
        "content-type": contentType,
        "content-length": file.size,
        "content-disposition": `attachment; filename="${downloadFilename}"`,
      })
      .send(createReadStream(file.absolutePath));
  });
}
