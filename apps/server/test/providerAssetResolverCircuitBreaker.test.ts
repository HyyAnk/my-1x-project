import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import type { QuizAssetPlan } from "@studio/shared";
import {
  IMGSTUDIO_DEFAULT_MODEL_ID,
  IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
  IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID,
} from "@studio/shared";
import { StudioLogger } from "../src/logger.js";
import { RepositoryService } from "../src/repository.js";
import {
  resolveProviderAsset,
  ProviderCircuitBreaker,
  createProviderCircuitBreaker,
} from "../src/quiz/assets/resolvers/index.js";

describe("providerAssetResolver with circuit breaker short-circuit dispatch", () => {
  let root: string;
  let repository: RepositoryService;
  let logger: StudioLogger;
  let channelId: string;
  let episodeId: string;
  let mockImageBytes: Uint8Array;

  let primaryCallCount: number;
  let fallbackLevel1CallCount: number;
  let fallbackLevel2CallCount: number;
  let shouldPrimaryFail: boolean;
  let shouldLevel1Fail: boolean;
  let shouldLevel2Fail: boolean;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "resolver-cb-test-"));
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");

    repository = new RepositoryService(root);
    await repository.ensureBootstrap();
    logger = new StudioLogger(root);

    const channel = await repository.createChannel({
      name: "Circuit Breaker Test Channel",
      description: "Test channel",
      target_audience: "All",
      language: "English",
      market: "US",
      dna_mode: "example",
    });
    channelId = channel.channel_id;

    const topic = {
      topic_id: "topic_cb_test",
      channel_id: channelId,
      content_kind: "episode" as const,
      title: "Topic Circuit Breaker Test",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    };
    await repository.saveTopicRun(channelId, [topic]);
    const episode = await repository.confirmTopic(channelId, "topic_cb_test");
    episodeId = episode.episode_id;

    mockImageBytes = new Uint8Array(
      await sharp({
        create: { width: 1280, height: 720, channels: 4, background: { r: 60, g: 120, b: 180, alpha: 1 } },
      })
        .png()
        .toBuffer(),
    );

    primaryCallCount = 0;
    fallbackLevel1CallCount = 0;
    fallbackLevel2CallCount = 0;
    shouldPrimaryFail = false;
    shouldLevel1Fail = false;
    shouldLevel2Fail = false;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const urlStr = String(url);
      const bodyStr = init?.body ? String(init.body) : "";

      if (urlStr.includes("test-primary.ai")) {
        primaryCallCount++;
        if (shouldPrimaryFail) {
          return {
            ok: false,
            status: 400,
            text: async () => JSON.stringify({ error: { message: "Primary simulated 400 error" } }),
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

      if (urlStr.includes("api/v1/images/generate")) {
        const parsed = JSON.parse(bodyStr) as { provider_id: string };
        if (parsed.provider_id === IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID) {
          fallbackLevel1CallCount++;
          if (shouldLevel1Fail) {
            return {
              ok: false,
              status: 409,
              text: async () => JSON.stringify({ error: { message: "Level 1 simulated failure" } }),
            } as unknown as Response;
          }
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                data: [{ url: "https://imgstudio.site/cdn/level1-img.png" }],
                usage: { price_vnd: 120 },
              }),
          } as unknown as Response;
        }

        if (parsed.provider_id === IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID) {
          fallbackLevel2CallCount++;
          if (shouldLevel2Fail) {
            return {
              ok: false,
              status: 409,
              text: async () => JSON.stringify({ error: { message: "Level 2 simulated failure" } }),
            } as unknown as Response;
          }
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                data: [{ url: "https://imgstudio.site/cdn/level2-img.png" }],
                usage: { price_vnd: 120 },
              }),
          } as unknown as Response;
        }
      }

      if (urlStr.includes(".png")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "image/png" },
          arrayBuffer: async () => mockImageBytes.buffer,
        } as unknown as Response;
      }

      return { ok: false, status: 404, text: async () => "Not Found" } as unknown as Response;
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  function createTestRequest(assetId: string): QuizAssetPlan["assets"][number] {
    return {
      asset_id: assetId,
      question_id: "question-1",
      purpose: "hero_question_image",
      subject: `Subject for ${assetId}`,
      style: "cute_illustration",
      aspect_ratio: "16:9",
      transparent_background: false,
      required: true,
      semantic_key: `key_${assetId}`,
      consistency_group_id: null,
    };
  }

  function createTestInput(
    assetId: string,
    circuitBreaker?: ProviderCircuitBreaker,
    imageFallbackConfigOverride?: { enabled?: boolean },
  ) {
    return {
      repository,
      channelId,
      episodeId,
      request: createTestRequest(assetId),
      fingerprint: createHash("sha256").update(assetId).digest("hex"),
      compiledPrompt: `Prompt for ${assetId}`,
      configuredProvider: "custom",
      activeEngine: "codex" as const,
      logger,
      circuitBreaker,
      imageConfig: {
        provider: "custom" as const,
        base_url: "https://test-primary.ai/v1",
        api_key: "sk-primary-test",
      },
      imageFallbackConfig: {
        enabled: imageFallbackConfigOverride?.enabled ?? true,
        provider: "imgstudio" as const,
        api_key: "sk-fallback-test",
        model: IMGSTUDIO_DEFAULT_MODEL_ID,
      },
    };
  }

  it("preserves backward compatibility when circuit breaker is not provided", async () => {
    const successResult = await resolveProviderAsset(createTestInput("asset_no_cb_success"));
    expect(successResult.entry.source).toBe("provider");
    expect(primaryCallCount).toBe(1);
    expect(fallbackLevel1CallCount).toBe(0);

    shouldPrimaryFail = true;
    const fallbackResult = await resolveProviderAsset(createTestInput("asset_no_cb_fail"));
    expect(fallbackResult.entry.source).toBe("fallback");
    expect(fallbackResult.entry.fallback_tier).toBe(1);
    expect(primaryCallCount).toBe(2);
    expect(fallbackLevel1CallCount).toBe(1);

    await expect(
      resolveProviderAsset(createTestInput("asset_no_cb_no_fb", undefined, { enabled: false })),
    ).rejects.toThrow("Primary simulated 400 error");
  });

  it("short-circuits primary and dispatches directly to Level 1 when 5 distinct assets fail primary", async () => {
    const breaker = createProviderCircuitBreaker();
    shouldPrimaryFail = true;

    for (let i = 1; i <= 5; i++) {
      const res = await resolveProviderAsset(createTestInput(`asset_tripping_${i}`, breaker));
      expect(res.entry.source).toBe("fallback");
      expect(res.entry.fallback_tier).toBe(1);
    }

    expect(primaryCallCount).toBe(5);
    expect(fallbackLevel1CallCount).toBe(5);
    expect(breaker.isBypassed("primary")).toBe(true);

    const asset6Result = await resolveProviderAsset(createTestInput("asset_bypassed_6", breaker));
    expect(asset6Result.entry.source).toBe("fallback");
    expect(asset6Result.entry.fallback_tier).toBe(1);
    expect(primaryCallCount).toBe(5);
    expect(fallbackLevel1CallCount).toBe(6);
  });

  it("cascades short-circuit bypass to Level 2 when Fallback Level 1 trips", async () => {
    const breaker = createProviderCircuitBreaker();
    shouldPrimaryFail = true;
    shouldLevel1Fail = true;

    for (let i = 1; i <= 5; i++) {
      const res = await resolveProviderAsset(createTestInput(`asset_cascade_${i}`, breaker));
      expect(res.entry.source).toBe("fallback");
      expect(res.entry.fallback_tier).toBe(2);
    }

    expect(breaker.isBypassed("primary")).toBe(true);
    expect(breaker.isBypassed("fallback-level-1")).toBe(true);
    expect(breaker.isBypassed("fallback-level-2")).toBe(false);

    primaryCallCount = 0;
    fallbackLevel1CallCount = 0;
    fallbackLevel2CallCount = 0;

    const nextAssetResult = await resolveProviderAsset(createTestInput("asset_cascade_direct_l2", breaker));
    expect(nextAssetResult.entry.source).toBe("fallback");
    expect(nextAssetResult.entry.fallback_tier).toBe(2);
    expect(primaryCallCount).toBe(0);
    expect(fallbackLevel1CallCount).toBe(0);
    expect(fallbackLevel2CallCount).toBe(1);
  });

  it("resets failure count on primary success and permits primary execution to continue", async () => {
    const breaker = createProviderCircuitBreaker();
    shouldPrimaryFail = true;

    for (let i = 1; i <= 4; i++) {
      await resolveProviderAsset(createTestInput(`asset_fail_${i}`, breaker));
    }

    expect(breaker.getDiagnostics().primary.failureCount).toBe(4);
    expect(breaker.isBypassed("primary")).toBe(false);

    shouldPrimaryFail = false;
    const successResult = await resolveProviderAsset(createTestInput("asset_success_reset", breaker));
    expect(successResult.entry.source).toBe("provider");
    expect(breaker.getDiagnostics().primary.failureCount).toBe(0);
    expect(breaker.isBypassed("primary")).toBe(false);

    shouldPrimaryFail = true;
    for (let i = 1; i <= 4; i++) {
      await resolveProviderAsset(createTestInput(`asset_new_fail_${i}`, breaker));
    }

    expect(breaker.getDiagnostics().primary.failureCount).toBe(4);
    expect(breaker.isBypassed("primary")).toBe(false);

    await resolveProviderAsset(createTestInput("asset_new_fail_5", breaker));
    expect(breaker.getDiagnostics().primary.failureCount).toBe(5);
    expect(breaker.isBypassed("primary")).toBe(true);
  });

  it("throws directly when Fallback Level 2 circuit breaker is also tripped", async () => {
    const breaker = createProviderCircuitBreaker();
    shouldPrimaryFail = true;
    shouldLevel1Fail = true;
    shouldLevel2Fail = true;

    for (let i = 1; i <= 5; i++) {
      await expect(
        resolveProviderAsset(createTestInput(`asset_l2_fail_${i}`, breaker)),
      ).rejects.toThrow("Level 2 simulated failure");
    }

    expect(breaker.isBypassed("fallback-level-2")).toBe(true);

    fallbackLevel2CallCount = 0;
    await expect(
      resolveProviderAsset(createTestInput("asset_l2_bypassed", breaker)),
    ).rejects.toThrow("ImgStudio Level 2 circuit breaker tripped for asset asset_l2_bypassed");
    expect(fallbackLevel2CallCount).toBe(0);
  });
});
