import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { FastifyPluginCallback } from "fastify";
import { z } from "zod";
import { getTransition, isValidTransition, nowIso, type IntroOutroStyle, type IntroOutroTransitionType } from "@studio/shared";
import type { StudioLogger } from "../logger.js";
import { RepositoryError, type RepositoryService } from "../repository.js";
import type { AppState } from "./state.js";

export const CreateIntroOutroStyleInputSchema = z
  .object({
    name: z.string().min(1).max(50),
    style_id: z.string().optional(),
    transition_type: z.string().min(1).default("stinger_swipe"),
    transition_duration_seconds: z.number().min(0).max(1.5).optional(),
    audio_mode: z.enum(["use_video_audio", "overlay_bgm"]).default("use_video_audio"),
    intro_data: z.string().min(1),
    outro_data: z.string().min(1),
    intro_filename: z.string().default("intro.mp4"),
    outro_filename: z.string().default("outro.mp4"),
  })
  .superRefine((data, ctx) => {
    if (!isValidTransition(data.transition_type, "intro_outro") && !isValidTransition(data.transition_type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid or unregistered transition type '${data.transition_type}' for intro/outro`,
        path: ["transition_type"],
      });
      return;
    }

    const def = getTransition(data.transition_type);
    if (def) {
      const duration = data.transition_duration_seconds ?? def.defaultDuration;
      if (duration < def.minDuration || duration > def.maxDuration) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Transition duration ${duration}s is out of range [${def.minDuration}s, ${def.maxDuration}s] for transition '${def.name}'`,
          path: ["transition_duration_seconds"],
        });
      }
    }
  })
  .transform((data) => {
    const def = getTransition(data.transition_type);
    const resolvedDuration = data.transition_duration_seconds ?? def?.defaultDuration ?? 0.5;
    return {
      ...data,
      transition_duration_seconds: resolvedDuration,
      transition_type: data.transition_type,
    };
  });

export type CreateIntroOutroStyleInput = z.infer<typeof CreateIntroOutroStyleInputSchema>;

export type IntroOutroStylesRouteDeps = {
  repository: RepositoryService;
  logger: StudioLogger;
  state: AppState;
};

function parseVideoPayload(data: string): Buffer | string {
  if (data.startsWith("data:")) {
    const commaIndex = data.indexOf(",");
    return Buffer.from(data.slice(commaIndex + 1), "base64");
  }
  // If it is a path to an existing local file
  if (data.length < 500 && (data.includes(":\\") || data.includes(":/") || data.startsWith("/"))) {
    return data;
  }
  return Buffer.from(data, "base64");
}

export function registerIntroOutroStylesRoutes(deps: IntroOutroStylesRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository } = deps;

    // List all styles for channel
    server.get("/api/channels/:channelId/intro-outro-styles", async (request) => {
      const { channelId } = request.params as { channelId: string };
      const styles = await repository.listChannelIntroOutroStyles(channelId);
      return { styles };
    });

    // Create a new style
    server.post("/api/channels/:channelId/intro-outro-styles", { bodyLimit: 250 * 1024 * 1024 }, async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      const input = CreateIntroOutroStyleInputSchema.parse(request.body);
      const styleId = input.style_id?.trim() || `style_${randomUUID().slice(0, 8)}`;

      const introSource = parseVideoPayload(input.intro_data);
      const outroSource = parseVideoPayload(input.outro_data);

      const introMeta = await repository.processAndStoreStyleClip(channelId, styleId, "intro", introSource, input.intro_filename);

      let outroMeta;
      try {
        outroMeta = await repository.processAndStoreStyleClip(channelId, styleId, "outro", outroSource, input.outro_filename);
      } catch (error) {
        // If outro processing fails, delete the partially created style
        await repository.deleteChannelIntroOutroStyle(channelId, styleId);
        throw error;
      }

      const style: IntroOutroStyle = {
        style_id: styleId,
        channel_id: channelId,
        name: input.name.trim(),
        intro: introMeta,
        outro: outroMeta,
        transition_type: input.transition_type,
        transition_duration_seconds: input.transition_duration_seconds,
        audio_mode: input.audio_mode,
        created_at: nowIso(),
        updated_at: nowIso(),
      };

      await repository.saveChannelIntroOutroStyle(channelId, style);
      return reply.status(201).send({ style });
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
      const body = z.object({ style_id: z.string().nullable() }).parse(request.body);
      const channel = await repository.updateChannel(channelId, { default_intro_outro_style_id: body.style_id });
      return { ok: true, channel };
    });

    done();
  };
}
