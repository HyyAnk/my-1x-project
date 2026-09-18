import type { FastifyInstance } from "fastify";
import {
  BatchGenerateStyleSlotsInputSchema,
  GenerateMascotSlotInputSchema,
  GenerateMascotSpriteInputSchema,
  MascotActionTypeSchema,
  RemoveMascotBackgroundInputSchema,
  UploadMascotSpriteInputSchema,
  type MascotActionType,
} from "@studio/shared";
import {
  generateMascotActionArt,
  generateMascotStyleBatch,
  generateMascotStyleSlot,
  removeMascotAssetBackground,
} from "../../../quiz/mascotService.js";
import type { MascotsRouteDeps } from "../mascotTypes.js";
import { handleActionUpload } from "./mascotActionUploadHelper.js";

/**
 * Registers slot generation, action sprite generation, upload, and background removal endpoints.
 */
export function registerMascotActionGenerationRoutes(server: FastifyInstance, deps: MascotsRouteDeps): void {
  const { repository, logger, state } = deps;

  server.post("/api/mascots/:mascotId/styles/:styleId/generate-slot", async (request) => {
    const { mascotId, styleId } = request.params as { mascotId: string; styleId: string };
    const rawBody = typeof request.body === "object" && request.body !== null ? request.body : {};
    const input = GenerateMascotSlotInputSchema.parse({ style_id: styleId, ...rawBody });
    const mascot = await repository.getMascot(mascotId);
    return generateMascotStyleSlot(repository, mascot, styleId, input, state.config.image_generation, logger, {
      imageFallbackConfig: state.config.image_fallback,
    });
  });

  server.post("/api/mascots/:mascotId/styles/:styleId/generate-batch", async (request, reply) => {
    const { mascotId, styleId } = request.params as { mascotId: string; styleId: string };
    const rawBody = typeof request.body === "object" && request.body !== null ? request.body : {};
    const input = BatchGenerateStyleSlotsInputSchema.parse({ style_id: styleId, ...rawBody });
    const mascot = await repository.getMascot(mascotId);

    // Aborting the HTTP request cancels the remaining queued slot generations.
    const abortController = new AbortController();
    request.raw.once("close", () => {
      if (!reply.sent) abortController.abort();
    });

    return generateMascotStyleBatch(repository, mascot, styleId, input, state.config.image_generation, logger, {
      signal: abortController.signal,
      imageFallbackConfig: state.config.image_fallback,
    });
  });

  const handleActionGeneration = async (mascotId: string, action: MascotActionType, body: unknown) => {
    const mascot = await repository.getMascot(mascotId);
    const parsedBody = GenerateMascotSpriteInputSchema.partial().parse(body && typeof body === "object" ? body : {});
    const result = await generateMascotActionArt(
      repository,
      mascot,
      action,
      state.config.image_generation,
      {
        prompt: parsedBody.prompt,
        frames_count: parsedBody.frames_count,
        fps: parsedBody.fps,
        loop: parsedBody.loop,
        imageFallbackConfig: state.config.image_fallback,
      },
      logger,
    );
    const updatedMascot = await repository.getMascot(mascotId);
    return {
      mascot: updatedMascot,
      action_asset: result.action_asset,
      render_bundle: updatedMascot.render_bundle ?? result.render_bundle,
      action_sprite: result.action_sprite,
      prompt_used: result.prompt_used,
      placeholder: result.placeholder,
    };
  };

  /** Modern endpoint: generates action art and updates V2 render_bundle. */
  server.post("/api/mascots/:mascotId/actions/:action/generate", async (request) => {
    const { mascotId, action: rawAction } = request.params as { mascotId: string; action: string };
    const action = MascotActionTypeSchema.parse(rawAction);
    return handleActionGeneration(mascotId, action, request.body);
  });

  /** Compatibility endpoint: new clients should create one action image and use V2 motion metadata. */
  server.post("/api/mascots/:mascotId/generate-sprite", async (request) => {
    const mascotId = (request.params as { mascotId: string }).mascotId;
    const input = GenerateMascotSpriteInputSchema.parse(request.body);
    return handleActionGeneration(mascotId, input.action, request.body);
  });

  /** Modern endpoint: uploads action art and updates V2 render_bundle. */
  server.post("/api/mascots/:mascotId/actions/:action/upload", async (request) => {
    const { mascotId, action: rawAction } = request.params as { mascotId: string; action: string };
    const action = MascotActionTypeSchema.parse(rawAction);
    return handleActionUpload(repository, mascotId, action, request.body);
  });

  /** Compatibility endpoint: imported multi-frame strips remain readable but are not the V2 authoring model. */
  server.post("/api/mascots/:mascotId/upload-sprite", async (request) => {
    const mascotId = (request.params as { mascotId: string }).mascotId;
    const input = UploadMascotSpriteInputSchema.parse(request.body);
    return handleActionUpload(repository, mascotId, input.action, request.body);
  });

  server.post("/api/mascots/:mascotId/remove-background", async (request) => {
    const mascotId = (request.params as { mascotId: string }).mascotId;
    const body = request.body && typeof request.body === "object" ? request.body : {};
    const input = RemoveMascotBackgroundInputSchema.parse(body);
    const updated = await removeMascotAssetBackground(repository, mascotId, input.target, logger);
    return { mascot: updated };
  });
}
