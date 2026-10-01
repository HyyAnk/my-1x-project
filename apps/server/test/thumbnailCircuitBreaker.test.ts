import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  IMGSTUDIO_DEFAULT_MODEL_ID,
  IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
  type Channel,
  type Episode,
} from "@studio/shared";
import { StudioLogger } from "../src/logger.js";
import { RepositoryService } from "../src/repository.js";
import { generateThumbnailVariant } from "../src/quiz/thumbnail/thumbnailVariantGenerator.js";
import { createProviderCircuitBreaker } from "../src/quiz/assets/resolvers/circuitBreaker.js";
import type { QuizThumbnailPlan } from "../src/quiz/thumbnail/thumbnailTypes.js";

describe("thumbnailVariantGenerator circuit breaker integration", () => {
  let root: string;
  let repository: RepositoryService;
  let logger: StudioLogger;
  let channel: Channel;
  let episode: Episode;
  let mockImageBytes: Uint8Array;
  let primaryCallCount: number;
  let fallbackCallCount: number;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "thumb-cb-test-"));
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");

    repository = new RepositoryService(root);
    await repository.ensureBootstrap();
    logger = new StudioLogger(root);

    channel = await repository.createChannel({
      name: "Thumb CB Channel",
      description: "Channel for thumbnail CB tests",
      target_audience: "Kids",
      language: "English",
      market: "US",
      dna_mode: "example",
    });

    const topic = {
      topic_id: "topic_thumb_cb",
      channel_id: channel.channel_id,
      content_kind: "episode" as const,
      title: "Thumb CB Episode",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    };
    await repository.saveTopicRun(channel.channel_id, [topic]);
    episode = await repository.confirmTopic(channel.channel_id, "topic_thumb_cb");

    mockImageBytes = new Uint8Array(
      await sharp({
        create: { width: 1280, height: 720, channels: 4, background: { r: 50, g: 150, b: 200, alpha: 1 } },
      })
        .jpeg()
        .toBuffer(),
    );

    primaryCallCount = 0;
    fallbackCallCount = 0;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const urlStr = String(url);
      const bodyStr = init?.body ? String(init.body) : "";

      if (urlStr.includes("test-primary.ai")) {
        primaryCallCount++;
        return {
          ok: false,
          status: 400,
          text: async () => JSON.stringify({ error: { message: "Primary simulated failure" } }),
        } as unknown as Response;
      }

      if (urlStr.includes("api/v1/images/generate")) {
        const parsed = JSON.parse(bodyStr) as { provider_id: string };
        if (
          parsed.provider_id === IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID ||
          parsed.provider_id === IMGSTUDIO_DEFAULT_MODEL_ID
        ) {
          fallbackCallCount++;
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                data: [{ url: "https://imgstudio.site/cdn/fallback-thumb.jpg" }],
                usage: { price_vnd: 120 },
              }),
          } as unknown as Response;
        }
      }

      if (urlStr.includes(".jpg")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "image/jpeg" },
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

  const dummyPlan: QuizThumbnailPlan = {
    layout: "split_screen",
    hookText: "CAN YOU GUESS?",
    badgeText: "NEW",
    focalSubject: "Space Shuttle",
    backgroundColor: "#000000",
    compositionNotes: "Centered",
  };

  it("bypasses primary provider when circuit breaker is already tripped", async () => {
    const circuitBreaker = createProviderCircuitBreaker({ failureThreshold: 5 });
    for (let i = 1; i <= 5; i++) {
      circuitBreaker.recordFailure("primary", `failed_asset_${i}`);
    }
    expect(circuitBreaker.isBypassed("primary")).toBe(true);

    const result = await generateThumbnailVariant({
      repository,
      channel,
      episode,
      ratio: "16:9",
      prompt: "Thumbnail prompt for space quiz",
      plan: dummyPlan,
      options: {
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        circuitBreaker,
        imageConfig: {
          provider: "custom",
          base_url: "https://test-primary.ai/v1",
          api_key: "sk-primary-test",
        },
        imageFallbackConfig: {
          enabled: true,
          provider: "imgstudio",
          api_key: "sk-fallback-test",
          model: IMGSTUDIO_DEFAULT_MODEL_ID,
        },
      },
      logger,
      nowTimestamp: Date.now(),
    });

    expect(primaryCallCount).toBe(0);
    expect(fallbackCallCount).toBe(1);
    expect(result.historyItem.aspect_ratio).toBe("16:9");
    expect(result.variantFilename).toContain("thumb_16_9");
  });

  it("records failure in circuit breaker when primary provider fails", async () => {
    const circuitBreaker = createProviderCircuitBreaker({ failureThreshold: 5 });

    await generateThumbnailVariant({
      repository,
      channel,
      episode,
      ratio: "16:9",
      prompt: "Thumbnail prompt for primary failure test",
      plan: dummyPlan,
      options: {
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        circuitBreaker,
        imageConfig: {
          provider: "custom",
          base_url: "https://test-primary.ai/v1",
          api_key: "sk-primary-test",
        },
        imageFallbackConfig: {
          enabled: true,
          provider: "imgstudio",
          api_key: "sk-fallback-test",
          model: IMGSTUDIO_DEFAULT_MODEL_ID,
        },
      },
      logger,
      nowTimestamp: Date.now(),
    });

    expect(primaryCallCount).toBe(1);
    expect(fallbackCallCount).toBe(1);
    expect(circuitBreaker.getDiagnostics().primary.failureCount).toBe(1);
  });
});
