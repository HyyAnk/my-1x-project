import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp, type StudioApp } from "../src/app.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

async function createApp(): Promise<StudioApp> {
  const root = await mkdtemp(path.join(os.tmpdir(), "style-presets-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# DNA\n");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n");
  return buildApp(root);
}

const input = {
  name: "Neon Set",
  palette_id: "aqua",
  theme: "candy_arcade",
  thinking_bar_style: "energy_laser",
  question_box_style: "glass_morphism",
  answer_card_style: "glass_neon",
  counter_style: "neon_badge",
  background_style: "aurora_glow",
};

describe("style preset routes", () => {
  it("supports CRUD and revisions", async () => {
    const app = await createApp();
    try {
      const created = await app.server.inject({ method: "POST", url: "/api/style-presets", payload: input });
      expect(created.statusCode).toBe(201);
      const preset = created.json<{ preset: { id: string; revision: number } }>().preset;
      expect(preset.revision).toBe(1);
      const updated = await app.server.inject({ method: "PUT", url: `/api/style-presets/${preset.id}`, payload: { name: "Renamed" } });
      expect(updated.statusCode).toBe(200);
      expect(updated.json().preset).toMatchObject({ name: "Renamed", revision: 2 });
      const duplicate = await app.server.inject({ method: "POST", url: "/api/style-presets", payload: { ...input, name: "Copy" } });
      expect(duplicate.statusCode).toBe(201);
      expect((await app.server.inject({ method: "GET", url: "/api/style-presets" })).json().presets).toHaveLength(2);
      expect((await app.server.inject({ method: "DELETE", url: `/api/style-presets/${preset.id}` })).statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("rejects empty names and unknown styles", async () => {
    const app = await createApp();
    try {
      const empty = await app.server.inject({ method: "POST", url: "/api/style-presets", payload: { ...input, name: "   " } });
      expect(empty.statusCode).toBe(400);
      const unknown = await app.server.inject({
        method: "POST",
        url: "/api/style-presets",
        payload: { ...input, name: "Bad", thinking_bar_style: "missing" },
      });
      expect(unknown.statusCode).toBe(400);
      expect(unknown.json()).toHaveProperty("error");
    } finally {
      await app.close();
    }
  });

  it("surfaces corrupt storage instead of treating it as empty", async () => {
    const app = await createApp();
    try {
      await writeFile(app.repository.resolvePath("runtime", "style-presets.json"), "not-json", "utf8");
      const response = await app.server.inject({ method: "GET", url: "/api/style-presets" });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain("invalid");
    } finally {
      await app.close();
    }
  });
});
