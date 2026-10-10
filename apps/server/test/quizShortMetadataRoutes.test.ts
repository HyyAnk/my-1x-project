import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import type { VideoDescription, VideoTitle } from "@studio/shared";
import type { QuizShortCoverManifest } from "../src/quiz/thumbnail/quizShortCoverManifest.js";
import { createQuizShortMetadataFixture, portraitPng, type QuizShortMetadataFixture } from "./fixtures/quizShortMetadataFixture.js";

const TITLE_PROMPT_MARKER = "Write exactly ONE YouTube video title";
const DESCRIPTION_PROMPT_MARKER = "Write the description of a";

const mocks = vi.hoisted(() => ({
  executeSinglePromptText: vi.fn(),
  coverBytes: new Uint8Array(),
  coverGenerate: vi.fn(),
}));

vi.mock("../src/utils/promptSanitizer.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/utils/promptSanitizer.js")>();
  return { ...original, executeSinglePromptText: mocks.executeSinglePromptText };
});

vi.mock("../src/providers/imageGeneration/portraitImageClient.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/providers/imageGeneration/portraitImageClient.js")>();
  return {
    ...original,
    createPortraitImageClient: () => ({
      supportsReferenceImage: true,
      generate: async (request: unknown) => {
        mocks.coverGenerate(request);
        return { bytes: mocks.coverBytes, provider: "test", model: "fixture-model" };
      },
    }),
  };
});

import { buildApp } from "../src/app.js";

type MetadataResponse = { title: VideoTitle; description: VideoDescription | null; artifact_path: string };

const fixtures: QuizShortMetadataFixture[] = [];

function scriptLlmResponses(): void {
  mocks.executeSinglePromptText.mockImplementation(async (_client: unknown, prompt: string) => {
    if (prompt.includes(TITLE_PROMPT_MARKER)) {
      return JSON.stringify({ title: "Planet Sprint Quiz: Can You Beat All 5?", primary_keyword: "planet sprint quiz" });
    }
    if (prompt.includes(DESCRIPTION_PROMPT_MARKER)) {
      return JSON.stringify({
        topic_category: "Space",
        primary_keyword: "planet sprint quiz",
        keyword_variations: [],
        hook_lines: "Planet sprint quiz!\nFive fast planet questions.",
        teaser: "Do you know which planet is the largest?",
        score_cta: "Comment how many you got right!",
        hashtags: ["#planets"],
      });
    }
    return "not json";
  });
}

async function createTestApp() {
  const fixture = await createQuizShortMetadataFixture();
  fixtures.push(fixture);
  mocks.coverBytes = await portraitPng("blue");
  const app = await buildApp(fixture.root);
  return { app, fixture, baseUrl: `/api/channels/${fixture.channelId}/quiz-shorts/${fixture.quizShortId}` };
}

afterEach(async () => {
  mocks.executeSinglePromptText.mockReset();
  mocks.coverGenerate.mockReset();
  vi.restoreAllMocks();
  await Promise.all(fixtures.splice(0).map((fixture) => fixture.cleanup()));
});

describe("Quiz Short metadata routes", () => {
  it("generates, reports and serves the 9:16 cover", { timeout: 20_000 }, async () => {
    scriptLlmResponses();
    const { app, fixture, baseUrl } = await createTestApp();
    try {
      const before = await app.server.inject({ method: "GET", url: `${baseUrl}/thumbnail` });
      expect(before.json<{ manifest: QuizShortCoverManifest | null; asset_path: string | null }>()).toEqual({
        manifest: null,
        asset_path: null,
      });
      expect((await app.server.inject({ method: "GET", url: `${baseUrl}/thumbnail/file` })).statusCode).toBe(404);

      const generated = await app.server.inject({ method: "POST", url: `${baseUrl}/thumbnail/generate` });
      expect(generated.statusCode).toBe(200);
      const manifest = generated.json<{ ok: boolean; manifest: QuizShortCoverManifest }>().manifest;
      expect(manifest).toMatchObject({ width: 1080, height: 1920, badge_text: "5 QUESTIONS" });
      expect(mocks.coverGenerate).toHaveBeenCalledTimes(1);

      const after = await app.server.inject({ method: "GET", url: `${baseUrl}/thumbnail` });
      expect(after.json<{ manifest: QuizShortCoverManifest; asset_path: string }>()).toEqual({ manifest, asset_path: manifest.asset_path });
      expect((await app.repository.getQuizShort(fixture.channelId, fixture.quizShortId)).thumbnail_asset_path_9_16).toBe(
        manifest.asset_path,
      );

      const file = await app.server.inject({ method: "GET", url: `${baseUrl}/thumbnail/file` });
      expect(file.statusCode).toBe(200);
      expect(file.headers["content-type"]).toBe("image/png");
      const meta = await sharp(file.rawPayload).metadata();
      expect([meta.width, meta.height]).toEqual([1080, 1920]);
    } finally {
      await app.close();
    }
  });

  it("regenerates the cover from a chosen question with a custom hook", { timeout: 20_000 }, async () => {
    scriptLlmResponses();
    const { app, baseUrl } = await createTestApp();
    try {
      const generated = await app.server.inject({
        method: "POST",
        url: `${baseUrl}/thumbnail/generate`,
        payload: { hook_text: "which one saves the day", question_index: 1 },
      });
      expect(generated.statusCode).toBe(200);
      const manifest = generated.json<{ manifest: QuizShortCoverManifest }>().manifest;
      expect(manifest.hook_text).toBe("WHICH ONE SAVES THE DAY");
      expect(manifest.hook_source).toBe("custom");
      expect(manifest.hook_question_index).toBe(1);
      const rejected = await app.server.inject({ method: "POST", url: `${baseUrl}/thumbnail/generate`, payload: { question_index: -1 } });
      expect(rejected.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it("generates the short title and description and reads them back", { timeout: 20_000 }, async () => {
    scriptLlmResponses();
    const { app, fixture, baseUrl } = await createTestApp();
    try {
      expect((await app.server.inject({ method: "GET", url: `${baseUrl}/title` })).json<{ title: VideoTitle | null }>().title).toBeNull();
      expect(
        (await app.server.inject({ method: "GET", url: `${baseUrl}/description` })).json<{ description: null }>().description,
      ).toBeNull();

      const title = await app.server.inject({ method: "POST", url: `${baseUrl}/title/generate`, payload: { tone_hint: "Playful" } });
      expect(title.statusCode).toBe(200);
      const body = title.json<MetadataResponse>();
      expect(body.title).toMatchObject({ title: "Planet Sprint Quiz: Can You Beat All 5? #Shorts", source: "llm" });
      expect(body.title.title.length).toBeLessThanOrEqual(70);
      expect(body.description?.full_description_text).toContain("Comment how many you got right!");
      expect(body.description?.hashtags).toEqual(["#Shorts", "#quiz", "#planets"]);
      expect(body.artifact_path).toContain(`/quiz_shorts/${fixture.quizShort.slug}/quiz/video-title.json`);

      const stored = await app.server.inject({ method: "GET", url: `${baseUrl}/title` });
      expect(stored.json<{ title: VideoTitle }>().title.title).toBe(body.title.title);

      const description = await app.server.inject({
        method: "POST",
        url: `${baseUrl}/description/generate`,
        payload: { tone_hint: "Playful" },
      });
      expect(description.statusCode).toBe(200);
      const descriptionBody = description.json<{ description: VideoDescription; title: VideoTitle | null }>();
      expect(descriptionBody.description.char_count).toBeLessThanOrEqual(600);
      expect(descriptionBody.description.chapters).toEqual([]);
      expect(descriptionBody.title?.title).toBe(body.title.title);

      const read = await app.server.inject({ method: "GET", url: `${baseUrl}/description` });
      expect(read.json<{ description: VideoDescription }>().description.primary_keyword).toBe("planet sprint quiz");
    } finally {
      await app.close();
    }
  });

  it("saves manual title and description edits", { timeout: 20_000 }, async () => {
    scriptLlmResponses();
    const { app, baseUrl } = await createTestApp();
    try {
      const saved = await app.server.inject({
        method: "PUT",
        url: `${baseUrl}/title`,
        payload: { title: "Five Planet Facts #Shorts" },
      });
      expect(saved.statusCode).toBe(200);
      expect(saved.json<MetadataResponse>().title).toMatchObject({ title: "Five Planet Facts #Shorts", source: "manual" });
      expect((await app.server.inject({ method: "GET", url: `${baseUrl}/title` })).json<{ title: VideoTitle }>().title.title).toBe(
        "Five Planet Facts #Shorts",
      );

      // Manual description edits layer on top of a generated description, as in the Episode editor.
      expect((await app.server.inject({ method: "POST", url: `${baseUrl}/description/generate` })).statusCode).toBe(200);
      const description = await app.server.inject({
        method: "PUT",
        url: `${baseUrl}/description`,
        payload: {
          hook_lines: "Five planet questions.",
          hashtags: ["#Shorts", "#quiz"],
          full_description_text: "Five planet questions. Comment how many you got right! #Shorts #quiz",
        },
      });
      expect(description.statusCode).toBe(200);
      const body = description.json<{ description: VideoDescription; artifact_path: string }>();
      expect(body.description.hook_lines).toBe("Five planet questions.");
      expect(body.description.question_count).toBe(5);
      expect(body.artifact_path).toContain("/quiz_shorts/");
    } finally {
      await app.close();
    }
  });

  it("returns the repository error code for an unknown Quiz Short", { timeout: 20_000 }, async () => {
    scriptLlmResponses();
    const { app, fixture } = await createTestApp();
    try {
      const response = await app.server.inject({
        method: "GET",
        url: `/api/channels/${fixture.channelId}/quiz-shorts/qshort_missing/title`,
      });
      expect(response.statusCode).toBe(404);
      expect(response.json<{ code?: string; error?: string }>()).toMatchObject({ code: "QUIZ_SHORT_NOT_FOUND" });
    } finally {
      await app.close();
    }
  });
});
