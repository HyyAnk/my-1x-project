import type { FastifyPluginCallback } from "fastify";
import { CreateStylePresetInputSchema, StylePresetSlotsSchema, UpdateStylePresetInputSchema, type StyleSlot } from "@studio/shared";
import { getStyleCatalogEntry } from "../quiz/visual/styleModules/catalog.js";
import type { RepositoryService } from "../repository.js";

export type StylePresetsRouteDeps = { repository: RepositoryService };

const slotFields: ReadonlyArray<[keyof ReturnType<typeof StylePresetSlotsSchema.parse>, StyleSlot]> = [
  ["thinking_bar_style", "thinking-bar"],
  ["question_box_style", "question-box"],
  ["answer_card_style", "answer-card"],
  ["counter_style", "counter"],
  ["background_style", "background"],
];

function validateStyleSlots(input: Record<string, unknown>): void {
  const slots = StylePresetSlotsSchema.parse(input);
  for (const [field, slot] of slotFields) {
    const id = slots[field];
    if (!getStyleCatalogEntry(slot, id)) {
      const error = new Error(`Unknown ${slot} style: ${id}`) as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }
  }
}

export function registerStylePresetsRoutes(deps: StylePresetsRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    server.get("/api/style-presets", async () => ({ presets: await deps.repository.listStylePresets() }));
    server.post("/api/style-presets", async (request, reply) => {
      const input = CreateStylePresetInputSchema.parse(request.body);
      validateStyleSlots(input);
      const preset = await deps.repository.createStylePreset(input);
      return reply.code(201).send({ preset });
    });
    server.put("/api/style-presets/:presetId", async (request) => {
      const presetId = (request.params as { presetId: string }).presetId;
      const patch = UpdateStylePresetInputSchema.parse(request.body);
      const current = (await deps.repository.listStylePresets()).find((preset) => preset.id === presetId);
      if (!current) {
        const error = new Error(`Style preset not found: ${presetId}`) as Error & { statusCode?: number };
        error.statusCode = 404;
        throw error;
      }
      validateStyleSlots({ ...current, ...patch });
      return { preset: await deps.repository.updateStylePreset(presetId, patch) };
    });
    server.delete("/api/style-presets/:presetId", async (request) => {
      const presetId = (request.params as { presetId: string }).presetId;
      await deps.repository.deleteStylePreset(presetId);
      return { ok: true };
    });
    done();
  };
}
