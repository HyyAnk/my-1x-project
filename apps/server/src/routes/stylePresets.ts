import type { FastifyPluginCallback } from "fastify";
import { CreateStylePresetInputSchema, StylePresetSlotsSchema, UpdateStylePresetInputSchema, type StyleSlot } from "@studio/shared";
import { getStyleCatalogEntry, getStyleCatalogSnapshot } from "../quiz/visual/styleModules/catalog.js";
import type { RepositoryService } from "../repository.js";

export type StylePresetsRouteDeps = { repository: RepositoryService };

const slotFields: ReadonlyArray<[keyof ReturnType<typeof StylePresetSlotsSchema.parse>, StyleSlot]> = [
  ["thinking_bar_style", "thinking-bar"],
  ["question_box_style", "question-box"],
  ["answer_card_style", "answer-card"],
  ["counter_style", "counter"],
  ["background_style", "background"],
];

function validateStyleSlots(input: Record<string, unknown>): { code: string; message: string; slot: StyleSlot; id: string } | null {
  const slots = StylePresetSlotsSchema.parse(input);
  for (const [field, slot] of slotFields) {
    const id = slots[field];
    if (!getStyleCatalogEntry(slot, id)) {
      return { code: "UNKNOWN_STYLE_ID", message: `Unknown ${slot} style: ${id}`, slot, id };
    }
  }
  return null;
}

export function registerStylePresetsRoutes(deps: StylePresetsRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    server.get("/api/style-presets", async () => ({ presets: await deps.repository.listStylePresets() }));
    server.get("/api/style-catalog", async () => getStyleCatalogSnapshot());
    server.post("/api/style-presets", async (request, reply) => {
      const parsed = CreateStylePresetInputSchema.safeParse(request.body);
      if (!parsed.success)
        return reply.code(400).send({ error: "Invalid style preset", code: "VALIDATION_ERROR", issues: parsed.error.issues });
      const invalid = validateStyleSlots(parsed.data);
      if (invalid) return reply.code(400).send({ error: invalid.message, code: invalid.code, slot: invalid.slot, id: invalid.id });
      const input = parsed.data;
      const preset = await deps.repository.createStylePreset(input);
      return reply.code(201).send({ preset });
    });
    server.put("/api/style-presets/:presetId", async (request, reply) => {
      const presetId = (request.params as { presetId: string }).presetId;
      const parsed = UpdateStylePresetInputSchema.safeParse(request.body);
      if (!parsed.success)
        return reply.code(400).send({ error: "Invalid style preset", code: "VALIDATION_ERROR", issues: parsed.error.issues });
      const patch = parsed.data;
      const current = (await deps.repository.listStylePresets()).find((preset) => preset.id === presetId);
      if (!current) {
        const error = new Error(`Style preset not found: ${presetId}`) as Error & { statusCode?: number };
        error.statusCode = 404;
        throw error;
      }
      const invalid = validateStyleSlots({ ...current, ...patch });
      if (invalid) return reply.code(400).send({ error: invalid.message, code: invalid.code, slot: invalid.slot, id: invalid.id });
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
