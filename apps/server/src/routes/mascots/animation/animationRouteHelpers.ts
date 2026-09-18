import type { FastifyReply } from "fastify";
import { InvalidStateTransitionError, OrchestrationError, VideoUploadValidationError } from "../../../quiz/mascot/videoAnimation/index.js";

/**
 * Standard error response helper for mascot animation endpoints.
 */
export function sendError(reply: FastifyReply, status: number, code: string, message: string, details?: unknown): FastifyReply {
  return reply.code(status).send({ ok: false, error: { code, message, details } });
}

/**
 * Maps known video processing domain errors to standardized Fastify HTTP responses.
 */
export function handleVideoRouteError(reply: FastifyReply, err: unknown, fallbackCode: string): FastifyReply {
  if (err instanceof VideoUploadValidationError) {
    return sendError(reply, 400, err.code, err.message, err.details);
  }
  if (err instanceof OrchestrationError) {
    const statusCode = err.code === "INVALID_STATE_TRANSITION" ? 409 : err.code === "JOB_NOT_FOUND" ? 404 : 400;
    return sendError(reply, statusCode, err.code, err.message);
  }
  if (err instanceof InvalidStateTransitionError) {
    return sendError(reply, 409, err.code, err.message);
  }
  const message = err instanceof Error ? err.message : String(err);
  return sendError(reply, 400, fallbackCode, message);
}
