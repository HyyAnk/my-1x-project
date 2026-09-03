import type { FastifyPluginCallback } from "fastify";
import type { StyleSlot } from "@studio/shared";
import {
  exportStyleModulePackage,
  exportStylePresetPackage,
  importStyleModulePackage,
  importStylePresetPackage,
} from "../quiz/visual/styleModules/exportPackage.js";
import { styleActivationManager } from "../quiz/visual/styleModules/activation.js";
import type { SlotScopedStyleModule } from "../quiz/visual/styleModules/types.js";
import type { RepositoryService } from "../repository.js";

const slots = new Set<StyleSlot>(["thinking-bar", "question-box", "answer-card", "counter", "background"]);

export function registerStyleModulesRoutes(deps?: { repository: RepositoryService }): FastifyPluginCallback {
  return (server, _options, done) => {
    server.get("/api/style-modules", () => styleActivationManager.getActiveSnapshot().catalog);
    server.get("/api/style-modules/:slot/:styleId/export", async (request, reply) => {
      const { slot: rawSlot, styleId } = request.params as { slot: string; styleId: string };
      if (!slots.has(rawSlot as StyleSlot)) return reply.code(400).send({ error: "Unknown style slot" });
      const module = styleActivationManager.resolveModule(rawSlot as StyleSlot, styleId);
      if (!module) return reply.code(404).send({ error: "Style module not found" });
      const exported = exportStyleModulePackage(module);
      return reply
        .header("content-type", "application/zip")
        .header("content-disposition", `attachment; filename="${exported.filename}"`)
        .send(exported.zipBuffer);
    });
    server.get("/api/style-modules/presets/:presetId/export", async (request, reply) => {
      if (!deps?.repository) return reply.code(503).send({ error: "Style preset storage unavailable" });
      const { presetId } = request.params as { presetId: string };
      const preset = (await deps.repository.listStylePresets()).find((item) => item.id === presetId);
      if (!preset) return reply.code(404).send({ error: "Style preset not found" });
      const exported = exportStylePresetPackage(preset);
      return reply
        .header("content-type", "application/zip")
        .header("content-disposition", `attachment; filename="${exported.filename}"`)
        .send(exported.zipBuffer);
    });
    server.post("/api/style-modules/presets/import", async (request, reply) => {
      if (!deps?.repository) return reply.code(503).send({ error: "Style preset storage unavailable" });
      const body = request.body as { data?: string };
      if (!body?.data) return reply.code(400).send({ error: "Missing base64 package data" });
      try {
        const input = importStylePresetPackage(Buffer.from(body.data.replace(/^data:.*?;base64,/i, ""), "base64"));
        const preset = await deps.repository.createStylePreset(input);
        return reply.code(201).send({ preset });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid style preset package" });
      }
    });
    server.post("/api/style-modules/import", async (request, reply) => {
      const body = request.body as { data?: string; activate?: boolean; allow_revision?: boolean };
      if (!body?.data) return reply.code(400).send({ error: "Missing base64 package data" });
      try {
        const zip = Buffer.from(body.data.replace(/^data:.*?;base64,/i, ""), "base64");
        const existingIds = styleActivationManager.getActiveSnapshot().catalog.entries.map((entry) => entry.id);
        const module = importStyleModulePackage(zip, { existingIds, allowRevision: body.allow_revision });
        const snapshot = body.activate === false ? undefined : styleActivationManager.stageAndActivate(module);
        return reply.code(201).send({
          module: module.manifest,
          state: snapshot ? "active" : "validated",
          revision: snapshot?.revision ?? module.manifest.version,
          catalog: snapshot?.catalog,
        });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid style module package" });
      }
    });
    server.post("/api/style-modules/activate", async (request, reply) => {
      try {
        const body = request.body as { module?: SlotScopedStyleModule; data?: string };
        const module = body.data
          ? importStyleModulePackage(Buffer.from(body.data.replace(/^data:.*?;base64,/i, ""), "base64"), {
              existingIds: styleActivationManager.getActiveSnapshot().catalog.entries.map((entry) => entry.id),
              allowRevision: true,
            })
          : body.module;
        if (!module) return reply.code(400).send({ error: "Missing style module" });
        const snapshot = styleActivationManager.stageAndActivate(module);
        return reply.send({ state: "active", revision: snapshot.revision, catalog: snapshot.catalog });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Style activation failed" });
      }
    });
    done();
  };
}
