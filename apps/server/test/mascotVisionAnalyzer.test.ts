import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { buildApp, type StudioApp } from "../src/app.js";
import {
  type AnalyzeMascotConceptResponse,
  AnalyzeMascotConceptResponseSchema,
  type MascotProfile,
  type UploadMascotConceptResponse,
  UploadMascotConceptResponseSchema,
} from "@studio/shared";
import {
  analyzeMascotConceptImage,
  classifyHexColor,
  normalizeHexColor,
  normalizeSuggestedStyle,
  performLocalPixelAnalysis,
} from "../src/quiz/mascot/services/mascotVisionAnalyzer.js";

type TestFn = (title: string, fn: () => Promise<void> | void) => void;
type DescribeFn = (title: string, fn: () => void) => void;
type HookFn = (fn: () => Promise<void> | void) => void;

let describe: DescribeFn;
let it: TestFn;
let afterEach: HookFn;

if (process.env.VITEST) {
  const vitest = await import("vitest");
  describe = vitest.describe as DescribeFn;
  it = vitest.it as TestFn;
  afterEach = vitest.afterEach as HookFn;
} else {
  const nodeTest = await import("node:test");
  describe = nodeTest.describe as DescribeFn;
  it = nodeTest.it as unknown as TestFn;
  afterEach = nodeTest.afterEach as unknown as HookFn;
}

const testRoots: string[] = [];

afterEach(async () => {
  await Promise.all(testRoots.splice(0).map((r) => rm(r, { recursive: true, force: true })));
});

async function createTestApp(): Promise<{ app: StudioApp; root: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "mascot-vision-test-"));
  testRoots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
  const app = await buildApp(root);
  return { app, root };
}

async function createSamplePngBuffer(r = 0, g = 210, b = 255): Promise<Buffer> {
  return await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: { r, g, b, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

describe("Mascot Vision Feature Extraction & Multimodal Profiling", () => {
  describe("Helper Functions", () => {
    it("classifies hex colors into accurate color names", () => {
      assert.equal(classifyHexColor("#00d2ff"), "cyan");
      assert.equal(classifyHexColor("#0000ff"), "blue");
      assert.equal(classifyHexColor("#ff0000"), "red");
      assert.equal(classifyHexColor("#00ff00"), "green");
      assert.equal(classifyHexColor("#ffff00"), "yellow");
      assert.equal(classifyHexColor("#ffa500"), "orange");
      assert.equal(classifyHexColor("#800080"), "purple");
      assert.equal(classifyHexColor("#ff69b4"), "pink");
      assert.equal(classifyHexColor("#050505"), "black");
      assert.equal(classifyHexColor("#fafafa"), "white");
      assert.equal(classifyHexColor("#808080"), "gray");
    });

    it("normalizes visual styles with fuzzy matching", () => {
      assert.equal(normalizeSuggestedStyle("pixar_3d"), "pixar_3d");
      assert.equal(normalizeSuggestedStyle("3d pixar animation"), "pixar_3d");
      assert.equal(normalizeSuggestedStyle("flat vector sticker"), "flat_vector");
      assert.equal(normalizeSuggestedStyle("kawaii chibi anime"), "kawaii_chibi");
      assert.equal(normalizeSuggestedStyle("photoreal cgi creature"), "natural_realism");
      assert.equal(normalizeSuggestedStyle("vinyl designer toy"), "plastic_toy");
      assert.equal(normalizeSuggestedStyle("unknown_format"), "pixar_3d");
    });

    it("normalizes 3-character and 6-character hex colors safely", () => {
      assert.equal(normalizeHexColor("#abc"), "#aabbcc");
      assert.equal(normalizeHexColor("00d2ff"), "#00d2ff");
      assert.equal(normalizeHexColor("invalid", "#123456"), "#123456");
      assert.equal(normalizeHexColor(undefined, "#06b6d4"), "#06b6d4");
    });
  });

  describe("Local Sharp Fallback Analysis", () => {
    it("performs local pixel analysis on a cyan image buffer", async () => {
      const buffer = await createSamplePngBuffer(0, 210, 255);
      const result = await performLocalPixelAnalysis(buffer);

      assert.equal(result.source, "local_fallback");
      assert.ok(result.dominant_color.startsWith("#"));
      assert.equal(classifyHexColor(result.dominant_color), "cyan");
      assert.ok(result.tags.includes("cyan"));
      assert.ok(result.tags.includes("mascot"));
      assert.ok(result.tags.includes("character"));
      assert.equal(result.suggested_visual_style, "pixar_3d");
      assert.ok(result.suggested_master_prompt.includes("character"));
      assert.ok(result.suggested_master_prompt.includes(result.dominant_color));
    });


    it("gracefully falls back to local sharp analysis when AI is disabled or unconfigured", async () => {
      const buffer = await createSamplePngBuffer(255, 60, 60);
      const result = await analyzeMascotConceptImage(buffer, {
        aiConfig: { enabled: false },
      });

      assert.equal(result.source, "local_fallback");
      assert.equal(classifyHexColor(result.dominant_color), "red");
      assert.ok(result.tags.includes("red"));
      assert.equal(result.confidence, 0.6);
    });
  });

  describe("Multimodal AI Vision Analysis", () => {
    it("extracts character profile attributes with mocked Google Gemini response", async () => {
      const originalFetch = globalThis.fetch;
      try {
        const mockAiPayload = {
          subject: "cute cyan cyborg dolphin with holographic visor",
          dominant_color: "#00d2ff",
          palette: ["#00d2ff", "#0f172a", "#38bdf8"],
          tags: ["dolphin", "cyborg", "cyan", "visor", "glossy", "futuristic"],
          suggested_visual_style: "pixar_3d",
          suggested_master_prompt:
            "Full-body single character concept illustration of a cute cyan cyborg dolphin with holographic visor. 3D Pixar animation style.",
        };

        globalThis.fetch = async () =>
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: JSON.stringify(mockAiPayload) }],
                  },
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );

        const buffer = await createSamplePngBuffer(0, 210, 255);
        const result = await analyzeMascotConceptImage(buffer, {
          aiConfig: {
            enabled: true,
            provider: "google",
            apiKey: "mock-gemini-key",
          },
        });

        assert.equal(result.source, "ai_vision");
        assert.equal(result.subject, "cute cyan cyborg dolphin with holographic visor");
        assert.equal(result.dominant_color, "#00d2ff");
        assert.deepEqual(result.palette, ["#00d2ff", "#0f172a", "#38bdf8"]);
        assert.ok(result.tags.includes("dolphin"));
        assert.ok(result.tags.includes("cyborg"));
        assert.ok(result.tags.includes("cyan"));
        assert.equal(result.suggested_visual_style, "pixar_3d");
        assert.equal(result.confidence, 0.95);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("extracts character profile attributes with mocked OpenAI-compatible response", async () => {
      const originalFetch = globalThis.fetch;
      try {
        const mockAiPayload = {
          subject: "kawaii golden robotic puppy with floppy antenna ears",
          dominant_color: "#f59e0b",
          palette: ["#f59e0b", "#1e293b", "#fef3c7"],
          tags: ["puppy", "robot", "golden", "antenna", "kawaii", "chibi"],
          suggested_visual_style: "kawaii_chibi",
          suggested_master_prompt:
            "Chibi kawaii anime mascot of a golden robotic puppy with floppy antenna ears.",
        };

        globalThis.fetch = async () =>
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: { content: JSON.stringify(mockAiPayload) },
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );

        const buffer = await createSamplePngBuffer(245, 158, 11);
        const result = await analyzeMascotConceptImage(buffer, {
          aiConfig: {
            enabled: true,
            provider: "openai",
            apiKey: "mock-openai-key",
          },
        });

        assert.equal(result.source, "ai_vision");
        assert.equal(result.subject, "kawaii golden robotic puppy with floppy antenna ears");
        assert.equal(result.dominant_color, "#f59e0b");
        assert.ok(result.tags.includes("puppy"));
        assert.ok(result.tags.includes("kawaii"));
        assert.equal(result.suggested_visual_style, "kawaii_chibi");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("recovers gracefully when AI API call fails with network error", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () => {
          throw new Error("Network timeout or connection refused");
        };

        const buffer = await createSamplePngBuffer(0, 210, 255);
        const result = await analyzeMascotConceptImage(buffer, {
          aiConfig: {
            enabled: true,
            provider: "google",
            apiKey: "mock-gemini-key",
          },
        });

        assert.equal(result.source, "local_fallback");
        assert.ok(result.dominant_color.startsWith("#"));
        assert.ok(result.tags.length > 0);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("recovers gracefully when AI returns HTTP 500 server error", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () =>
          new Response("Internal AI Service Error", { status: 500 });

        const buffer = await createSamplePngBuffer(0, 210, 255);
        const result = await analyzeMascotConceptImage(buffer, {
          aiConfig: {
            enabled: true,
            provider: "google",
            apiKey: "mock-gemini-key",
          },
        });

        assert.equal(result.source, "local_fallback");
        assert.ok(result.tags.length > 0);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("recovers gracefully when AI returns non-JSON malformed text", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () =>
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: "I cannot produce JSON for this image: invalid request format." }],
                  },
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );

        const buffer = await createSamplePngBuffer(0, 210, 255);
        const result = await analyzeMascotConceptImage(buffer, {
          aiConfig: {
            enabled: true,
            provider: "google",
            apiKey: "mock-gemini-key",
          },
        });

        assert.equal(result.source, "local_fallback");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("API Endpoint Integration", () => {
    it("populates extracted_color and extracted_tags in POST /api/mascots/upload-concept", async () => {
      const { app } = await createTestApp();
      try {
        const buffer = await createSamplePngBuffer(0, 210, 255);
        const uploadRes = await app.server.inject({
          method: "POST",
          url: "/api/mascots/upload-concept",
          payload: {
            image_data: `data:image/png;base64,${buffer.toString("base64")}`,
            name: "Aqua Bot",
            auto_matting: false,
          },
        });

        assert.equal(uploadRes.statusCode, 201);
        const data = uploadRes.json<UploadMascotConceptResponse>();
        const parsed = UploadMascotConceptResponseSchema.parse(data);

        assert.ok(parsed.extracted_color);
        assert.ok(parsed.extracted_tags && parsed.extracted_tags.length > 0);
        assert.ok(parsed.extracted_tags?.includes("cyan"));
      } finally {
        await app.close();
      }
    });

    it("supports on-demand analysis via POST /api/mascots/:mascotId/analyze-concept", async () => {
      const { app } = await createTestApp();
      try {
        // 1. Create a mascot
        const createRes = await app.server.inject({
          method: "POST",
          url: "/api/mascots",
          payload: {
            name: "Sparky Dragon",
            visual_style: "flat_vector",
            color_theme: "#ef4444",
          },
        });
        assert.equal(createRes.statusCode, 201);
        const mascot = createRes.json<{ mascot: MascotProfile }>().mascot;

        // 2. Upload master concept
        const buffer = await createSamplePngBuffer(240, 50, 50);
        const uploadRes = await app.server.inject({
          method: "POST",
          url: `/api/mascots/${mascot.id}/upload-concept`,
          payload: {
            image_data: buffer.toString("base64"),
            auto_matting: false,
          },
        });
        assert.equal(uploadRes.statusCode, 200);

        // 3. Call on-demand analysis endpoint
        const analyzeRes = await app.server.inject({
          method: "POST",
          url: `/api/mascots/${mascot.id}/analyze-concept`,
          payload: {
            save: true,
          },
        });

        assert.equal(analyzeRes.statusCode, 200);
        const analyzeData = analyzeRes.json<AnalyzeMascotConceptResponse>();
        const parsed = AnalyzeMascotConceptResponseSchema.parse(analyzeData);

        assert.equal(parsed.mascot_id, mascot.id);
        assert.ok(parsed.analysis);
        assert.ok(parsed.extracted_color);
        assert.ok(parsed.extracted_tags.length > 0);
        assert.equal(classifyHexColor(parsed.extracted_color), "red");

        // 4. Verify persisted changes on mascot profile
        const updated = await app.repository.getMascot(mascot.id);
        assert.ok(updated.color_theme);
        assert.ok(updated.master_prompt);
      } finally {
        await app.close();
      }
    });

    it("returns 404 when analyzing a non-existent mascot", async () => {
      const { app } = await createTestApp();
      try {
        const analyzeRes = await app.server.inject({
          method: "POST",
          url: "/api/mascots/mascot-nonexistent/analyze-concept",
          payload: {},
        });
        assert.equal(analyzeRes.statusCode, 404);
      } finally {
        await app.close();
      }
    });

    it("returns 400 when analyzing a mascot without any master concept image", async () => {
      const { app } = await createTestApp();
      try {
        const createRes = await app.server.inject({
          method: "POST",
          url: "/api/mascots",
          payload: {
            name: "Ghost Mascot",
          },
        });
        assert.equal(createRes.statusCode, 201);
        const mascot = createRes.json<{ mascot: MascotProfile }>().mascot;

        const analyzeRes = await app.server.inject({
          method: "POST",
          url: `/api/mascots/${mascot.id}/analyze-concept`,
          payload: {},
        });
        assert.equal(analyzeRes.statusCode, 400);
        const body = analyzeRes.json<{ error?: string; message?: string }>();
        assert.match(body.error || body.message || "", /no master concept image/i);
      } finally {
        await app.close();
      }

    });
  });
});
