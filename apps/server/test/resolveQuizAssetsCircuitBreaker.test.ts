import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import type { QuizAssetPlan } from "@studio/shared";
import {
  IMGSTUDIO_DEFAULT_MODEL_ID,
  IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID,
  IMGSTUDIO_KREA_2_TURBO_MODEL_ID,
} from "@studio/shared";
import { RepositoryService } from "../src/repository.js";
import { resolveQuizAssets } from "../src/quiz/assets/resolveQuizAssets.js";
import { createProviderCircuitBreaker } from "../src/quiz/assets/resolvers/circuitBreaker.js";

describe("resolveQuizAssets circuit breaker pipeline coordination", () => {
  let root: string;
  let repository: RepositoryService;
  let channelId: string;
  let episodeId: string;
  let mockImageBytes: Uint8Array;

  let primaryCallCount: number;
  let fallbackLevel1CallCount: number;
  let fallbackLevel2CallCount: number;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "resolve-assets-cb-test-"));
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");

    repository = new RepositoryService(root);
    await repository.ensureBootstrap();

    const channel = await repository.createChannel({
      name: "Quiz Pipeline CB Test",
      description: "Test channel",
      target_audience: "Kids",
      language: "English",
      market: "US",
      dna_mode: "example",
    });
    channelId = channel.channel_id;

    const topic = {
      topic_id: "topic_pipeline_cb_test",
      channel_id: channelId,
      content_kind: "episode" as const,
      title: "Pipeline Circuit Breaker Test",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    };
    await repository.saveTopicRun(channelId, [topic]);
    const episode = await repository.confirmTopic(channelId, "topic_pipeline_cb_test");
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
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  function createPlan(assetCount: number): QuizAssetPlan {
    return {
      schema_version: 2,
      episode_id: episodeId,
      consistency_groups: [],
      assets: Array.from({ length: assetCount }, (_, i) => ({
        asset_id: `asset_plan_${i + 1}`,
        question_id: `question-${i + 1}`,
        purpose: "hero_question_image",
        subject: `Test subject ${i + 1}`,
        style: "cute_illustration",
        aspect_ratio: "16:9",
        transparent_background: false,
        required: true,
        semantic_key: `semantic_key_${i + 1}`,
        consistency_group_id: null,
      })),
    };
  }

  function createResolutionInput(plan: QuizAssetPlan, onProgress?: (p: { completed: number; total: number; reused: boolean }) => void) {
    return {
      repository,
      channelId,
      episodeId,
      plan,
      maxRounds: 3,
      onProgress,
      imageConfig: {
        provider: "custom" as const,
        base_url: "https://test-primary.ai/v1",
        api_key: "sk-primary-test",
      },
      imageFallbackConfig: {
        enabled: true,
        provider: "imgstudio" as const,
        api_key: "sk-fallback-test",
        model: IMGSTUDIO_DEFAULT_MODEL_ID,
      },
    };
  }

  it("trips circuit breaker after 5 primary failures in a 7-asset plan and bypasses primary for remaining assets and round 2 retries", async () => {
    const plan = createPlan(7);
    let asset7Round1Failed = false;

    // Track failures to trip circuit breaker after 5 distinct assets
    const primaryFailedAssets = new Set<string>();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const urlStr = String(url);
      const bodyStr = init?.body ? String(init.body) : "";

      if (urlStr.includes("test-primary.ai")) {
        primaryCallCount++;
        const parsed = JSON.parse(bodyStr) as { prompt?: string };
        const assetMatch = /asset_plan_\d+/i.exec(parsed.prompt ?? "");
        if (assetMatch) {
          primaryFailedAssets.add(assetMatch[0]);
        }
        return {
          ok: false,
          status: 400,
          text: async () => JSON.stringify({ error: { message: "Primary simulated 400 error" } }),
        } as unknown as Response;
      }

      if (urlStr.includes("api/v1/images/generate")) {
        const parsed = JSON.parse(bodyStr) as { provider_id: string; prompt: string };
        const isAsset7 = parsed.prompt.includes("asset_plan_7");

        if (parsed.provider_id === IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID) {
          fallbackLevel1CallCount++;
          // Fail asset 7 once in Round 1 to test Round 2 retry with tripped circuit breaker
          if (isAsset7 && !asset7Round1Failed) {
            asset7Round1Failed = true;
            return {
              ok: false,
              status: 500,
              text: async () => JSON.stringify({ error: { message: "Simulated temporary 500 failure" } }),
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

        if (parsed.provider_id === IMGSTUDIO_KREA_2_TURBO_MODEL_ID) {
          fallbackLevel2CallCount++;
          // Also fail asset 7 in Level 3 during Round 1 so it advances to Round 2
          if (isAsset7 && asset7Round1Failed) {
            return {
              ok: false,
              status: 500,
              text: async () => JSON.stringify({ error: { message: "Simulated Level 3 failure in round 1" } }),
            } as unknown as Response;
          }
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                data: [{ url: "https://imgstudio.site/cdn/level3-img.png" }],
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

    // Provide a circuit breaker with threshold 5
    const circuitBreaker = createProviderCircuitBreaker({ failureThreshold: 5 });
    const input = {
      ...createResolutionInput(plan),
      circuitBreaker,
    };

    const { resolution, issues } = await resolveQuizAssets(input);

    // Primary must be called exactly 5 times (for the first 5 assets that tripped the breaker)
    expect(primaryCallCount).toBe(5);
    expect(circuitBreaker.isBypassed("primary")).toBe(true);

    // All 7 assets should be resolved via ImgStudio Fallback Level 2
    expect(resolution.assets).toHaveLength(7);
    for (const asset of resolution.assets) {
      expect(asset.source).toBe("fallback");
      expect(asset.fallback_tier).toBe(2);
    }
    expect(issues).toHaveLength(0);
  });

  it("retries failing assets in round 2 with the sequence Primary -> Fallback 1 -> Fallback 2 when circuit breaker is not tripped", async () => {
    const plan = createPlan(1);
    const callSequence: string[] = [];
    let isRound1 = true;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const urlStr = String(url);
      const bodyStr = init?.body ? String(init.body) : "";

      if (urlStr.includes("test-primary.ai")) {
        primaryCallCount++;
        const step = isRound1 ? "round1-primary" : "round2-primary";
        if (callSequence[callSequence.length - 1] !== step) {
          callSequence.push(step);
        }
        return {
          ok: false,
          status: 400,
          text: async () => JSON.stringify({ error: { message: "Primary simulated failure" } }),
        } as unknown as Response;
      }

      if (urlStr.includes("api/v1/images/generate")) {
        const parsed = JSON.parse(bodyStr) as { provider_id: string };
        if (parsed.provider_id === IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID) {
          fallbackLevel1CallCount++;
          const step = isRound1 ? "round1-level2" : "round2-level2";
          if (callSequence[callSequence.length - 1] !== step) {
            callSequence.push(step);
          }
          if (isRound1) {
            return {
              ok: false,
              status: 500,
              headers: { get: (name: string) => (name.toLowerCase() === "retry-after" ? "0" : null) },
              text: async () => JSON.stringify({ error: { message: "Level 2 temporary failure" } }),
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

        if (parsed.provider_id === IMGSTUDIO_KREA_2_TURBO_MODEL_ID) {
          fallbackLevel2CallCount++;
          const step = "round1-level3";
          if (callSequence[callSequence.length - 1] !== step) {
            callSequence.push(step);
          }
          // Round 1 ends after this failure
          isRound1 = false;
          return {
            ok: false,
            status: 500,
            headers: { get: (name: string) => (name.toLowerCase() === "retry-after" ? "0" : null) },
            text: async () => JSON.stringify({ error: { message: "Level 3 temporary failure" } }),
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

    const circuitBreaker = createProviderCircuitBreaker({ failureThreshold: 5 });
    const { resolution } = await resolveQuizAssets({
      ...createResolutionInput(plan),
      circuitBreaker,
    });

    // The single asset failed round 1 (primary, level2, level3) then retried in round 2 (primary, level2 success)
    expect(callSequence).toEqual([
      "round1-primary",
      "round1-level2",
      "round1-level3",
      "round2-primary",
      "round2-level2",
    ]);

    expect(primaryCallCount).toBe(2);
    // Fallback level 2 called twice in round 1 (initial + 1 client transient retry) and once in round 2
    expect(fallbackLevel1CallCount).toBe(3);
    // Fallback level 3 called twice in round 1 (initial + 1 client transient retry)
    expect(fallbackLevel2CallCount).toBe(2);
    expect(circuitBreaker.isBypassed("primary")).toBe(false);
    expect(resolution.assets).toHaveLength(1);
    expect(resolution.assets[0].fallback_tier).toBe(2);
  });

  it("accurately reports progress when primary is bypassed via circuit breaker", async () => {
    const plan = createPlan(6);
    const progressReports: { completed: number; total: number; reused: boolean }[] = [];

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);

      if (urlStr.includes("test-primary.ai")) {
        primaryCallCount++;
        return {
          ok: false,
          status: 400,
          text: async () => JSON.stringify({ error: { message: "Primary simulated failure" } }),
        } as unknown as Response;
      }

      if (urlStr.includes("api/v1/images/generate")) {
        fallbackLevel1CallCount++;
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

    const circuitBreaker = createProviderCircuitBreaker({ failureThreshold: 5 });
    const { resolution } = await resolveQuizAssets({
      ...createResolutionInput(plan, (progress) => {
        progressReports.push(progress);
      }),
      circuitBreaker,
    });

    expect(resolution.assets).toHaveLength(6);
    expect(progressReports.length).toBeGreaterThanOrEqual(6);
    const lastProgress = progressReports[progressReports.length - 1];
    expect(lastProgress).toEqual({ completed: 6, total: 6, reused: false });
  });

  it("uses default failure threshold of 5 and operates correctly without explicit circuitBreaker input", async () => {
    const plan = createPlan(6);

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);

      if (urlStr.includes("test-primary.ai")) {
        primaryCallCount++;
        return {
          ok: false,
          status: 400,
          text: async () => JSON.stringify({ error: { message: "Primary simulated failure" } }),
        } as unknown as Response;
      }

      if (urlStr.includes("api/v1/images/generate")) {
        fallbackLevel1CallCount++;
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

    // Call without passing any circuitBreaker - resolveQuizAssets will create default instance
    const input = createResolutionInput(plan);
    const { resolution } = await resolveQuizAssets(input);

    expect(primaryCallCount).toBe(5);
    expect(fallbackLevel1CallCount).toBe(6);
    expect(resolution.assets).toHaveLength(6);
  });
});
