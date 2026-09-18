import path from "node:path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendError } from "./animationRouteHelpers.js";
import type { MascotAnimationArtifactRouteDeps } from "./animationServices.js";
import {
  ALLOWED_ARTIFACT_EXTENSIONS,
  parseRangeHeader,
  resolveArtifactCandidatePath,
  sendArtifactFile,
} from "./artifactDeliveryHelpers.js";

export { parseRangeHeader };

/**
 * Registers artifact delivery routes supporting candidate lookup, security validation, and HTTP 206 range streaming.
 */
export function registerMascotAnimationArtifactRoutes(server: FastifyInstance, deps: MascotAnimationArtifactRouteDeps): void {
  const { outputBaseDir, storageAdapter, videoProcessingRepo } = deps;

  const serveArtifact = async (request: FastifyRequest, reply: FastifyReply) => {
    const {
      mascotId,
      styleId = "core",
      state,
      slotIndex,
      filename,
    } = request.params as {
      mascotId: string;
      styleId?: string;
      state: string;
      slotIndex: string;
      filename: string;
    };

    // Strict security validation: alphanumeric, dash, underscore, dot only
    if (
      !filename ||
      typeof filename !== "string" ||
      filename.includes("\0") ||
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\") ||
      !/^[a-zA-Z0-9_.-]+$/.test(filename)
    ) {
      return sendError(reply, 400, "INVALID_FILENAME", "Invalid artifact filename");
    }

    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_ARTIFACT_EXTENSIONS.has(ext)) {
      return sendError(reply, 400, "INVALID_FILENAME", `Unsupported artifact file extension: ${ext}`);
    }

    const resolvedPath = await resolveArtifactCandidatePath({
      outputBaseDir,
      storageAdapter,
      videoProcessingRepo,
      mascotId,
      styleId,
      state,
      slotIndex,
      filename,
    });

    if (!resolvedPath) {
      return sendError(reply, 404, "ARTIFACT_NOT_FOUND", `Artifact ${filename} not found for slot ${slotIndex}`);
    }

    return sendArtifactFile(resolvedPath, filename, request, reply);
  };

  server.get("/api/mascots/:mascotId/styles/:styleId/animations/:state/:slotIndex/artifacts/:filename", async (req, reply) => {
    return serveArtifact(req, reply);
  });
  server.get("/mascot/assets/animations/:mascotId/:styleId/:state/:slotIndex/:filename", async (req, reply) => {
    return serveArtifact(req, reply);
  });
}
