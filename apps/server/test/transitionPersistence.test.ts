import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { TransitionSettings } from "@studio/shared";
import { buildApp, type StudioApp } from "../src/app.js";
import { resolveProductionTransitionSettings } from "../src/quiz/render/transitions/resolveProductionTransitionSettings.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

async function createApp(): Promise<StudioApp> {
  const root = await mkdtemp(path.join(os.tmpdir(), "style-presets-transitions-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# DNA\n");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n");
  return buildApp(root);
}

const basePresetInput = {
  name: "Neon Arcade Preset",
  palette_id: "aqua",
  theme: "candy_arcade",
  thinking_bar_style: "energy_laser",
  question_box_style: "glass_morphism",
  answer_card_style: "glass_neon",
  counter_style: "neon_badge",
  background_style: "aurora_glow",
};

describe("Task 8: Transition persistence & cross-consumer synchronization", () => {
  it("round-trips create, update, load, duplicate, and precedence resolution with transitions", async () => {
    const app = await createApp();
    try {
      const settings: TransitionSettings = {
        intro: { id: "crossfade", durationSeconds: 0.8 },
        scene: { id: "brush_wave", durationSeconds: 0.75 },
      };

      // 1. Create style preset with transition settings
      const saved = await app.repository.createStylePreset({
        ...basePresetInput,
        transitions: settings,
      });
      expect(saved.id).toBeDefined();
      expect(saved.transitions).toEqual(settings);

      // 2. Load preset and verify exact equality
      const presets = await app.repository.listStylePresets();
      const loaded = presets.find((p) => p.id === saved.id)!;
      expect(loaded).toBeDefined();
      expect(loaded.transitions).toEqual(settings);

      // 3. Resolve production settings with explicit director override
      const explicitDirector: TransitionSettings = {
        scene: { id: "lightning_brush", durationSeconds: 0.6 },
      };
      const resolved = resolveProductionTransitionSettings({
        preset: loaded,
        director: explicitDirector,
      });

      // Director overrides scene transition from preset
      expect(resolved.scene.id).toBe("lightning_brush");
      expect(resolved.scene.durationSeconds).toBe(0.6);
      // Intro falls back to preset's crossfade
      expect(resolved.intro.id).toBe("crossfade");
      expect(resolved.intro.durationSeconds).toBe(0.8);

      // 4. Update preset: partial placement update
      const updatedSettings: TransitionSettings = {
        intro: { id: "stinger_swipe", durationSeconds: 0.5 },
        scene: { id: "brush_wave", durationSeconds: 0.75 },
      };
      const updated = await app.repository.updateStylePreset(saved.id, {
        transitions: updatedSettings,
      });
      expect(updated.revision).toBe(2);
      expect(updated.transitions).toEqual(updatedSettings);

      // 5. Duplicate preset
      const duplicated = await app.repository.createStylePreset({
        ...basePresetInput,
        name: "Neon Arcade Preset (Copy)",
        transitions: updated.transitions,
      });
      expect(duplicated.transitions).toEqual(updatedSettings);
    } finally {
      await app.close();
    }
  });

  it("handles legacy presets without transitions seamlessly", async () => {
    const app = await createApp();
    try {
      // Legacy preset without transitions property
      const legacySaved = await app.repository.createStylePreset({
        ...basePresetInput,
        name: "Legacy Preset",
      });
      expect(legacySaved.transitions).toBeUndefined();

      const loaded = (await app.repository.listStylePresets()).find((p) => p.id === legacySaved.id)!;
      expect(loaded.transitions).toBeUndefined();

      // Production resolution falls back to canonical defaults
      const resolved = resolveProductionTransitionSettings({
        preset: loaded,
      });
      expect(resolved.intro.id).toBe("stinger_swipe");
      expect(resolved.scene.id).toBe("bubble_splash");
    } finally {
      await app.close();
    }
  });

  it("round-trips transitions via Fastify HTTP route endpoints", async () => {
    const app = await createApp();
    try {
      const payload = {
        ...basePresetInput,
        transitions: {
          intro: { id: "stinger_swipe", durationSeconds: 0.5 },
          scene: { id: "bubble_splash", durationSeconds: 0.86 },
        },
      };

      // POST /api/style-presets
      const resPost = await app.server.inject({
        method: "POST",
        url: "/api/style-presets",
        payload,
      });
      expect(resPost.statusCode).toBe(201);
      const { preset } = resPost.json<{ preset: any }>();
      expect(preset.transitions).toEqual(payload.transitions);

      // GET /api/style-presets
      const resGet = await app.server.inject({
        method: "GET",
        url: "/api/style-presets",
      });
      expect(resGet.statusCode).toBe(200);
      const found = resGet.json<{ presets: any[] }>().presets.find((p) => p.id === preset.id);
      expect(found.transitions).toEqual(payload.transitions);

      // PUT /api/style-presets/:id
      const resPut = await app.server.inject({
        method: "PUT",
        url: `/api/style-presets/${preset.id}`,
        payload: {
          transitions: {
            scene: { id: "cut", durationSeconds: 0 },
          },
        },
      });
      expect(resPut.statusCode).toBe(200);
      expect(resPut.json<{ preset: any }>().preset.transitions.scene.id).toBe("cut");
    } finally {
      await app.close();
    }
  });
});