import path from "node:path";
import { createReadStream } from "node:fs";
import type { FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import { generateAssetETag, isAssetNotModified, resolveMediaMimeType } from "../utils/mediaMime.js";
import { z } from "zod";
import {
  BatchGenerateStyleSlotsInputSchema,
  CalibrateMascotActionInputSchema,
  CreateMascotInputSchema,
  CreateMascotStyleInputSchema,
  GenerateMascotConceptInputSchema,
  GenerateMascotSlotInputSchema,
  GenerateMascotSpriteInputSchema,
  GenerateMascotStyleConceptRequestSchema,
  MascotActionTypeSchema,
  MascotMigrationInputSchema,
  MASCOT_ACTION_META,
  RemoveMascotBackgroundInputSchema,
  UpdateMascotInputSchema,
  UpdateMascotSlotInputSchema,
  UpdateMascotStyleInputSchema,
  UploadMascotSpriteInputSchema,
  type MascotActionType,
  type MascotProfile,
} from "@studio/shared";
import type { StudioLogger } from "../logger.js";
import {
  exportMascotPackage,
  generateMascotActionSprite,
  generateMascotConceptArt,
  generateMascotStyleBatch,
  generateMascotStyleConcept,
  generateMascotStyleSlot,
  importMascotPackage,
  removeMascotAssetBackground,
} from "../quiz/mascotService.js";
import type { RepositoryService } from "../repository.js";
import { removeImageBackground } from "../utils/imageMatting.js";
import type { AppState } from "./state.js";
import { migrateMascotStorage, rollbackMascotStorage } from "../repository/mascotMigration.js";

export type MascotsRouteDeps = {
  repository: RepositoryService;
  logger: StudioLogger;
  state: AppState;
};

export function registerMascotsRoutes(deps: MascotsRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository, logger, state } = deps;
    server.get("/api/mascots", async () => ({ mascots: await repository.listMascots() }));
    server.post("/api/mascots/migration", async (request) => {
      const input = MascotMigrationInputSchema.parse(request.body ?? {});
      if (input.mode === "rollback") {
        if (!input.migration_id) throw new Error("migration_id is required for mascot rollback");
        return { report: await rollbackMascotStorage(repository, input.migration_id) };
      }
      return {
        report: await migrateMascotStorage(repository, {
          mode: input.mode,
          migration_id: input.migration_id,
          mascot_id: input.mascot_id,
        }),
      };
    });
    server.get("/api/mascots/:mascotId", async (request) => {
      const mascotId = (request.params as { mascotId: string }).mascotId;
      return { mascot: await repository.getMascot(mascotId) };
    });
    server.post("/api/mascots", async (request, reply) => {
      const input = CreateMascotInputSchema.parse(request.body);
      const mascot = await repository.saveMascot(input);
      return reply.code(201).send({ mascot });
    });
    server.put("/api/mascots/:mascotId", async (request) => {
      const mascotId = (request.params as { mascotId: string }).mascotId;
      const input = UpdateMascotInputSchema.parse(request.body);
      const current = await repository.getMascot(mascotId);
      const updated = await repository.saveMascot({ ...current, ...input, id: mascotId });
      return { mascot: updated };
    });
    server.delete("/api/mascots/:mascotId", async (request) => {
      const mascotId = (request.params as { mascotId: string }).mascotId;
      await repository.deleteMascot(mascotId);
      return { ok: true };
    });
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

        const result = await generateMascotStyleConcept(repository, mascot, styleId, state.config.image_generation, { prompt }, logger);

        const updatedMascot = await repository.getMascot(mascotId);
        const updatedStyle = (updatedMascot.styles || []).find((s) => s.id === styleId) || style;

        return reply.code(200).send({
          success: true,
          style: updatedStyle,
          mascot: updatedMascot,
          anchor_image_url: result.anchor_image_url,
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
    server.patch("/api/mascots/:mascotId/styles/:styleId/slots", async (request) => {
      const { mascotId, styleId } = request.params as { mascotId: string; styleId: string };
      const rawBody = typeof request.body === "object" && request.body !== null ? request.body : {};
      const input = UpdateMascotSlotInputSchema.parse({ style_id: styleId, ...rawBody });
      const mascot = await repository.updateMascotSlot(mascotId, input);
      return { mascot };
    });
    server.post("/api/mascots/:mascotId/styles/:styleId/generate-slot", async (request) => {
      const { mascotId, styleId } = request.params as { mascotId: string; styleId: string };
      const rawBody = typeof request.body === "object" && request.body !== null ? request.body : {};
      const input = GenerateMascotSlotInputSchema.parse({ style_id: styleId, ...rawBody });
      const mascot = await repository.getMascot(mascotId);
      const result = await generateMascotStyleSlot(repository, mascot, styleId, input, state.config.image_generation, logger);
      return result;
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
      const result = await generateMascotStyleBatch(repository, mascot, styleId, input, state.config.image_generation, logger, {
        signal: abortController.signal,
      });
      return result;
    });
    server.post("/api/mascots/:mascotId/active-style", async (request) => {
      const mascotId = (request.params as { mascotId: string }).mascotId;
      const { style_id } = z.object({ style_id: z.string().min(1) }).parse(request.body);
      const mascot = await repository.setActiveMascotStyle(mascotId, style_id);
      return { mascot };
    });
    server.get("/api/mascots/:mascotId/assets/:filename", async (request, reply) => {
      const params = request.params as { mascotId: string; filename: string };
      const file = await repository.getMascotAssetFile(params.mascotId, params.filename);
      const etag = generateAssetETag(file.size, file.modified_at);
      const lastModified = new Date(file.modified_at).toUTCString();
      const cacheControl = "public, max-age=31536000, immutable";

      if (isAssetNotModified(request.headers, etag, file.modified_at)) {
        return reply.code(304).headers({ etag, "last-modified": lastModified, "cache-control": cacheControl }).send();
      }

      const contentType = await resolveMediaMimeType(file.absolutePath, params.filename);
      return reply
        .headers({
          "content-type": contentType,
          "content-length": file.size,
          "cache-control": cacheControl,
          etag,
          "last-modified": lastModified,
        })
        .send(createReadStream(file.absolutePath));
    });
    server.post("/api/mascots/:mascotId/generate-concept", async (request) => {
      const mascotId = (request.params as { mascotId: string }).mascotId;
      const input = GenerateMascotConceptInputSchema.parse(request.body ?? {});
      const mascot = await repository.getMascot(mascotId);
      if (input.style) mascot.visual_style = input.style;
      const result = await generateMascotConceptArt(repository, mascot, state.config.image_generation, input.prompt, logger);
      const updatedMascot = await repository.getMascot(mascotId);
      return { mascot: updatedMascot, ...result };
    });
    /** Compatibility endpoint: new clients should create one action image and use V2 motion metadata. */
    server.post("/api/mascots/:mascotId/generate-sprite", async (request) => {
      const mascotId = (request.params as { mascotId: string }).mascotId;
      const input = GenerateMascotSpriteInputSchema.parse(request.body);
      const mascot = await repository.getMascot(mascotId);
      const result = await generateMascotActionSprite(
        repository,
        mascot,
        input.action,
        state.config.image_generation,
        {
          prompt: input.prompt,
          frames_count: input.frames_count,
          fps: input.fps,
          loop: input.loop,
        },
        logger,
      );
      const updatedMascot = await repository.getMascot(mascotId);
      return { mascot: updatedMascot, ...result };
    });
    /** Compatibility endpoint: imported multi-frame strips remain readable but are not the V2 authoring model. */
    server.post("/api/mascots/:mascotId/upload-sprite", async (request) => {
      const mascotId = (request.params as { mascotId: string }).mascotId;
      const input = UploadMascotSpriteInputSchema.parse(request.body);
      const mascot = await repository.getMascot(mascotId);
      const base64Data = input.data.replace(/^data:image\/[^;]+;base64,/i, "");
      let buffer = Buffer.from(base64Data, "base64");
      buffer = Buffer.from(await removeImageBackground(buffer));
      const filename = `sprite_${input.action}_${Date.now()}.png`;
      const assetUrl = await repository.saveMascotAsset(mascotId, filename, buffer);
      const meta = MASCOT_ACTION_META[input.action];
      const actionSprite = {
        action: input.action,
        sprite_url: assetUrl,
        frames_count: input.frames_count,
        fps: input.fps,
        loop: input.loop,
        frame_width: input.frame_width,
        frame_height: input.frame_height,
        motion_preset: input.motion_preset ?? meta?.motionPreset ?? "breathe",
        preview_url: assetUrl,
      };
      const updated = await repository.saveMascot({
        ...mascot,
        actions: { ...mascot.actions, [input.action]: actionSprite },
        updated_at: new Date().toISOString(),
      });
      return { mascot: updated, action_sprite: actionSprite };
    });
    server.post("/api/mascots/:mascotId/remove-background", async (request) => {
      const mascotId = (request.params as { mascotId: string }).mascotId;
      const body = request.body && typeof request.body === "object" ? request.body : {};
      const input = RemoveMascotBackgroundInputSchema.parse(body);
      const updated = await removeMascotAssetBackground(repository, mascotId, input.target, logger);
      return { mascot: updated };
    });
    server.get("/api/mascots/:mascotId/export", async (request, reply) => {
      const mascotId = (request.params as { mascotId: string }).mascotId;
      const { zipBuffer, filename } = await exportMascotPackage(repository, mascotId);
      return reply
        .header("content-type", "application/zip")
        .header("content-disposition", `attachment; filename="${filename}"`)
        .header("content-length", zipBuffer.length)
        .send(zipBuffer);
    });
    server.post("/api/mascots/import", async (request, reply) => {
      const body = request.body as { data: string };
      if (!body || !body.data) return reply.code(400).send({ message: "Missing base64 data for import" });
      const base64Data = body.data.replace(/^data:[^;]+;base64,/i, "");
      const zipBuffer = Buffer.from(base64Data, "base64");
      const mascot = await importMascotPackage(repository, zipBuffer);
      return reply.code(201).send({ mascot });
    });
    server.patch("/api/mascots/:mascotId/actions/:action/calibrate", async (request) => {
      const { mascotId, action: rawAction } = request.params as { mascotId: string; action: string };
      const action = MascotActionTypeSchema.parse(rawAction);
      const input = CalibrateMascotActionInputSchema.parse(request.body);
      const updated = await repository.calibrateMascotAction(mascotId, action, input);
      return { mascot: updated, action: updated.actions[action] };
    });
    done();
  };
}
