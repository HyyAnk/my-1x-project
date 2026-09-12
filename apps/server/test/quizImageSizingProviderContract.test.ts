import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { type QuizAssetPlan, type QuizV2, QuizV2Schema } from "@studio/shared";
import { RepositoryService } from "../src/repository.js";
import { generateGpti2ImageBytes } from "../src/providers/gpti2Image.js";
import { generateShopAiKeyImageBytes } from "../src/providers/shopAiKeyImage.js";
import { callImgStudioApi } from "../src/providers/imgstudio/client.js";
import { resolveQuizAssets } from "../src/quiz/assets/resolveQuizAssets.js";

const roots: string[] = [];
const originalFetch = globalThis.fetch;

afterEach(async () => {
  globalThis.fetch = originalFetch;
  delete process.env.GPTI2_API_KEY;
  delete process.env.SHOPAIKEY_API_KEY;
  delete process.env.SHOPAIKEY_IMAGE_SIZE;
  delete process.env.IMGSTUDIO_API_KEY;
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

async function createTestRepository(): Promise<{ repository: RepositoryService; root: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-provider-contract-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
  const repository = new RepositoryService(root);
  await repository.ensureBootstrap();
  return { repository, root };
}

async function createTestEpisode(
  repository: RepositoryService,
  prefix: string,
): Promise<{ channelId: string; episodeId: string }> {
  const channel = await repository.createChannel({
    name: `${prefix} Channel`,
    description: "Test channel",
    target_audience: "All",
    language: "English",
    market: "US",
    dna_mode: "example",
  });
  const topicId = `topic_${prefix.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
  const topic = {
    topic_id: topicId,
    channel_id: channel.channel_id,
    content_kind: "episode" as const,
    title: `${prefix} Topic`,
    premise: "Premise",
    why_it_fits: "Fits",
    hook: "Hook",
    estimated_potential: "High",
    generated_at: new Date().toISOString(),
    selected: false,
  };
  await repository.saveTopicRun(channel.channel_id, [topic]);
  const episode = await repository.confirmTopic(channel.channel_id, topicId);
  return { channelId: channel.channel_id, episodeId: episode.episode_id };
}

async function createRealImageBase64(width: number, height: number): Promise<string> {
  const buffer = await sharp({
    create: { width, height, channels: 4, background: { r: 100, g: 150, b: 200, alpha: 1 } },
  })
    .png()
    .toBuffer();
  return buffer.toString("base64");
}

describe("Quiz Image Sizing Provider Contract Suite", () => {
  describe("1. Outbound HTTP Request Construction", () => {
    it("constructs 4:3 size=1024x768 and 16:9 size=1280x720 for GPTI2 provider", async () => {
      const b64_4_3 = await createRealImageBase64(1024, 768);
      let capturedBody: any = null;

      globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
        capturedBody = JSON.parse(init.body as string);
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: [{ b64_json: b64_4_3 }],
              price_vnd: 50,
            }),
        };
      });

      // 4:3 request
      await generateGpti2ImageBytes("Prompt for 4:3 hero", {
        apiKey: "fake-key",
        model: "gpt-image-2",
        aspect_ratio: "4:3",
      });
      expect(capturedBody.size).toBe("1024x768");

      // 16:9 request
      await generateGpti2ImageBytes("Prompt for 16:9 hero", {
        apiKey: "fake-key",
        model: "gpt-image-2",
        aspect_ratio: "16:9",
      });
      expect(capturedBody.size).toBe("1280x720");
    });

    it("constructs outbound body with aspect_ratio and resolution preset for ImgStudio", async () => {
      let capturedBody: any = null;
      globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
        capturedBody = JSON.parse(init.body as string);
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              task_id: "task-123",
              status: "succeeded",
              images: [{ url: "https://example.com/out.png" }],
            }),
        };
      });

      await callImgStudioApi(
        {
          prompt: "ImgStudio landscape prompt",
          model: "gemini-3.1-flash-image",
          aspect_ratio: "16:9",
          resolution: "2K",
          quality: "standard",
        },
        { apiKey: "fake-imgstudio-key" },
      );

      expect(capturedBody.aspect_ratio).toBe("16:9");
      expect(capturedBody.resolution).toBe("2K");
      expect(capturedBody.quality).toBe("standard");
    });

    it("resolves size from aspect ratio for ShopAiKey provider", async () => {
      const b64 = await createRealImageBase64(1280, 720);
      let capturedBody: any = null;
      globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
        capturedBody = JSON.parse(init.body as string);
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: [{ b64_json: b64 }],
            }),
        };
      });

      await generateShopAiKeyImageBytes("Prompt Output framing: 16:9.", undefined, {
        apiKey: "fake-shop-key",
        aspectRatio: "16:9",
      });
      expect(capturedBody.size).toBe("1280x720");
    });
  });

  describe("2. Conflicting Size Override Deterministic Rejection", () => {
    it("rejects contradictory size override in GPTI2 with image_request_size_conflict", async () => {
      await expect(
        generateGpti2ImageBytes("Prompt", {
          apiKey: "fake-key",
          model: "gpt-image-2",
          aspect_ratio: "16:9",
          size: "1024x1024", // 1:1 conflict with 16:9!
        }),
      ).rejects.toThrow(/image_request_size_conflict/i);
    });

    it("rejects contradictory size override in ShopAiKey with image_request_size_conflict", async () => {
      await expect(
        generateShopAiKeyImageBytes("Prompt", undefined, {
          apiKey: "fake-key",
          aspectRatio: "16:9",
          size: "1024x1024", // 1:1 conflict with 16:9!
        }),
      ).rejects.toThrow(/image_request_size_conflict/i);
    });
  });

  describe("3. Metadata Boundary & Actual Decode Validation", () => {
    it("blocks generated square image returned for 16:9 requirement and excludes it from resolution", async () => {
      const { repository } = await createTestRepository();
      const { channelId, episodeId } = await createTestEpisode(repository, "Ep1");

      const plan: QuizAssetPlan = {
        schema_version: 2,
        episode_id: episodeId,
        assets: [
          {
            asset_id: "asset-hero-16-9",
            question_id: "q-1",
            subject: "The Sun",
            purpose: "hero_question_image",
            style: "cute_illustration",
            aspect_ratio: "16:9",
            transparent_background: false,
            required: true,
            semantic_key: "q-1:hero",
            consistency_group_id: null,
            sizing: {
              policy_version: 1,
              layout_id: "verdict_true_false",
              geometry_key: "verdict_true_false:hero_question_image:1920x1080:800x490_cover",
              recommended_width: 1408,
              recommended_height: 792,
            },
          },
        ],
        consistency_groups: [],
      };

      // Provider maliciously/erroneously returns 1024x1024 square image despite 16:9 request!
      const squareB64 = await createRealImageBase64(1024, 1024);
      let outboundBody: any = null;
      globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
        outboundBody = JSON.parse(init.body as string);
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: [{ b64_json: squareB64 }],
              price_vnd: 50,
            }),
        };
      });

      const { resolution, issues } = await resolveQuizAssets({
        repository,
        channelId,
        episodeId,
        plan,
        imageConfig: {
          provider: "gpti2",
          api_key: "fake-key",
          model: "gpt-image-2",
        },
        maxRounds: 1,
      });

      // Outbound requested 16:9
      expect(outboundBody.size).toBe("1280x720");

      // Validation issues contain blocker
      expect(issues).toContainEqual(
        expect.objectContaining({
          code: "image_output_aspect_mismatch",
          severity: "blocker",
        }),
      );

      // Rejected asset is NOT in resolution.assets!
      expect(resolution.assets).not.toContainEqual(
        expect.objectContaining({
          asset_id: "asset-hero-16-9",
        }),
      );
    });

    it("registers valid 1280x720 output and attaches actual_dimensions", async () => {
      const { repository } = await createTestRepository();
      const { channelId, episodeId } = await createTestEpisode(repository, "Ep2");

      const plan: QuizAssetPlan = {
        schema_version: 2,
        episode_id: episodeId,
        assets: [
          {
            asset_id: "asset-valid-16-9",
            question_id: "q-1",
            subject: "Mars",
            purpose: "hero_question_image",
            style: "cute_illustration",
            aspect_ratio: "16:9",
            transparent_background: false,
            required: true,
            semantic_key: "q-1:hero",
            consistency_group_id: null,
            sizing: {
              policy_version: 1,
              layout_id: "verdict_true_false",
              geometry_key: "verdict_true_false:hero_question_image:1920x1080:800x490_cover",
              recommended_width: 1408,
              recommended_height: 792,
            },
          },
        ],
        consistency_groups: [],
      };

      const validB64 = await createRealImageBase64(1280, 720);
      globalThis.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: [{ b64_json: validB64 }],
            price_vnd: 50,
          }),
      }));

      const { resolution, issues } = await resolveQuizAssets({
        repository,
        channelId,
        episodeId,
        plan,
        imageConfig: {
          provider: "gpti2",
          api_key: "fake-key",
          model: "gpt-image-2",
        },
        maxRounds: 1,
      });

      expect(issues.filter((i) => i.severity === "blocker")).toEqual([]);
      expect(resolution.assets).toHaveLength(1);
      expect(resolution.assets[0].actual_dimensions).toEqual({ width: 1280, height: 720 });
    });

    it("does not call recordImageUsage when reusing valid cached asset", async () => {
      const { repository } = await createTestRepository();
      const { channelId, episodeId } = await createTestEpisode(repository, "Ep3");

      const plan: QuizAssetPlan = {
        schema_version: 2,
        episode_id: episodeId,
        assets: [
          {
            asset_id: "asset-cache-check",
            question_id: "q-1",
            subject: "Elephant",
            purpose: "hero_question_image",
            style: "cute_illustration",
            aspect_ratio: "16:9",
            transparent_background: false,
            required: true,
            semantic_key: "q-1:hero",
            consistency_group_id: null,
            sizing: {
              policy_version: 1,
              layout_id: "verdict_true_false",
              geometry_key: "verdict_true_false:hero_question_image:1920x1080:800x490_cover",
              recommended_width: 1408,
              recommended_height: 792,
            },
          },
        ],
        consistency_groups: [],
      };

      const validB64 = await createRealImageBase64(1280, 720);
      globalThis.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: [{ b64_json: validB64 }],
            price_vnd: 50,
          }),
      }));

      // Pass 1: generate asset (records usage once)
      const usageSpy = vi.spyOn(repository, "recordImageUsage");
      await resolveQuizAssets({
        repository,
        channelId,
        episodeId,
        plan,
        imageConfig: {
          provider: "gpti2",
          api_key: "fake-key",
          model: "gpt-image-2",
        },
      });

      expect(usageSpy).toHaveBeenCalledTimes(1);

      // Pass 2: rerun resolution. Cache hit must NOT call recordImageUsage!
      usageSpy.mockClear();
      const pass2 = await resolveQuizAssets({
        repository,
        channelId,
        episodeId,
        plan,
        imageConfig: {
          provider: "gpti2",
          api_key: "fake-key",
          model: "gpt-image-2",
        },
      });

      expect(pass2.resolution.assets).toHaveLength(1);
      expect(usageSpy).not.toHaveBeenCalled();
    });
  });
});
