import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp, type StudioApp } from "../src/app.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

async function createApp(): Promise<StudioApp> {
  const root = await mkdtemp(path.join(os.tmpdir(), "motion-routes-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# DNA\n");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n");
  return buildApp(root);
}

describe("Motion Routes (/api/motion & channel presets)", () => {
  it("GET /api/motion/templates returns registered templates and filters by placement", async () => {
    const app = await createApp();
    try {
      const allRes = await app.server.inject({ method: "GET", url: "/api/motion/templates" });
      expect(allRes.statusCode).toBe(200);
      const allData = allRes.json<{ templates: Array<{ id: string; placement: string }> }>();
      expect(allData.templates.length).toBeGreaterThanOrEqual(5);

      const introRes = await app.server.inject({ method: "GET", url: "/api/motion/templates?placement=intro" });
      expect(introRes.statusCode).toBe(200);
      const introData = introRes.json<{ templates: Array<{ id: string; placement: string }> }>();
      expect(introData.templates.some((t) => t.id === "kinetic_punch")).toBe(true);
      expect(introData.templates.some((t) => t.id === "interactive_cta")).toBe(false);

      const outroRes = await app.server.inject({ method: "GET", url: "/api/motion/templates?placement=outro" });
      expect(outroRes.statusCode).toBe(200);
      const outroData = outroRes.json<{ templates: Array<{ id: string; placement: string }> }>();
      expect(outroData.templates.some((t) => t.id === "interactive_cta")).toBe(true);
      expect(outroData.templates.some((t) => t.id === "kinetic_punch")).toBe(false);
    } finally {
      await app.close();
    }
  });

  it("POST /api/motion/prompt-generate produces valid configuration and handles errors", async () => {
    const app = await createApp();
    try {
      const validRes = await app.server.inject({
        method: "POST",
        url: "/api/motion/prompt-generate",
        payload: {
          topicTitle: "Cyber Matrix AI Revolution",
          channelName: "Future Quiz",
          placement: "intro",
        },
      });
      expect(validRes.statusCode).toBe(200);
      const data = validRes.json<{
        recommendedTemplateId: string;
        mood: string;
        generatedOptions: { accentColor: string; headlineText: string };
        llmPromptRecipe: string;
      }>();
      expect(data.recommendedTemplateId).toBe("cyber_neon");
      expect(data.mood).toBe("cyberpunk");
      expect(data.generatedOptions.accentColor).toBe("#00FFFF");
      expect(data.llmPromptRecipe).toContain("SYSTEM DIRECTIVE");

      const invalidRes = await app.server.inject({
        method: "POST",
        url: "/api/motion/prompt-generate",
        payload: { topicTitle: "" },
      });
      expect(invalidRes.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it("POST /api/motion/preview-markup generates standalone HTML and handles 404 for unknown templates", async () => {
    const app = await createApp();
    try {
      const previewRes = await app.server.inject({
        method: "POST",
        url: "/api/motion/preview-markup",
        payload: {
          templateId: "kinetic_punch",
          topicTitle: "World Flags",
          channelName: "FlagMaster",
          aspectRatio: "16:9",
          durationSeconds: 2.5,
          options: {
            accentColor: "#FF007F",
            headlineText: "FLAG CHALLENGE",
          },
        },
      });
      expect(previewRes.statusCode).toBe(200);
      const previewData = previewRes.json<{
        html: string;
        templateId: string;
        durationSeconds: number;
        aspectRatio: string;
      }>();
      expect(previewData.templateId).toBe("kinetic_punch");
      expect(previewData.html).toContain("<!doctype html>");
      expect(previewData.html).toContain("motion-intro-kinetic-punch");
      expect(previewData.html).toContain("FLAG CHALLENGE");

      const notFoundRes = await app.server.inject({
        method: "POST",
        url: "/api/motion/preview-markup",
        payload: { templateId: "unknown_xyz_template" },
      });
      expect(notFoundRes.statusCode).toBe(400); // Fails schema enum check
    } finally {
      await app.close();
    }
  });

  it("manages channel motion presets (CRUD)", async () => {
    const app = await createApp();
    try {
      const channelId = "channel_motion_test_1";

      // 1. Initial list is empty
      const listRes1 = await app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/motion-presets`,
      });
      expect(listRes1.statusCode).toBe(200);
      expect(listRes1.json<{ presets: unknown[] }>().presets).toHaveLength(0);

      // 2. Save a new preset
      const saveRes = await app.server.inject({
        method: "PUT",
        url: `/api/channels/${channelId}/motion-presets`,
        payload: {
          name: "Signature Cyber Opening",
          placement: "intro",
          templateId: "cyber_neon",
          options: {
            accentColor: "#00FFFF",
            headlineText: "WELCOME TO THE MATRIX",
          },
        },
      });
      expect(saveRes.statusCode).toBe(200);
      const savedPreset = saveRes.json<{ success: boolean; preset: { id: string; name: string } }>().preset;
      expect(savedPreset.id).toBeDefined();
      expect(savedPreset.name).toBe("Signature Cyber Opening");

      // 3. List contains the preset
      const listRes2 = await app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/motion-presets`,
      });
      expect(listRes2.statusCode).toBe(200);
      expect(listRes2.json<{ presets: unknown[] }>().presets).toHaveLength(1);

      // 4. Update the preset
      const updateRes = await app.server.inject({
        method: "PUT",
        url: `/api/channels/${channelId}/motion-presets`,
        payload: {
          id: savedPreset.id,
          name: "Updated Cyber Opening",
          placement: "intro",
          templateId: "cyber_neon",
          options: {
            accentColor: "#FF007F",
            headlineText: "WELCOME BACK",
          },
        },
      });
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.json<{ preset: { name: string } }>().preset.name).toBe("Updated Cyber Opening");

      // 5. Delete the preset
      const deleteRes = await app.server.inject({
        method: "DELETE",
        url: `/api/channels/${channelId}/motion-presets/${savedPreset.id}`,
      });
      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.json<{ success: boolean }>().success).toBe(true);

      // 6. List is empty again
      const listRes3 = await app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/motion-presets`,
      });
      expect(listRes3.json<{ presets: unknown[] }>().presets).toHaveLength(0);
    } finally {
      await app.close();
    }
  });
});
