import type { FastifyInstance } from "fastify";
import {
  UploadMascotConceptInputSchema,
  UploadMascotConceptResponseSchema,
  AnalyzeMascotConceptInputSchema,
  AnalyzeMascotConceptResponseSchema,
} from "@studio/shared";
import type { MascotsRouteDeps } from "./mascotTypes.js";
import {
  handleExistingMascotConceptUpload,
  handleNewMascotConceptUpload,
  handleAnalyzeExistingMascotConcept,
} from "./mascotUploadHelper.js";
import { resolveMascotVisionAiConfig } from "../../quiz/mascot/services/mascotVisionAnalyzer.js";

/**
 * Registers mascot master concept upload and vision analysis endpoints.
 */
export function registerMascotUploadRoutes(server: FastifyInstance, deps: MascotsRouteDeps): void {
  const { repository, logger, state } = deps;

  server.post("/api/mascots/:mascotId/upload-concept", async (request, reply) => {
    const { mascotId } = request.params as { mascotId: string };
    const input = UploadMascotConceptInputSchema.parse(request.body);
    const aiConfig = resolveMascotVisionAiConfig(state?.config);
    const result = await handleExistingMascotConceptUpload(repository, mascotId, input, {
      logger,
      aiConfig,
    });
    const validated = UploadMascotConceptResponseSchema.parse(result);
    return reply.code(200).send(validated);
  });

  server.post("/api/mascots/upload-concept", async (request, reply) => {
    const input = UploadMascotConceptInputSchema.parse(request.body);
    const aiConfig = resolveMascotVisionAiConfig(state?.config);
    const result = await handleNewMascotConceptUpload(repository, input, {
      logger,
      aiConfig,
    });
    const validated = UploadMascotConceptResponseSchema.parse(result);
    return reply.code(201).send(validated);
  });

  server.post("/api/mascots/:mascotId/analyze-concept", async (request, reply) => {
    const { mascotId } = request.params as { mascotId: string };
    const input = AnalyzeMascotConceptInputSchema.parse(request.body ?? {});
    const aiConfig = resolveMascotVisionAiConfig(state?.config);
    const result = await handleAnalyzeExistingMascotConcept(repository, mascotId, input, {
      logger,
      aiConfig,
    });
    const validated = AnalyzeMascotConceptResponseSchema.parse(result);
    return reply.code(200).send(validated);
  });
}

