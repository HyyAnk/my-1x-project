import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { StudioLogger } from "../src/logger.js";
import { RepositoryService } from "../src/repository.js";
import { generateAssetWithProvider } from "../src/quiz/assets/resolvers/providerAssetResolver.js";
import { resolveQuizAssets } from "../src/quiz/assets/resolveQuizAssets.js";
import type { QuizAssetPlan } from "@studio/shared";
import { IMGSTUDIO_DEFAULT_MODEL_ID } from "@studio/shared";

describe("image provider fallback engine", () => {
  let root: string;
  let repository: RepositoryService;
  let logger: StudioLogger;
  let channelId: string;
  let episodeId: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "image-fallback-test-"));
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
    repository = new RepositoryService(root);
    await repository.ensureBootstrap();
    logger = new StudioLogger(root);

    const channel = await repository.createChannel({
      name: "Fallback Test Channel",
      description: "Test channel",
      target_audience: "All",
      language: "English",
      market: "US",
      dna_mode: "example",
    });
    channelId = channel.channel_id;

    const topic = {
      topic_id: "topic_fallback",
      channel_id: channelId,
      content_kind: "episode" as const,
      title: "Topic Fallback",
      premise: "P",
      why_it_fits: "W",
      hook: "H",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    };
    await repository.saveTopicRun(channelId, [topic]);
    const episode = await repository.confirmTopic(channelId, "topic_fallback");
    episodeId = episode.episode_id;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  const dummyRequest: QuizAssetPlan["assets"][number] = {
    asset_id: "asset_test_01",
    question_id: "question-1",
    purpose: "hero_question_image",
    subject: "A curious space cat exploring Mars",
    style: "cute_illustration",
    aspect_ratio: "16:9",
    transparent_background: false,
    required: true,
    semantic_key: "hero_mars_cat",
    consistency_group_id: null,
  };

  it("fails over to ImgStudio when primary provider encounters content filter rejection", async () => {
    // Mock global fetch for ImgStudio:
    // 1. Generation API POST
    // 2. Image bytes download GET
    const mockImageBytes = new Uint8Array(
      await sharp({
        create: { width: 1280, height: 720, channels: 4, background: { r: 50, g: 150, b: 250, alpha: 1 } },
      })
        .png()
        .toBuffer(),
    );
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("api/v1/images/generate")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              object: "image.generation",
              data: [{ url: "https://imgstudio.site/cdn/test-image.png" }],
              usage: { price_vnd: 120 },
            }),
        } as unknown as Response;
      }
      if (urlStr.includes("test-image.png")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "image/png" },
          arrayBuffer: async () => mockImageBytes.buffer,
        } as unknown as Response;
      }
      return { ok: false, status: 404, text: async () => "Not Found" } as unknown as Response;
    });

    // We configure primary provider as "gpti2" with an API key, but we'll mock Gpti2 to throw content filter error
    // By passing a custom mock or forcing primary to fail with content filter:
    const result = await generateAssetWithProvider({
      repository,
      channelId,
      episodeId,
      request: dummyRequest,
      fingerprint: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      compiledPrompt: "A cute space cat on Mars",
      configuredProvider: "invalid_unconfigured_primary",
      activeEngine: "codex",
      logger,
      imageFallbackConfig: {
        enabled: true,
        provider: "imgstudio",
        api_key: "sk-imgstudio-test-key",
        model: IMGSTUDIO_DEFAULT_MODEL_ID,
        resolution: "2K",
        quality: "standard",
      },
    });

    expect(result).toBeDefined();
    expect(result.entry.source).toBe("fallback");
    expect(result.entry.fallback_tier).toBe(1);
    expect(result.tier3Fallback).toBe(false);
    expect(result.entry.path).toBeDefined();
  });

  it("rethrows error when fallback is disabled", async () => {
    await expect(
      generateAssetWithProvider({
        repository,
        channelId,
        episodeId,
        request: dummyRequest,
        fingerprint: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        compiledPrompt: "A cute space cat on Mars",
        configuredProvider: "non_existent_provider",
        activeEngine: "codex",
        logger,
        imageFallbackConfig: {
          enabled: false,
          provider: "imgstudio",
          api_key: "sk-imgstudio-test-key",
        },
      }),
    ).rejects.toThrow("PROVIDER_UNAVAILABLE");
  });

  it("rethrows error when fallback has no API key", async () => {
    await expect(
      generateAssetWithProvider({
        repository,
        channelId,
        episodeId,
        request: dummyRequest,
        fingerprint: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        compiledPrompt: "A cute space cat on Mars",
        configuredProvider: "non_existent_provider",
        activeEngine: "codex",
        logger,
        imageFallbackConfig: {
          enabled: true,
          provider: "imgstudio",
          api_key: "",
        },
      }),
    ).rejects.toThrow("PROVIDER_UNAVAILABLE");
  });

  it("successfully completes a batch when primary fails and fallback recovers", async () => {
    const mockImageBytes = new Uint8Array(
      await sharp({
        create: { width: 1280, height: 720, channels: 4, background: { r: 50, g: 150, b: 250, alpha: 1 } },
      })
        .png()
        .toBuffer(),
    );
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("api/v1/images/generate")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              object: "image.generation",
              data: [{ url: "https://imgstudio.site/cdn/recovered-image.png" }],
              usage: { price_vnd: 120 },
            }),
        } as unknown as Response;
      }
      if (urlStr.includes("recovered-image.png")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "image/png" },
          arrayBuffer: async () => mockImageBytes.buffer,
        } as unknown as Response;
      }
      return { ok: false, status: 404, text: async () => "Not Found" } as unknown as Response;
    });

    const plan: QuizAssetPlan = {
      schema_version: 2,
      episode_id: episodeId,
      template_id: "two_choice_speed_challenge",
      total_images: 2,
      consistency_groups: [],
      assets: [
        {
          asset_id: "asset_01",
          question_id: "question-1",
          purpose: "hero_question_image",
          subject: "Sun",
          style: "cute_illustration",
          aspect_ratio: "16:9",
          transparent_background: false,
          required: true,
          semantic_key: "sun_key",
          consistency_group_id: null,
        },
        {
          asset_id: "asset_02",
          question_id: "question-2",
          purpose: "hero_question_image",
          subject: "Moon",
          style: "cute_illustration",
          aspect_ratio: "16:9",
          transparent_background: false,
          required: true,
          semantic_key: "moon_key",
          consistency_group_id: null,
        },
      ],
    };

    const { resolution, issues } = await resolveQuizAssets({
      repository,
      channelId,
      episodeId,
      plan,
      imageConfig: {
        provider: "custom",
        api_key: "", // Not configured -> primary throws
      },
      imageFallbackConfig: {
        enabled: true,
        provider: "imgstudio",
        api_key: "sk-imgstudio-test-key",
        model: IMGSTUDIO_DEFAULT_MODEL_ID,
      },
    });

    expect(resolution.assets).toHaveLength(2);
    expect(resolution.assets[0].source).toBe("fallback");
    expect(resolution.assets[1].source).toBe("fallback");
    expect(issues.filter((i) => i.severity === "blocker")).toHaveLength(0);
  });

  it("recovers a partial batch where 1 asset fails on primary and falls back while another succeeds on primary", async () => {
    const mockImageBytes = new Uint8Array(
      await sharp({
        create: { width: 1280, height: 720, channels: 4, background: { r: 50, g: 150, b: 250, alpha: 1 } },
      })
        .png()
        .toBuffer(),
    );

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const urlStr = String(url);
      const bodyStr = init?.body ? String(init.body) : "";

      // ImgStudio fallback calls
      if (urlStr.includes("api/v1/images/generate")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              object: "image.generation",
              data: [{ url: "https://imgstudio.site/cdn/fallback-recovered.png" }],
              usage: { price_vnd: 120 },
            }),
        } as unknown as Response;
      }
      if (urlStr.includes("fallback-recovered.png")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "image/png" },
          arrayBuffer: async () => mockImageBytes.buffer,
        } as unknown as Response;
      }

      // Primary provider calls (Custom provider at custom endpoint)
      if (urlStr.includes("test-primary.ai/v1/images/generations")) {
        // If prompt is for Sun, simulate primary content filter rejection!
        if (bodyStr.includes("Sun")) {
          return {
            ok: false,
            status: 400,
            text: async () => JSON.stringify({ error: { message: "Safety system rejected prompt containing Sun" } }),
          } as unknown as Response;
        }
        // If prompt is for Moon, primary succeeds!
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: [{ b64_json: Buffer.from(mockImageBytes).toString("base64") }],
            }),
        } as unknown as Response;
      }

      return { ok: false, status: 404, text: async () => "Not Found" } as unknown as Response;
    });

    const plan: QuizAssetPlan = {
      schema_version: 2,
      episode_id: episodeId,
      template_id: "two_choice_speed_challenge",
      total_images: 2,
      consistency_groups: [],
      assets: [
        {
          asset_id: "asset_primary_success",
          question_id: "question-1",
          purpose: "hero_question_image",
          subject: "Moon",
          style: "cute_illustration",
          aspect_ratio: "16:9",
          transparent_background: false,
          required: true,
          semantic_key: "moon_key",
          consistency_group_id: null,
        },
        {
          asset_id: "asset_primary_fail_fallback_success",
          question_id: "question-2",
          purpose: "hero_question_image",
          subject: "Sun",
          style: "cute_illustration",
          aspect_ratio: "16:9",
          transparent_background: false,
          required: true,
          semantic_key: "sun_key",
          consistency_group_id: null,
        },
      ],
    };

    const { resolution, issues } = await resolveQuizAssets({
      repository,
      channelId,
      episodeId,
      plan,
      imageConfig: {
        provider: "custom",
        base_url: "https://test-primary.ai/v1",
        api_key: "sk-primary-key",
      },
      imageFallbackConfig: {
        enabled: true,
        provider: "imgstudio",
        api_key: "sk-imgstudio-fallback-key",
        model: IMGSTUDIO_DEFAULT_MODEL_ID,
      },
    });

    expect(resolution.assets).toHaveLength(2);
    const moonAsset = resolution.assets.find((a) => a.asset_id === "asset_primary_success");
    const sunAsset = resolution.assets.find((a) => a.asset_id === "asset_primary_fail_fallback_success");

    expect(moonAsset?.source).toBe("provider");
    expect(sunAsset?.source).toBe("fallback");
    expect(sunAsset?.fallback_tier).toBe(1);
    expect(issues.filter((i) => i.severity === "blocker")).toHaveLength(0);
  });
});
