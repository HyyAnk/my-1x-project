import path from "node:path";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import type { FastifyPluginCallback } from "fastify";
import {
  CalibrateMascotActionInputSchema,
  CreateMascotInputSchema,
  GenerateMascotConceptInputSchema,
  GenerateMascotSpriteInputSchema,
  MASCOT_ACTION_META,
  RemoveMascotBackgroundInputSchema,
  UpdateMascotInputSchema,
  UploadMascotSpriteInputSchema,
  type MascotActionType,
} from "@studio/shared";
import type { StudioLogger } from "../logger.js";
import {
  exportMascotPackage,
  generateMascotActionSprite,
  generateMascotConceptArt,
  importMascotPackage,
  removeMascotAssetBackground,
} from "../quiz/mascotService.js";
import type { RepositoryService } from "../repository.js";
import { removeImageBackground } from "../utils/imageMatting.js";
import type { AppState } from "./state.js";

export type MascotsRouteDeps = {
  repository: RepositoryService;
  logger: StudioLogger;
  state: AppState;
};

export function registerMascotsRoutes(deps: MascotsRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository, logger, state } = deps;
    server.get("/api/mascots", async () => ({ mascots: await repository.listMascots() }));
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
    server.get("/api/mascots/:mascotId/assets/:filename", async (request, reply) => {
      const params = request.params as { mascotId: string; filename: string };
      const file = await repository.getMascotAssetFile(params.mascotId, params.filename);
      const ext = path.extname(params.filename).toLowerCase();
      let contentType = ext === ".svg" ? "image/svg+xml" : ext === ".webp" ? "image/webp" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
      try {
        const sample = await readFile(file.absolutePath, { encoding: "utf8" });
        if (sample.trimStart().startsWith("<svg") || sample.trimStart().startsWith("<?xml")) contentType = "image/svg+xml";
      } catch {
        // Keep default contentType
      }
      return reply.headers({ "content-type": contentType, "content-length": file.size, "cache-control": "public, max-age=86400" }).send(createReadStream(file.absolutePath));
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
    server.post("/api/mascots/:mascotId/generate-sprite", async (request) => {
      const mascotId = (request.params as { mascotId: string }).mascotId;
      const input = GenerateMascotSpriteInputSchema.parse(request.body);
      const mascot = await repository.getMascot(mascotId);
      const result = await generateMascotActionSprite(repository, mascot, input.action, state.config.image_generation, {
        prompt: input.prompt,
        frames_count: input.frames_count,
        fps: input.fps,
        loop: input.loop,
      }, logger);
      const updatedMascot = await repository.getMascot(mascotId);
      return { mascot: updatedMascot, ...result };
    });
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
      const updated = await removeMascotAssetBackground(repository, mascotId, input.target);
      return { mascot: updated };
    });
    server.get("/api/mascots/:mascotId/export", async (request, reply) => {
      const mascotId = (request.params as { mascotId: string }).mascotId;
      const { zipBuffer, filename } = await exportMascotPackage(repository, mascotId);
      return reply.header("content-type", "application/zip").header("content-disposition", `attachment; filename="${filename}"`).header("content-length", zipBuffer.length).send(zipBuffer);
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
      const { mascotId, action } = request.params as { mascotId: string; action: MascotActionType };
      const input = CalibrateMascotActionInputSchema.parse(request.body);
      const updated = await repository.calibrateMascotAction(mascotId, action, input);
      return { mascot: updated, action: updated.actions[action] };
    });
    done();
  };
}
