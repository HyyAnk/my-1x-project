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
import {
  IMGSTUDIO_DEFAULT_MODEL_ID,
  IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
  IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID,
  IMGSTUDIO_FALLBACK_LEVEL_3_MODEL_ID,
  IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID,
} from "@studio/shared";

describe("image provider fallback engine", () => {
  let root: string;
  let repository: RepositoryService;
  let logger: StudioLogger;
  let channelId: string;
  let episodeId: string;
  let mockImageBytes: Uint8Array;

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

    mockImageBytes = new Uint8Array(
      await sharp({
        create: { width: 1280, height: 720, channels: 4, background: { r: 50, g: 150, b: 250, alpha: 1 } },
      })
        .png()
        .toBuffer(),
    );
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

  it("fails over to GPTi2 Level 1 fallback when primary fails and GPTi2 is configured", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("gpti2.store") || urlStr.includes("direct.shopaikey.com")) {
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
        gpti2_api_key: "sk-gpti2-test-key",
      },
    });

    expect(result).toBeDefined();
    expect(result.entry.source).toBe("fallback");
    expect(result.entry.fallback_tier).toBe(1);
    expect(result.entry.path).toBeDefined();
  });

  it("fails over to ImgStudio Level 1 (Qwen Image 3.0 Pro) when primary fails", async () => {
    let requestedModel = "";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const urlStr = String(url);
      const bodyStr = init?.body ? String(init.body) : "";

      if (urlStr.includes("api/v1/images/generate")) {
        const parsed = JSON.parse(bodyStr) as { provider_id: string };
        requestedModel = parsed.provider_id;
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
        resolution: "2K",
        quality: "standard",
      },
    });

    expect(result).toBeDefined();
    expect(result.entry.source).toBe("fallback");
    expect(result.entry.fallback_tier).toBe(1);
    expect(requestedModel).toBe(IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID);
    expect(result.entry.path).toBeDefined();
  });

  it("fails over to ImgStudio Level 2 (Gemini-3.1-Flash-Image) when Level 1 (Qwen) fails", async () => {
    const modelsCalled: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const urlStr = String(url);
      const bodyStr = init?.body ? String(init.body) : "";

      if (urlStr.includes("api/v1/images/generate")) {
        const parsed = JSON.parse(bodyStr) as { provider_id: string };
        modelsCalled.push(parsed.provider_id);

        if (parsed.provider_id === IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID) {
          return {
            ok: false,
            status: 409,
            text: async () => JSON.stringify({ error: { message: "Qwen failed" } }),
          } as unknown as Response;
        }

        if (parsed.provider_id === IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                object: "image.generation",
                data: [{ url: "https://imgstudio.site/cdn/gemini-image.png" }],
                usage: { price_vnd: 120 },
              }),
          } as unknown as Response;
        }
      }
      if (urlStr.includes("gemini-image.png")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "image/png" },
          arrayBuffer: async () => mockImageBytes.buffer,
        } as unknown as Response;
      }
      return { ok: false, status: 404, text: async () => "Not Found" } as unknown as Response;
    });

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
        resolution: "2K",
        quality: "standard",
      },
    });

    expect(result).toBeDefined();
    expect(result.entry.source).toBe("fallback");
    expect(result.entry.fallback_tier).toBe(2);
    // Level 1 (Qwen) retries once upon 409 idempotency recovery before cascading to Level 2 (Gemini)
    expect(modelsCalled).toEqual([
      IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
      IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
      IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID,
    ]);
    expect(result.entry.path).toBeDefined();
  });

  it("fails over to ImgStudio Level 3 (Krea 2 Turbo) when Level 1 (Qwen) and Level 2 (Gemini) fail", async () => {
    const modelsCalled: string[] = [];
    const idempotencyKeys: string[] = [];

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const urlStr = String(url);
      const bodyStr = init?.body ? String(init.body) : "";

      if (urlStr.includes("api/v1/images/generate")) {
        const parsedBody = JSON.parse(bodyStr) as { provider_id: string };
        modelsCalled.push(parsedBody.provider_id);
        idempotencyKeys.push(new Headers(init?.headers).get("Idempotency-Key") || "");

        if (parsedBody.provider_id === IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID) {
          return {
            ok: false,
            status: 409,
            text: async () => JSON.stringify({ error: { message: "Qwen task failed" } }),
          } as unknown as Response;
        }

        if (parsedBody.provider_id === IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID) {
          return {
            ok: false,
            status: 409,
            text: async () => JSON.stringify({ error: { message: "Gemini task failed" } }),
          } as unknown as Response;
        }

        if (parsedBody.provider_id === IMGSTUDIO_FALLBACK_LEVEL_3_MODEL_ID) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                id: "img-level-3",
                status: "completed",
                url: "/cdn/level3-recovered.png",
                cost_vnd: 250,
              }),
          } as unknown as Response;
        }
      }

      if (urlStr.includes("level3-recovered.png")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "image/png" },
          arrayBuffer: async () => mockImageBytes.buffer,
        } as unknown as Response;
      }

      return { ok: false, status: 404, text: async () => "Not Found" } as unknown as Response;
    });

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
        resolution: "2K",
        quality: "standard",
      },
    });

    expect(result).toBeDefined();
    expect(result.entry.source).toBe("fallback");
    expect(result.entry.fallback_tier).toBe(3);
    // Level 1 and Level 2 each retry once upon 409 idempotency recovery before cascading to Level 3 (Krea 2 Turbo)
    expect(modelsCalled).toEqual([
      IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
      IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
      IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID,
      IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID,
      IMGSTUDIO_FALLBACK_LEVEL_3_MODEL_ID,
    ]);
    expect(idempotencyKeys[0]).toBeTruthy();
    expect(idempotencyKeys[1]).toBeTruthy();
    expect(idempotencyKeys[2]).toBeTruthy();
    expect(idempotencyKeys[3]).toBeTruthy();
    expect(idempotencyKeys[4]).toBeTruthy();
    expect(idempotencyKeys[0]).not.toBe(idempotencyKeys[1]);
    expect(idempotencyKeys[2]).not.toBe(idempotencyKeys[3]);
    expect(result.entry.path).toBeDefined();
  });

  it("bypasses GPTi2 Level 1 when configured primary provider was already GPTi2", async () => {
    let geminiCalled = false;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const urlStr = String(url);
      const bodyStr = init?.body ? String(init.body) : "";

      // Primary GPTi2 fails
      if (urlStr.includes("gpti2.store") || urlStr.includes("direct.shopaikey.com")) {
        return {
          ok: false,
          status: 500,
          text: async () => JSON.stringify({ error: { message: "GPTi2 primary error" } }),
        } as unknown as Response;
      }

      // ImgStudio Level 2 succeeds
      if (urlStr.includes("api/v1/images/generate")) {
        const parsed = JSON.parse(bodyStr) as { provider_id: string };
        if (parsed.provider_id === IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID) {
          geminiCalled = true;
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                data: [{ url: "https://imgstudio.site/cdn/gemini-recovered.png" }],
                usage: { price_vnd: 120 },
              }),
          } as unknown as Response;
        }
      }

      if (urlStr.includes("gemini-recovered.png")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "image/png" },
          arrayBuffer: async () => mockImageBytes.buffer,
        } as unknown as Response;
      }

      return { ok: false, status: 404, text: async () => "Not Found" } as unknown as Response;
    });

    const result = await generateAssetWithProvider({
      repository,
      channelId,
      episodeId,
      request: dummyRequest,
      fingerprint: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      compiledPrompt: "A cute space cat on Mars",
      configuredProvider: "gpti2",
      activeEngine: "codex",
      imageConfig: { provider: "gpti2", api_key: "sk-primary-gpti2" },
      logger,
      imageFallbackConfig: {
        enabled: true,
        provider: "imgstudio",
        api_key: "sk-imgstudio-test-key",
        gpti2_api_key: "sk-primary-gpti2",
      },
    });

    expect(result).toBeDefined();
    expect(result.entry.source).toBe("fallback");
    expect(result.entry.fallback_tier).toBe(2);
    expect(geminiCalled).toBe(true);
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
    expect(resolution.assets[0].fallback_tier).toBe(1);
    expect(resolution.assets[1].source).toBe("fallback");
    expect(resolution.assets[1].fallback_tier).toBe(1);
    expect(issues.filter((i) => i.severity === "blocker")).toHaveLength(0);
  });

  it("recovers a partial batch where 1 asset fails on primary and falls back while another succeeds on primary", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const urlStr = String(url);
      const bodyStr = init?.body ? String(init.body) : "";

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

      if (urlStr.includes("test-primary.ai/v1/images/generations")) {
        if (bodyStr.includes("Sun")) {
          return {
            ok: false,
            status: 400,
            text: async () => JSON.stringify({ error: { message: "Safety system rejected prompt containing Sun" } }),
          } as unknown as Response;
        }
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
