import type { FastifyPluginCallback } from "fastify";
import {
  type MotionPromptRequest,
  type MotionTemplatePlacement,
  type SaveChannelMotionPresetRequest,
  MotionPreviewMarkupRequestSchema,
  MotionPromptRequestSchema,
  SaveChannelMotionPresetRequestSchema,
  getMotionTemplateDefinition,
  listMotionTemplates,
} from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import { generateMotionPromptConfig } from "../introOutroScripts/services/motionPromptService.js";
import { renderMotionIntroClip, renderMotionOutroClip } from "../quiz/render/motion/index.js";
import {
  deleteChannelMotionPreset,
  listChannelMotionPresets,
  saveChannelMotionPreset,
} from "../repository/motionPresets.js";

export interface MotionRoutesDeps {
  repository: RepositoryService;
}

export function registerMotionRoutes(deps: MotionRoutesDeps): FastifyPluginCallback {
  const { repository } = deps;

  return (server, _options, done) => {
    // 1. GET /api/motion/templates
    server.get("/api/motion/templates", async (request, reply) => {
      const query = request.query as { placement?: string };
      const placement = (query.placement as MotionTemplatePlacement | undefined) ?? undefined;
      const templates = listMotionTemplates(placement);
      return reply.code(200).send({ templates });
    });

    // 2. POST /api/motion/prompt-generate
    server.post("/api/motion/prompt-generate", async (request, reply) => {
      const parsed = MotionPromptRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: {
            code: "INVALID_MOTION_PROMPT_REQUEST",
            message: parsed.error.issues.map((i) => i.message).join(", "),
          },
        });
      }

      const output = generateMotionPromptConfig(parsed.data as MotionPromptRequest);
      return reply.code(200).send(output);
    });

    // 3. POST /api/motion/preview-markup
    server.post("/api/motion/preview-markup", async (request, reply) => {
      const parsed = MotionPreviewMarkupRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: {
            code: "INVALID_MOTION_PREVIEW_REQUEST",
            message: parsed.error.issues.map((i) => i.message).join(", "),
          },
        });
      }

      const { templateId, options, topicTitle, channelName, aspectRatio, durationSeconds } = parsed.data;
      const definition = getMotionTemplateDefinition(templateId);
      if (!definition) {
        return reply.code(404).send({
          error: {
            code: "MOTION_TEMPLATE_NOT_FOUND",
            message: `Motion template "${templateId}" is not registered.`,
          },
        });
      }

      const effectiveDuration = durationSeconds ?? definition.defaultDurationSeconds;
      const isOutro = definition.placement === "outro";

      const clipMarkup = isOutro
        ? renderMotionOutroClip(templateId, {
            topicTitle,
            channelName,
            durationSeconds: effectiveDuration,
            aspectRatio,
            options,
          })
        : renderMotionIntroClip(templateId, {
            topicTitle,
            channelName,
            durationSeconds: effectiveDuration,
            aspectRatio,
            options,
          });

      const fullHtml = [
        `<!doctype html>`,
        `<html>`,
        `<head>`,
        `  <meta charset="utf-8">`,
        `  <meta name="viewport" content="width=device-width, initial-scale=1">`,
        `  <style>`,
        `    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }`,
        `    .candy-scene { width: 100vw; height: 100vh; position: absolute; inset: 0; }`,
        `  </style>`,
        `</head>`,
        `<body>`,
        clipMarkup,
        `</body>`,
        `</html>`,
      ].join("\n");

      return reply.code(200).send({
        html: fullHtml,
        templateId,
        durationSeconds: effectiveDuration,
        aspectRatio,
      });
    });

    // 4. GET /api/channels/:channelId/motion-presets
    server.get("/api/channels/:channelId/motion-presets", async (request, reply) => {
      const params = request.params as { channelId: string };
      const presets = await listChannelMotionPresets(repository, params.channelId);
      return reply.code(200).send({ channelId: params.channelId, presets });
    });

    // 5. PUT /api/channels/:channelId/motion-presets
    server.put("/api/channels/:channelId/motion-presets", async (request, reply) => {
      const params = request.params as { channelId: string };
      const parsed = SaveChannelMotionPresetRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: {
            code: "INVALID_MOTION_PRESET_PAYLOAD",
            message: parsed.error.issues.map((i) => i.message).join(", "),
          },
        });
      }

      const preset = await saveChannelMotionPreset(
        repository,
        params.channelId,
        parsed.data as SaveChannelMotionPresetRequest,
      );
      return reply.code(200).send({ success: true, preset });
    });

    // 6. DELETE /api/channels/:channelId/motion-presets/:presetId
    server.delete("/api/channels/:channelId/motion-presets/:presetId", async (request, reply) => {
      const params = request.params as { channelId: string; presetId: string };
      const deleted = await deleteChannelMotionPreset(repository, params.channelId, params.presetId);
      return reply.code(200).send({ success: deleted });
    });

    done();
  };
}
