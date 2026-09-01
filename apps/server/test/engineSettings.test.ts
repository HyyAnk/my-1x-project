import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildApp } from "../src/app.js";
import { loadConfig, saveAntigravitySettings, saveCodexSettings } from "../src/config.js";

const roots: string[] = [];

async function createStudioRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-engine-settings-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
  ]);
  return root;
}

describe("engine settings", () => {
  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it("does not expose retired engine maintenance controls", async () => {
    const app = await buildApp(await createStudioRoot());
    try {
      const [codexSettings, antigravitySettings, codexMaintenance, antigravityMaintenance] = await Promise.all([
        app.server.inject({ method: "GET", url: "/api/codex/settings" }),
        app.server.inject({ method: "GET", url: "/api/antigravity/settings" }),
        app.server.inject({ method: "POST", url: "/api/codex/cleanup", payload: {} }),
        app.server.inject({ method: "POST", url: "/api/antigravity/cleanup", payload: {} }),
      ]);

      expect(codexSettings.statusCode).toBe(200);
      expect(antigravitySettings.statusCode).toBe(200);
      const codexBody = codexSettings.json<{ settings: Record<string, unknown> }>();
      const antigravityBody = antigravitySettings.json<{ settings: Record<string, unknown> }>();
      expect(codexBody.settings).not.toHaveProperty("auto_delete_threads");
      expect(codexBody.settings).not.toHaveProperty("failed_thread_retention_days");
      expect(antigravityBody.settings).not.toHaveProperty("auto_delete_threads");
      expect(antigravityBody.settings).not.toHaveProperty("failed_thread_retention_days");
      expect(codexMaintenance.statusCode).toBe(404);
      expect(antigravityMaintenance.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });

  it("drops retired keys from local engine settings on the next save", async () => {
    const root = await createStudioRoot();
    const settingsDirectory = path.join(root, ".quiz-studio");
    const codexPath = path.join(settingsDirectory, "codex.local.json");
    const antigravityPath = path.join(settingsDirectory, "antigravity.local.json");
    await mkdir(settingsDirectory, { recursive: true });
    await Promise.all([
      writeFile(
        codexPath,
        JSON.stringify({ codex: { model: "legacy-codex", auto_delete_threads: true, failed_thread_retention_days: 30 } }),
        "utf8",
      ),
      writeFile(
        antigravityPath,
        JSON.stringify({ antigravity: { model: "legacy-agy", auto_delete_threads: true, failed_thread_retention_days: 30 } }),
        "utf8",
      ),
    ]);

    const loaded = await loadConfig(root);
    expect(loaded.codex).not.toHaveProperty("auto_delete_threads");
    expect(loaded.antigravity).not.toHaveProperty("auto_delete_threads");

    await Promise.all([saveCodexSettings(root, { model: "current-codex" }), saveAntigravitySettings(root, { model: "current-agy" })]);
    const codexLocal = JSON.parse(await readFile(codexPath, "utf8")) as { codex: Record<string, unknown> };
    const antigravityLocal = JSON.parse(await readFile(antigravityPath, "utf8")) as { antigravity: Record<string, unknown> };
    expect(codexLocal.codex).toEqual({ model: "current-codex" });
    expect(antigravityLocal.antigravity).toEqual({ model: "current-agy" });
  });
});
