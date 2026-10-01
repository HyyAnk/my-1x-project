import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID,
  IMGSTUDIO_QWEN_IMAGE_3_PRO_MODEL_ID,
  type Channel,
  type Episode,
} from "@studio/shared";
import { StudioLogger } from "../src/logger.js";
import { RepositoryService } from "../src/repository.js";
import { generateThumbnailVariant } from "../src/quiz/thumbnail/thumbnailVariantGenerator.js";
import type { QuizThumbnailPlan } from "../src/quiz/thumbnail/thumbnailTypes.js";

describe("thumbnail specific provider fallback cascade", () => {
  let root: string;
  let repository: RepositoryService;
  let logger: StudioLogger;
  let channel: Channel;
  let episode: Episode;
  let mockJpegBytes: Uint8Array;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "thumb-fallback-test-"));
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");

    repository = new RepositoryService(root);
    await repository.ensureBootstrap();
    logger = new StudioLogger(root);

    channel = await repository.createChannel({
      name: "Thumbnail Test Channel",
      description: "Test channel for thumbnail fallback",
      target_audience: "Kids",
      language: "English",
      market: "US",
      dna_mode: "example",
    });

    const topic = {
      topic_id: "topic_thumb_fb",
      channel_id: channel.channel_id,
      content_kind: "episode" as const,
      title: "Thumbnail Fallback Episode",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    };
    await repository.saveTopicRun(channel.channel_id, [topic]);
    episode = await repository.confirmTopic(channel.channel_id, "topic_thumb_fb");

    mockJpegBytes = new Uint8Array(
      await sharp({
        create: { width: 1280, height: 720, channels: 4, background: { r: 80, g: 160, b: 240, alpha: 1 } },
      })
        .jpeg()
        .toBuffer(),
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  const dummyPlan: QuizThumbnailPlan = {
    layout: "split_screen",
    hookText: "CAN YOU GUESS?",
    badgeText: "NEW",
    focalSubject: "Space Explorer",
    backgroundColor: "#111122",
    compositionNotes: "Centered hero",
  };

  it("dispatches to GPTi2 as Primary for thumbnail even when active image provider is ImgStudio", async () => {
    let gpti2Called = false;
    let imgStudioCalled = false;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("gpti2.store") || urlStr.includes("direct.shopaikey.com")) {
        gpti2Called = true;
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: [{ b64_json: Buffer.from(mockJpegBytes).toString("base64") }],
              usage: { price_vnd: 50 },
            }),
        } as unknown as Response;
      }
      if (urlStr.includes("api/v1/images/generate")) {
        imgStudioCalled = true;
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: [{ url: "https://imgstudio.site/cdn/imgstudio-thumb.jpg" }],
            }),
        } as unknown as Response;
      }
      return { ok: false, status: 404, text: async () => "Not Found" } as unknown as Response;
    });

    // Simulate global image_generation configured as ImgStudio (like in image.local.json)
    const result = await generateThumbnailVariant({
      repository,
      channel,
      episode,
      ratio: "16:9",
      prompt: "Thumbnail prompt for space trivia",
      plan: dummyPlan,
      options: {
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        imageConfig: {
          provider: "imgstudio",
          model: IMGSTUDIO_QWEN_IMAGE_3_PRO_MODEL_ID,
          api_key: "img_test_key",
          gpti2_api_key: "sk_gpti2_key",
        },
        imageFallbackConfig: {
          enabled: true,
          provider: "imgstudio",
          api_key: "img_test_key",
          gpti2_api_key: "sk_gpti2_key",
        },
      },
      logger,
      nowTimestamp: Date.now(),
    });

    expect(gpti2Called).toBe(true);
    expect(imgStudioCalled).toBe(false);
    expect(result.variantFilename).toContain("thumb_16_9");
  });

  it("fails over to ImgStudio Qwen Image 3.0 Pro as Fallback 1 when GPTi2 fails", async () => {
    let gpti2Called = false;
    let fallbackModelRequested = "";

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const urlStr = String(url);
      const bodyStr = init?.body ? String(init.body) : "";

      // GPTi2 fails
      if (urlStr.includes("gpti2.store") || urlStr.includes("direct.shopaikey.com")) {
        gpti2Called = true;
        return {
          ok: false,
          status: 500,
          text: async () => JSON.stringify({ error: { message: "GPTi2 simulated error" } }),
        } as unknown as Response;
      }

      // ImgStudio Fallback
      if (urlStr.includes("api/v1/images/generate")) {
        const parsed = JSON.parse(bodyStr) as { provider_id: string };
        fallbackModelRequested = parsed.provider_id;
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: [{ url: "https://imgstudio.site/cdn/qwen-thumb.jpg" }],
              usage: { price_vnd: 150 },
            }),
        } as unknown as Response;
      }

      if (urlStr.includes("qwen-thumb.jpg")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "image/jpeg" },
          arrayBuffer: async () => mockJpegBytes.buffer,
        } as unknown as Response;
      }

      return { ok: false, status: 404, text: async () => "Not Found" } as unknown as Response;
    });

    const result = await generateThumbnailVariant({
      repository,
      channel,
      episode,
      ratio: "16:9",
      prompt: "Thumbnail prompt for animal quiz",
      plan: dummyPlan,
      options: {
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        imageConfig: {
          provider: "imgstudio",
          api_key: "img_test_key",
          gpti2_api_key: "sk_gpti2_key",
        },
        imageFallbackConfig: {
          enabled: true,
          provider: "imgstudio",
          api_key: "img_test_key",
          gpti2_api_key: "sk_gpti2_key",
        },
      },
      logger,
      nowTimestamp: Date.now(),
    });

    expect(gpti2Called).toBe(true);
    // Crucial requirement: Fallback 1 for thumbnail MUST be ImgStudio Qwen Image 3.0 Pro
    expect(fallbackModelRequested).toBe(IMGSTUDIO_QWEN_IMAGE_3_PRO_MODEL_ID);
    expect(result.variantFilename).toContain("thumb_16_9");
  });

  it("cascades to Level 3 (Gemini 3.1 Flash) if both GPTi2 and Qwen Image 3.0 Pro fail", async () => {
    const modelsRequested: string[] = [];

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const urlStr = String(url);
      const bodyStr = init?.body ? String(init.body) : "";

      // GPTi2 Primary fails
      if (urlStr.includes("gpti2.store") || urlStr.includes("direct.shopaikey.com")) {
        return {
          ok: false,
          status: 500,
          text: async () => JSON.stringify({ error: { message: "GPTi2 error" } }),
        } as unknown as Response;
      }

      // ImgStudio Fallback
      if (urlStr.includes("api/v1/images/generate")) {
        const parsed = JSON.parse(bodyStr) as { provider_id: string };
        modelsRequested.push(parsed.provider_id);

        if (parsed.provider_id === IMGSTUDIO_QWEN_IMAGE_3_PRO_MODEL_ID) {
          return {
            ok: false,
            status: 409,
            text: async () => JSON.stringify({ error: { message: "Qwen task failed" } }),
          } as unknown as Response;
        }

        if (parsed.provider_id === IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                data: [{ url: "https://imgstudio.site/cdn/gemini-thumb.jpg" }],
                usage: { price_vnd: 120 },
              }),
          } as unknown as Response;
        }
      }

      if (urlStr.includes("gemini-thumb.jpg")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "image/jpeg" },
          arrayBuffer: async () => mockJpegBytes.buffer,
        } as unknown as Response;
      }

      return { ok: false, status: 404, text: async () => "Not Found" } as unknown as Response;
    });

    const result = await generateThumbnailVariant({
      repository,
      channel,
      episode,
      ratio: "16:9",
      prompt: "Thumbnail prompt for cascading test",
      plan: dummyPlan,
      options: {
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        imageConfig: {
          provider: "imgstudio",
          api_key: "img_test_key",
          gpti2_api_key: "sk_gpti2_key",
        },
        imageFallbackConfig: {
          enabled: true,
          provider: "imgstudio",
          api_key: "img_test_key",
          gpti2_api_key: "sk_gpti2_key",
        },
      },
      logger,
      nowTimestamp: Date.now(),
    });

    expect(modelsRequested).toEqual([
      IMGSTUDIO_QWEN_IMAGE_3_PRO_MODEL_ID,
      IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID,
    ]);
    expect(result.variantFilename).toContain("thumb_16_9");
  });
});
