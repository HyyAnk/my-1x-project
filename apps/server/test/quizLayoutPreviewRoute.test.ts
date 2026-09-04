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

      // Test Comic Action Boom preset payload across all 6 layouts
      const layoutTests = [
        { layout_id: "media_left_choices_right", choices: ["Option A", "Option B", "Option C"] },
        { layout_id: "media_left_choices_right", choices: ["Option A", "Option B"] },
        { layout_id: "verdict_true_false", choices: ["True", "False"], question_format: "true_false" },
        { layout_id: "split_versus_two", choices: ["Cheetah", "Falcon"], question_format: "multiple_choice" },
        { layout_id: "visual_choices_three", choices: ["A", "B", "C"] },
        { layout_id: "visual_choices_three_pure", choices: ["A", "B", "C"], question_format: "odd_one_out" },
        { layout_id: "full_stack_list", choices: ["A", "B", "C"] },
      ];

      for (const lt of layoutTests) {
        const comicBoomRes = await app.server.inject({
          method: "POST",
          url: "/api/quiz/preview-composition",
          payload: {
            aspect_ratio: "16:9",
            mode: "rehearsal",
            theme: "candy_arcade",
            palette_id: "sunny",
            layout_id: lt.layout_id,
            thinking_bar_style: "flame_fuse",
            question_box_style: "comic_bubble",
            answer_card_style: "comic_chunky",
            counter_style: "floating_balloon",
            background_style: "candy_rays",
            choices: lt.choices,
            question_format: lt.question_format,
            question_text: "Sample Question?",
          },
        });
        if (comicBoomRes.statusCode !== 200) {
          console.error("Comic Boom failed for", lt.layout_id, comicBoomRes.statusCode, comicBoomRes.body);
        }
        expect(comicBoomRes.statusCode).toBe(200);
      }
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
