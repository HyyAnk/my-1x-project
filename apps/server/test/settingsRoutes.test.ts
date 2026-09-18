import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildApp } from "../src/app.js";

const roots: string[] = [];

async function createStudioRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-settings-routes-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
  ]);
  return root;
}

describe("settings routes integration", () => {
  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it("handles engine settings endpoints cleanly", async () => {
    const app = await buildApp(await createStudioRoot());
    try {
      const getEngineRes = await app.server.inject({ method: "GET", url: "/api/engine" });
      expect(getEngineRes.statusCode).toBe(200);
      const getEngineBody = getEngineRes.json<{
        active_engine: string;
        status: string;
        model: string;
        codex: { model: string; models: unknown[] };
        antigravity: { model: string; models: unknown[] };
      }>();
      expect(getEngineBody).toHaveProperty("active_engine");
      expect(getEngineBody).toHaveProperty("codex");
      expect(getEngineBody).toHaveProperty("antigravity");

      const postEngineRes = await app.server.inject({
        method: "POST",
        url: "/api/engine",
        payload: { active_engine: "antigravity", model: "gemini-2.5-flash" },
      });
      expect(postEngineRes.statusCode).toBe(200);
      const postEngineBody = postEngineRes.json<{ active_engine: string; model: string }>();
      expect(postEngineBody.active_engine).toBe("antigravity");
      expect(postEngineBody.model).toBe("gemini-2.5-flash");
    } finally {
      await app.close();
    }
  });

  it("handles codex and antigravity client settings endpoints cleanly", async () => {
    const app = await buildApp(await createStudioRoot());
    try {
      const [codexInfoRes, codexSettingsRes, codexModelsRes] = await Promise.all([
        app.server.inject({ method: "GET", url: "/api/codex/info" }),
        app.server.inject({ method: "GET", url: "/api/codex/settings" }),
        app.server.inject({ method: "GET", url: "/api/codex/models" }),
      ]);
      expect(codexInfoRes.statusCode).toBe(200);
      expect(codexSettingsRes.statusCode).toBe(200);
      expect(codexModelsRes.statusCode).toBe(200);

      const postCodexRes = await app.server.inject({
        method: "POST",
        url: "/api/codex/settings",
        payload: { model: "gpt-5-turbo" },
      });
      expect(postCodexRes.statusCode).toBe(200);
      expect(postCodexRes.json<{ settings: { model: string } }>().settings.model).toBe("gpt-5-turbo");

      const [antigravityInfoRes, antigravitySettingsRes, antigravityModelsRes] = await Promise.all([
        app.server.inject({ method: "GET", url: "/api/antigravity/info" }),
        app.server.inject({ method: "GET", url: "/api/antigravity/settings" }),
        app.server.inject({ method: "GET", url: "/api/antigravity/models" }),
      ]);
      expect(antigravityInfoRes.statusCode).toBe(200);
      expect(antigravitySettingsRes.statusCode).toBe(200);
      expect(antigravityModelsRes.statusCode).toBe(200);

      const postAntigravityRes = await app.server.inject({
        method: "POST",
        url: "/api/antigravity/settings",
        payload: { model: "gemini-2.5-pro" },
      });
      expect(postAntigravityRes.statusCode).toBe(200);
      expect(postAntigravityRes.json<{ settings: { model: string } }>().settings.model).toBe("gemini-2.5-pro");
    } finally {
      await app.close();
    }
  });

  it("handles audio, video, mascot stage, and history settings endpoints", async () => {
    const app = await buildApp(await createStudioRoot());
    try {
      const audioRes = await app.server.inject({
        method: "POST",
        url: "/api/audio/settings",
        payload: { provider: "edge-tts", voice: "en-US-GuyNeural" },
      });
      expect(audioRes.statusCode).toBe(200);
      expect(audioRes.json<{ audio_generation: { provider: string } }>().audio_generation.provider).toBe("edge-tts");

      const videoRes = await app.server.inject({
        method: "POST",
        url: "/api/video/settings",
        payload: { render_quality: "high", fps: 30 },
      });
      expect(videoRes.statusCode).toBe(200);
      expect(videoRes.json<{ video_generation: { render_quality: string } }>().video_generation.render_quality).toBe("high");

      const mascotStageRes = await app.server.inject({
        method: "POST",
        url: "/api/mascot-stage/settings",
        payload: { default_placement: { position: "bottom_right" } },
      });
      expect(mascotStageRes.statusCode).toBe(200);
      expect(
        mascotStageRes.json<{ mascot_stage: { default_placement: { position: string } } }>().mascot_stage.default_placement.position,
      ).toBe("bottom_right");

      const historyRes = await app.server.inject({
        method: "POST",
        url: "/api/history/settings",
        payload: { ttl_days: 60, pass_threshold: 3 },
      });
      expect(historyRes.statusCode).toBe(200);
      expect(historyRes.json<{ question_history: { ttl_days: number } }>().question_history.ttl_days).toBe(60);
    } finally {
      await app.close();
    }
  });

  it("handles image generation and fallback settings endpoints", async () => {
    const app = await buildApp(await createStudioRoot());
    try {
      const imageGetRes = await app.server.inject({ method: "GET", url: "/api/image/settings" });
      expect(imageGetRes.statusCode).toBe(200);
      expect(imageGetRes.json<{ settings: unknown; models: unknown[] }>().models.length).toBeGreaterThan(0);

      const imagePostRes = await app.server.inject({
        method: "POST",
        url: "/api/image/settings",
        payload: { provider: "gpti2", model: "gpt-image-2" },
      });
      expect(imagePostRes.statusCode).toBe(200);

      const fallbackGetRes = await app.server.inject({ method: "GET", url: "/api/image-fallback/settings" });
      expect(fallbackGetRes.statusCode).toBe(200);
      expect(fallbackGetRes.json<{ models: unknown[] }>().models.length).toBeGreaterThan(0);

      const fallbackPostRes = await app.server.inject({
        method: "POST",
        url: "/api/image-fallback/settings",
        payload: { provider: "imgstudio", model: "flux" },
      });
      expect(fallbackPostRes.statusCode).toBe(200);

      const fallbackDeleteRes = await app.server.inject({
        method: "DELETE",
        url: "/api/image-fallback/key",
      });
      expect(fallbackDeleteRes.statusCode).toBe(200);
      expect(fallbackDeleteRes.json<{ settings: { has_api_key: boolean } }>().settings.has_api_key).toBe(false);
    } finally {
      await app.close();
    }
  });
});
