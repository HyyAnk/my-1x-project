import { PairCreationService } from "../introOutroScripts/pairCreationService.js";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { FastifyPluginCallback } from "fastify";
import { findBuiltInPresetById, nowIso, type IntroOutroStyle } from "@studio/shared";
import type { StudioLogger } from "../logger.js";
import { RepositoryError, type RepositoryService } from "../repository.js";
import type { AppState } from "./state.js";
import type { IntroOutroScriptRepository } from "../introOutroScripts/repository.js";
import { listIntroOutroCategorySummaries } from "./introOutro/introOutroCategoryService.js";
import {
  CreateIntroOutroStyleInputSchema,
  SetDefaultIntroOutroStyleInputSchema,
  UpdateIntroOutroStyleInputSchema,
} from "./introOutro/introOutroSchemas.js";

export type IntroOutroStylesRouteDeps = {
  repository: RepositoryService;
  logger: StudioLogger;
  state: AppState;
  scripts: IntroOutroScriptRepository;
};

export function registerIntroOutroStylesRoutes(deps: IntroOutroStylesRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository, scripts } = deps;
    const pairs = new PairCreationService(repository, scripts);

    server.get("/api/channels/:channelId/intro-outro-categories", async (request) => {
      const { channelId } = request.params as { channelId: string };
      return { categories: await listIntroOutroCategorySummaries(repository, channelId) };
    });

    // List all styles for channel
    server.get("/api/channels/:channelId/intro-outro-styles", async (request) => {
      const { channelId } = request.params as { channelId: string };
      const styles = await repository.listChannelIntroOutroStyles(channelId);
      const { style_preset_id: stylePresetId } = request.query as { style_preset_id?: string };
      if (!stylePresetId) return { styles };
      return {
        styles: styles.filter((style) =>
          stylePresetId === "uncategorized" ? !style.style_preset_id : style.style_preset_id === stylePresetId,
        ),
      };
    });

    // Create a new style
    server.post("/api/channels/:channelId/intro-outro-styles", { bodyLimit: 250 * 1024 * 1024 }, async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      const input = CreateIntroOutroStyleInputSchema.parse(request.body);
      const style = await pairs.create(channelId, input);
      return reply.status(201).send({ style });
    });

    server.patch("/api/channels/:channelId/intro-outro-styles/:styleId", async (request) => {
      const { channelId, styleId } = request.params as { channelId: string; styleId: string };
      const body = UpdateIntroOutroStyleInputSchema.parse(request.body);
      const current = await repository.getChannelIntroOutroStyle(channelId, styleId);
      if (!current) throw new RepositoryError(`Intro/Outro pair not found: ${styleId}`, "INTRO_OUTRO_PAIR_NOT_FOUND");
      const preset = body.style_preset_id ? findBuiltInPresetById(body.style_preset_id) : undefined;
      if (body.style_preset_id && !preset) throw new RepositoryError("Unknown built-in style preset", "INVALID_STYLE_PRESET");
      const style: IntroOutroStyle = {
        ...current,
        schema_version: 2,
        ...(preset ? { style_preset_id: preset.id } : {}),
        ...(body.status ? { status: body.status } : {}),
        updated_at: nowIso(),
      };
      await repository.saveChannelIntroOutroStyle(channelId, style);
      return { style };
    });

    // Delete style
    server.delete("/api/channels/:channelId/intro-outro-styles/:styleId", async (request) => {
      const { channelId, styleId } = request.params as { channelId: string; styleId: string };
      await repository.deleteChannelIntroOutroStyle(channelId, styleId);

      // If channel default was this style, unset it
      const channel = await repository.getChannel(channelId);
      if (channel.default_intro_outro_style_id === styleId) {
        await repository.updateChannel(channelId, { default_intro_outro_style_id: null });
      }

      return { ok: true };
    });

    // Stream clip video
    server.get("/api/channels/:channelId/intro-outro-styles/:styleId/clips/:kind", async (request, reply) => {
      const { channelId, styleId, kind } = request.params as {
        channelId: string;
        styleId: string;
        kind: "intro" | "outro";
      };
      if (kind !== "intro" && kind !== "outro") {
        throw new RepositoryError("Kind must be 'intro' or 'outro'", "INVALID_KIND");
      }
      const clipPath = await repository.getIntroOutroClipPath(channelId, styleId, kind);
      const fileStat = await stat(clipPath);
      return reply
        .headers({
          "content-type": "video/mp4",
          "content-length": fileStat.size,
          "cache-control": "public, max-age=3600",
        })
        .send(createReadStream(clipPath));
    });

    // Stream thumbnail image
    server.get("/api/channels/:channelId/intro-outro-styles/:styleId/thumbs/:kind", async (request, reply) => {
      const { channelId, styleId, kind } = request.params as {
        channelId: string;
        styleId: string;
        kind: "intro" | "outro";
      };
      if (kind !== "intro" && kind !== "outro") {
        throw new RepositoryError("Kind must be 'intro' or 'outro'", "INVALID_KIND");
      }
      const thumbPath = await repository.getIntroOutroThumbPath(channelId, styleId, kind);
      if (!thumbPath) {
        return reply.status(404).send({ error: "Thumbnail not found" });
      }
      const fileStat = await stat(thumbPath);
      return reply
        .headers({
          "content-type": "image/jpeg",
          "content-length": fileStat.size,
          "cache-control": "public, max-age=3600",
        })
        .send(createReadStream(thumbPath));
    });

    // Set channel default style
    server.put("/api/channels/:channelId/default-intro-outro-style", async (request) => {
      const { channelId } = request.params as { channelId: string };
      const body = SetDefaultIntroOutroStyleInputSchema.parse(request.body);
      const channel = await repository.updateChannel(channelId, { default_intro_outro_style_id: body.style_id });
      return { ok: true, channel };
    });

    done();
  };
}
