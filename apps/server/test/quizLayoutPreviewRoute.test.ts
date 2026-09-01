import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SandboxPreviewIncompatibilityResponseSchema, SandboxPreviewResponseSchema } from "@studio/shared";
import { buildApp } from "../src/app.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Phase 2 Sandbox layout API boundary", () => {
  it("P2-INT-04 returns structured incompatibility and renders compatible requests", async () => {
    const root = await createStudioRoot();
    const app = await buildApp(root);
    try {
      const incompatible = await app.server.inject({
        method: "POST",
        url: "/api/quiz/preview-composition",
        payload: { layout_id: "visual_choices_three", choices: ["True", "False"] },
      });
      expect(incompatible.statusCode).toBe(400);
      const incompatibilityBody = SandboxPreviewIncompatibilityResponseSchema.parse(JSON.parse(incompatible.body) as unknown);
      expect(incompatibilityBody.code).toBe("QUIZ_LAYOUT_INCOMPATIBLE");
      expect(
        incompatibilityBody.issues.some((issue) => issue.code === "layout_choice_count_unsupported" && issue.nextAction.length > 0),
      ).toBe(true);

      const compatible = await app.server.inject({
        method: "POST",
        url: "/api/quiz/preview-composition",
        payload: { layout_id: "visual_choices_three", choices: ["Alpha", "Beta", "Gamma"] },
      });
      expect(compatible.statusCode).toBe(200);
      const compatibleBody = SandboxPreviewResponseSchema.parse(JSON.parse(compatible.body) as unknown);
      expect(compatibleBody.html).toContain("layout-visual_choices_three");

      const rehearsal = await app.server.inject({
        method: "POST",
        url: "/api/quiz/preview-composition",
        payload: { mode: "rehearsal", layout_id: "media_left_choices_right" },
      });
      expect(rehearsal.statusCode).toBe(200);
      const rehearsalBody = SandboxPreviewResponseSchema.parse(JSON.parse(rehearsal.body) as unknown);
      expect(rehearsalBody.html).toContain("__hyperframesRehearsal");
      expect(rehearsalBody.html).toContain("--choices-at");
      expect(rehearsalBody.html).toContain("--reveal-at");
    } finally {
      await app.close();
    }
  });

  it("serves static SFX assets with proper headers and handles missing files", async () => {
    const root = await createStudioRoot();
    const app = await buildApp(root);
    try {
      const sfxRes = await app.server.inject({
        method: "GET",
        url: "/api/quiz/sfx/ui_pop.wav",
      });
      expect(sfxRes.statusCode).toBe(200);
      expect(sfxRes.headers["content-type"]).toBe("audio/wav");
      expect(sfxRes.headers["cache-control"]).toContain("public");

      const notFoundRes = await app.server.inject({
        method: "GET",
        url: "/api/quiz/sfx/non_existent.wav",
      });
      expect(notFoundRes.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});

async function createStudioRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-layout-preview-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
  ]);
  return root;
}
