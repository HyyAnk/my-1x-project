import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  CreateMascotStyleInputSchema,
  GenerateMascotConceptInputSchema,
  GenerateMascotStyleConceptRequestSchema,
  type MascotProfile,
  UpdateMascotStyleInputSchema,
} from "@studio/shared";
import { generateMascotConceptArt, generateMascotStyleConcept } from "../../quiz/mascotService.js";
import type { MascotsRouteDeps } from "./mascotTypes.js";
import { registerMascotStyleJobRoutes } from "./mascotStyleJobRoutes.js";

/**
 * Registers mascot style endpoints (creation, update, concept generation, deletion, active style, job queue).
 */
export function registerMascotStyleRoutes(server: FastifyInstance, deps: MascotsRouteDeps): void {
  const { repository, logger, state } = deps;

  registerMascotStyleJobRoutes(server, deps);

  server.post("/api/mascots/:mascotId/styles", async (request, reply) => {
    const mascotId = (request.params as { mascotId: string }).mascotId;
    const input = CreateMascotStyleInputSchema.parse(request.body);
    const result = await repository.createMascotStyle(mascotId, input);
    return reply.code(201).send(result);
  });

  const updateStyleHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const { mascotId, styleId } = request.params as { mascotId: string; styleId: string };
    const rawBody = typeof request.body === "object" && request.body !== null ? request.body : {};
    const schema = UpdateMascotStyleInputSchema.extend({
      anchor_image_url: z.string().nullable().optional(),
    });
    const input = schema.parse(rawBody);
    try {
      const mascot = await repository.updateMascotStyle(mascotId, styleId, input);
      const style = (mascot.styles || []).find((s) => s.id === styleId);
      return { mascot, style };
    } catch (err: unknown) {
      const anyErr = err as { code?: string; message?: string };
      if (anyErr?.code === "MASCOT_NOT_FOUND" || anyErr?.message?.includes("Mascot not found")) {
        return reply.code(404).send({ error: "Mascot not found" });
      }
      if (anyErr?.code === "STYLE_NOT_FOUND" || anyErr?.message?.includes("not found")) {
        return reply.code(404).send({ error: "Style not found" });
      }
      throw err;
    }
  };

  server.patch("/api/mascots/:mascotId/styles/:styleId", updateStyleHandler);
  server.put("/api/mascots/:mascotId/styles/:styleId", updateStyleHandler);

  server.post("/api/mascots/:mascotId/styles/:styleId/concept", async (request, reply) => {
    const { mascotId, styleId } = request.params as { mascotId: string; styleId: string };
    try {
      const rawBody = typeof request.body === "object" && request.body !== null ? request.body : {};
      const parsedBody = GenerateMascotStyleConceptRequestSchema.safeParse(rawBody);
      const prompt = parsedBody.success ? parsedBody.data.prompt : undefined;

      let mascot: MascotProfile;
      try {
        mascot = await repository.getMascot(mascotId);
      } catch {
        return reply.code(404).send({ error: "Mascot not found" });
      }

      const style = (mascot.styles || []).find((s) => s.id === styleId);
      if (!style) {
        return reply.code(404).send({ error: "Style not found" });
      }

      const result = await generateMascotStyleConcept(
        repository,
        mascot,
        styleId,
        state.config.image_generation,
        { prompt, imageFallbackConfig: state.config.image_fallback },
        logger,
      );

      const updatedMascot = await repository.getMascot(mascotId);
      const updatedStyle = (updatedMascot.styles || []).find((s) => s.id === styleId) || style;

      return reply.code(200).send({
        success: true,
        style: updatedStyle,
        mascot: updatedMascot,
        anchor_image_url: result.anchor_image_url,
        raw_anchor_image_url: result.raw_image_url,
        placeholder: result.placeholder,
        prompt_used: result.prompt_used,
      });
    } catch (err) {
      logger?.error(`Failed to generate mascot style concept: ${err instanceof Error ? err.message : String(err)}`, {
        mascotId,
        styleId,
      });
      return reply.code(500).send({ error: err instanceof Error ? err.message : "Internal Server Error" });
    }
  });

  server.delete("/api/mascots/:mascotId/styles/:styleId", async (request) => {
    const { mascotId, styleId } = request.params as { mascotId: string; styleId: string };
    const mascot = await repository.deleteMascotStyle(mascotId, styleId);
    return { ok: true, mascot };
  });

  server.post("/api/mascots/:mascotId/active-style", async (request) => {
    const mascotId = (request.params as { mascotId: string }).mascotId;
    const { style_id } = z.object({ style_id: z.string().min(1) }).parse(request.body);
    const mascot = await repository.setActiveMascotStyle(mascotId, style_id);
    return { mascot };
  });

  server.post("/api/mascots/:mascotId/generate-concept", async (request) => {
    const mascotId = (request.params as { mascotId: string }).mascotId;
    const input = GenerateMascotConceptInputSchema.parse(request.body ?? {});
    const mascot = await repository.getMascot(mascotId);
    if (input.style) mascot.visual_style = input.style;
    const result = await generateMascotConceptArt(
      repository,
      mascot,
      state.config.image_generation,
      input.prompt,
      logger,
      state.config.image_fallback,
    );
    const updatedMascot = await repository.getMascot(mascotId);
    return { mascot: updatedMascot, ...result };
  });
}
