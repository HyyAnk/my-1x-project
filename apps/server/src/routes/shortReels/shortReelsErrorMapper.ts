import type { FastifyReply } from "fastify";
import { ZodError } from "zod";
import type { StudioLogger } from "../../logger.js";
import { RepositoryError } from "../../repository/errors.js";
import { ExportError } from "../../shortReel/exportService.js";
import { PackageServiceError } from "../../shortReel/packageService.js";
import { ReferenceError } from "../../shortReel/packageImage.js";
import { CoverGenerationError } from "../../shortReel/thumbnailAdapter.js";
import { GenerationError } from "../../shortReel/generationErrors.js";
import type { RouteErrorResponse } from "./shortReelsTypes.js";

/**
 * Maps domain errors to HTTP status codes and standard error bodies.
 */
export function knownErrorResponse(error: unknown): RouteErrorResponse | null {
  if (error instanceof RepositoryError) {
    const status = error.code.endsWith("NOT_FOUND")
      ? 404
      : error.code === "STALE_REVISION" || error.code.includes("CONFLICT")
        ? 409
        : ["INVALID_SOURCE", "INCOMPLETE_SOURCE", "INVALID_SCRIPT", "BANK_EMPTY"].includes(error.code)
          ? 422
          : error.code === "STORAGE_BUSY"
            ? 503
            : 400;
    return { status, body: { error: error.message, code: error.code } };
  }

  if (error instanceof ExportError) {
    const status = ["REVISION_CONFLICT", "STALE_EXPORT"].includes(error.code)
      ? 409
      : ["INCOMPLETE_PACKAGE", "INVALID_SCRIPT", "INVALID_ASSET"].includes(error.code)
        ? 422
        : 400;
    return { status, body: { error: error.message, code: error.code } };
  }

  if (error instanceof PackageServiceError) {
    const status = ["SUPERSEDED_OPERATION", "PENDING_OPERATION", "STALE_DEPENDENCY"].includes(error.code)
      ? 409
      : error.code === "VALIDATION_FAILED" || (error.code as string) === "MISSING_MASCOT"
        ? 422
        : error.code === "STATE_WRITE_FAILED"
          ? 503
          : 400;
    return { status, body: { error: error.message, code: error.code } };
  }

  if (error instanceof GenerationError) {
    const status = ["MISSING_REFERENCE", "ANIMATION_ATLAS_REJECTED", "VALIDATION_FAILED"].includes(String(error.code)) ? 422 : 400;
    return { status, body: { error: error.message, code: String(error.code) } };
  }

  if (error instanceof ReferenceError) {
    const status = ["MISSING_REFERENCE", "ANIMATION_ATLAS_REJECTED"].includes(error.code) ? 422 : 400;
    return { status, body: { error: error.message, code: error.code } };
  }

  if (error instanceof CoverGenerationError) {
    return { status: error.code === "PROVIDER_ERROR" ? 503 : 422, body: { error: error.message, code: error.code } };
  }

  return null;
}

/**
 * Handles route-level errors by mapping known domain errors, Zod validation errors,
 * or returning a 500 internal server error.
 */
export function handleRouteError(error: unknown, reply: FastifyReply, logger: StudioLogger): FastifyReply {
  const known = knownErrorResponse(error);
  if (known) return reply.code(known.status).send(known.body);

  if (error instanceof ZodError) {
    return reply.code(400).send({ error: "Validation error", details: error.issues });
  }

  const message = error instanceof Error ? error.message : "Request failed";
  logger.error(`Short-Reels route error: ${message}`, { step: "http_route" });
  return reply.code(500).send({ error: "Internal server error" });
}
