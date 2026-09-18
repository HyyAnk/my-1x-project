import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import type { StudioLogger } from "../logger.js";
import { RepositoryError } from "../repository.js";

export function registerErrorHandler(server: FastifyInstance, logger: StudioLogger): void {
  server.setErrorHandler((error, _request, reply) => {
    const message = error instanceof Error ? error.message : "Request failed";
    let statusCode = 500;
    if (error instanceof RepositoryError) {
      if (error.code.endsWith("NOT_FOUND")) {
        statusCode = 404;
      } else if (error.code === "BANK_EMPTY" || error.code === "INVALID_SOURCE" || error.code === "INVALID_RESOLUTION") {
        statusCode = 422;
      } else if (error.code === "STALE_REVISION" || error.code === "CONFLICT") {
        statusCode = 409;
      } else {
        statusCode = 400;
      }
    } else if (error instanceof ZodError || (error && typeof error === "object" && "issues" in error)) {
      statusCode = 400;
    } else if (error && typeof error === "object" && "statusCode" in error && typeof error.statusCode === "number") {
      statusCode = error.statusCode;
    }

    if (statusCode >= 500) {
      logger.error(`Internal server error: ${message}${error instanceof Error && error.stack ? `\n${error.stack}` : ""}`, {
        step: "http",
      });
    } else {
      logger.warn(`Request failed: ${message}`, { step: "http" });
    }
    void reply.code(statusCode).send({ error: message });
  });
}
