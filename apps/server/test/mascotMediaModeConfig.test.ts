import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, loadConfig, saveVideoSettings } from "../src/config.js";
import { studioRuntimePath } from "../src/runtimePaths.js";
import { buildApp } from "../src/app.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Mascot Media Mode Server Configuration & Routes", () => {
  it("has DEFAULT_CONFIG.video_generation.mascot_media_mode set to 'static'", () => {
    expect(DEFAULT_CONFIG.video_generation.mascot_media_mode).toBe("static");
  });

  it("loadConfig initializes config with default 'static' mascot_media_mode", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-media-mode-config-"));
    roots.push(root);

    const config = await loadConfig(root);
    expect(config.video_generation.mascot_media_mode).toBe("static");
  });

  it("loadConfig respects existing persisted 'animation' mascot_media_mode", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-media-mode-persisted-"));
    roots.push(root);

    const configDir = path.dirname(studioRuntimePath(root, "config.json"));
    await mkdir(configDir, { recursive: true });
    await writeFile(
      studioRuntimePath(root, "config.json"),
      JSON.stringify({
        video_generation: {
          mascot_media_mode: "animation",
        },
      }),
      "utf8",
    );

    const config = await loadConfig(root);
    expect(config.video_generation.mascot_media_mode).toBe("animation");
  });

  it("saveVideoSettings updates and persists mascot_media_mode", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-media-mode-save-"));
    roots.push(root);

    const initial = await loadConfig(root);
    expect(initial.video_generation.mascot_media_mode).toBe("static");

    const updated = await saveVideoSettings(root, {
      mascot_media_mode: "animation",
    });
    expect(updated.video_generation.mascot_media_mode).toBe("animation");

    // Verify re-reading config from disk returns the updated mode
    const reloaded = await loadConfig(root);
    expect(reloaded.video_generation.mascot_media_mode).toBe("animation");
  });

  it("handles mascot_media_mode via /api/video/settings route", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-media-mode-route-"));
    roots.push(root);

    await mkdir(path.join(root, "templates"), { recursive: true });
    await Promise.all([
      writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
      writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8"),
      writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
    ]);

    const app = await buildApp(root);
    try {
      // 1. Initial mode is static on disk
      const initial = await loadConfig(root);
      expect(initial.video_generation.mascot_media_mode).toBe("static");

      // 2. Update to animation via route
      const response = await app.server.inject({
        method: "POST",
        url: "/api/video/settings",
        payload: { mascot_media_mode: "animation" },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json<{ video_generation: { mascot_media_mode: string } }>();
      expect(json.video_generation.mascot_media_mode).toBe("animation");

      const reloaded = await loadConfig(root);
      expect(reloaded.video_generation.mascot_media_mode).toBe("animation");

      // 3. Partial update preserving existing mascot_media_mode
      const updateOther = await app.server.inject({
        method: "POST",
        url: "/api/video/settings",
        payload: { fps: 60 },
      });

      expect(updateOther.statusCode).toBe(200);
      const jsonOther = updateOther.json<{ video_generation: { mascot_media_mode: string; fps: number } }>();
      expect(jsonOther.video_generation.mascot_media_mode).toBe("animation");
      expect(jsonOther.video_generation.fps).toBe(60);

      const reloadedAfterFps = await loadConfig(root);
      expect(reloadedAfterFps.video_generation.mascot_media_mode).toBe("animation");
      expect(reloadedAfterFps.video_generation.fps).toBe(60);

      // 4. Invalid mode rejection
      const invalidResponse = await app.server.inject({
        method: "POST",
        url: "/api/video/settings",
        payload: { mascot_media_mode: "unsupported_mode" },
      });

      expect(invalidResponse.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});
