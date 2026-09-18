import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { FastifyPluginCallback } from "fastify";
import { TransitionPreviewRequestSchema, type TransitionPreviewRequest } from "@studio/shared";
import type { TransitionPreviewService } from "../quiz/transitionPreview/transitionPreviewService.js";
import type { TransitionPreviewStorePort } from "../quiz/transitionPreview/transitionPreview.types.js";
import { TransitionPreviewFramesService } from "../quiz/transitionPreview/transitionPreviewFrames.js";

export type TransitionPreviewRoutesDeps = {
  service: TransitionPreviewService;
  store: TransitionPreviewStorePort;
  framesService?: TransitionPreviewFramesService;
};

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export function registerTransitionPreviewsRoutes(deps: TransitionPreviewRoutesDeps): FastifyPluginCallback {
  const { service, store } = deps;
  const frames = deps.framesService ?? new TransitionPreviewFramesService(store);

  return (server, _options, done) => {
    // 1. GET /api/transition-previews/catalog
    server.get("/api/transition-previews/catalog", async (request, reply) => {
      const sampleRevision = (request.query as { sampleRevision?: string })?.sampleRevision;
      const catalog = service.getCatalog(sampleRevision);
      const etag = `"${catalog.revision}-${catalog.sampleRevision}"`;

      if (request.headers["if-none-match"] === etag) {
        return reply.code(304).send();
      }

      return reply.code(200).header("ETag", etag).header("Cache-Control", "public, max-age=15, must-revalidate").send(catalog);
    });

    // 2. POST /api/transition-previews
    server.post("/api/transition-previews", async (request, reply) => {
      const parsed = TransitionPreviewRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        let clientRequestId = "unknown";
        if (typeof request.body === "object" && request.body !== null && "clientRequestId" in request.body) {
          const rawId = (request.body as { clientRequestId?: unknown }).clientRequestId;
          if (typeof rawId === "string") {
            clientRequestId = rawId;
          }
        }
        return reply.code(400).send({
          error: {
            code: "INVALID_TIMING",
            message: parsed.error.issues.map((i) => i.message).join(", "),
            retryable: false,
          },
          requestId: clientRequestId,
        });
      }

      const reqBody: TransitionPreviewRequest = parsed.data;
      const callerId = (request.headers["x-caller-id"] as string) || request.ip || reqBody.clientRequestId || "anonymous";

      const status = await service.request(reqBody, { callerId, clientRequestId: reqBody.clientRequestId });

      if (status.status === "ready") {
        return reply.code(200).send(status);
      }
      if (status.status === "queued" || status.status === "running") {
        return reply.code(202).send(status);
      }
      if (status.status === "failed") {
        const statusCode = status.error.code === "CATALOG_CHANGED" ? 409 : status.error.code === "RENDER_REQUIRED" ? 422 : 400;
        return reply.code(statusCode).send(status);
      }

      return reply.code(200).send(status);
    });

    // 3. GET /api/transition-previews/jobs/:id
    server.get("/api/transition-previews/jobs/:id", async (request, reply) => {
      const jobId = (request.params as { id: string }).id;
      if (!SAFE_ID_REGEX.test(jobId)) {
        return reply.code(400).send({ error: "Invalid job ID" });
      }

      const callerId = (request.headers["x-caller-id"] as string) || undefined;
      try {
        const status = await service.status(jobId, callerId ? { callerId } : undefined);
        return reply.code(200).send(status);
      } catch (err: unknown) {
        const errorObj = err as { statusCode?: number; message?: string } | undefined;
        const statusCode = errorObj?.statusCode ?? 500;
        return reply.code(statusCode).send({ error: errorObj?.message || "Error getting job status" });
      }
    });

    // 4. DELETE /api/transition-previews/jobs/:id
    server.delete("/api/transition-previews/jobs/:id", async (request, reply) => {
      const jobId = (request.params as { id: string }).id;
      if (!SAFE_ID_REGEX.test(jobId)) {
        return reply.code(400).send({ error: "Invalid job ID" });
      }

      const callerId = (request.headers["x-caller-id"] as string) || request.ip || "anonymous";

      try {
        const status = await service.cancel(jobId, { callerId });
        return reply.code(200).send(status);
      } catch (err: unknown) {
        const errorObj = err as { statusCode?: number; message?: string } | undefined;
        const statusCode = errorObj?.statusCode ?? 500;
        return reply.code(statusCode).send({ error: errorObj?.message || "Error cancelling job" });
      }
    });

    // 5. GET /api/transition-previews/artifacts/:id/manifest
    server.get("/api/transition-previews/artifacts/:id/manifest", async (request, reply) => {
      const artifactId = (request.params as { id: string }).id;
      if (!SAFE_ID_REGEX.test(artifactId)) {
        return reply.code(400).send({ error: "Invalid artifact ID" });
      }

      const artifact = await store.getPublishedArtifact(artifactId);
      if (!artifact) {
        return reply.code(404).send({ error: "Artifact not found" });
      }

      const etag = `"${artifact.manifest.artifactSha256}"`;
      if (request.headers["if-none-match"] === etag) {
        return reply.code(304).send();
      }

      return reply.code(200).header("ETag", etag).header("Cache-Control", "public, max-age=31536000, immutable").send(artifact.manifest);
    });

    // 6. GET /api/transition-previews/artifacts/:id/video
    server.get("/api/transition-previews/artifacts/:id/video", async (request, reply) => {
      const artifactId = (request.params as { id: string }).id;
      if (!SAFE_ID_REGEX.test(artifactId)) {
        return reply.code(400).send({ error: "Invalid artifact ID" });
      }

      const artifact = await store.getPublishedArtifact(artifactId);
      if (!artifact) {
        return reply.code(404).send({ error: "Artifact not found" });
      }

      const etag = `"${artifact.manifest.artifactSha256}"`;
      if (request.headers["if-none-match"] === etag) {
        return reply.code(304).send();
      }

      let statInfo;
      try {
        statInfo = await stat(artifact.videoPath);
      } catch {
        return reply.code(404).send({ error: "Video file not found" });
      }

      const fileSize = statInfo.size;
      const range = request.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        if (start >= fileSize || end >= fileSize || start > end) {
          return reply.code(416).header("Content-Range", `bytes */${fileSize}`).send();
        }
        const chunksize = end - start + 1;
        const stream = createReadStream(artifact.videoPath, { start, end });
        return reply
          .code(206)
          .headers({
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize,
            "Content-Type": "video/mp4",
            ETag: etag,
            "Cache-Control": "public, max-age=31536000, immutable",
          })
          .send(stream);
      }

      const stream = createReadStream(artifact.videoPath);
      return reply
        .code(200)
        .headers({
          "Content-Length": fileSize,
          "Accept-Ranges": "bytes",
          "Content-Type": "video/mp4",
          ETag: etag,
          "Cache-Control": "public, max-age=31536000, immutable",
        })
        .send(stream);
    });

    // 7. GET /api/transition-previews/artifacts/:id/frames/:index
    server.get("/api/transition-previews/artifacts/:id/frames/:index", async (request, reply) => {
      const { id, index } = request.params as { id: string; index: string };
      if (!SAFE_ID_REGEX.test(id)) {
        return reply.code(400).send({ error: "Invalid artifact ID" });
      }

      const frameIndex = parseInt(index, 10);
      if (!Number.isInteger(frameIndex) || frameIndex < 0) {
        return reply.code(400).send({ error: "Frame index must be a non-negative integer" });
      }

      try {
        const rawReq = request.raw as unknown as { signal?: AbortSignal };
        const decoded = await frames.decodeArtifactFrame(id, frameIndex, rawReq.signal);
        const etag = `"${decoded.artifactSha256}-f${decoded.frameIndex}"`;

        if (request.headers["if-none-match"] === etag) {
          return reply.code(304).send();
        }

        return reply
          .code(200)
          .header("Content-Type", "image/png")
          .header("X-Artifact-Sha256", decoded.artifactSha256)
          .header("X-Frame-Index", decoded.frameIndex)
          .header("ETag", etag)
          .header("Cache-Control", "public, max-age=31536000, immutable")
          .send(decoded.png);
      } catch (err: unknown) {
        const errorObj = err as { code?: string; message?: string } | undefined;
        if (errorObj?.code === "ARTIFACT_EXPIRED") {
          return reply.code(404).send({ error: errorObj.message ?? "Artifact expired", code: errorObj.code });
        }
        if (errorObj?.code === "INVALID_TIMING") {
          return reply.code(400).send({ error: errorObj.message ?? "Invalid timing", code: errorObj.code });
        }
        return reply.code(500).send({ error: errorObj?.message || "Failed to decode frame" });
      }
    });

    done();
  };
}
