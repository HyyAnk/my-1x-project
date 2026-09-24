import { mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import type { TopicCandidate } from "@studio/shared";
import { RepositoryService } from "../src/repository.js";
import { ImgStudioQuizImageProvider } from "../src/providers/imgstudio/provider.js";
import { Gpti2QuizImageProvider } from "../src/providers/gpti2/provider.js";
import { generateImgStudioAsset } from "../src/quiz/assets/resolvers/strategies/imgStudioStrategy.js";
import { generateGpti2Asset } from "../src/quiz/assets/resolvers/strategies/gpti2Strategy.js";
import { generateThumbnailVariant } from "../src/quiz/thumbnail/thumbnailVariantGenerator.js";
import { generateEpisodeThumbnail } from "../src/quiz/thumbnail/thumbnailService.js";
import type { ProviderAssetInput } from "../src/quiz/assets/resolvers/types/providerAsset.types.js";
import type { MascotVisualAnchor, QuizThumbnailPlan } from "../src/quiz/thumbnail/thumbnailTypes.js";
import { StudioLogger } from "../src/logger.js";
import { generateImgStudioImageBytes } from "../src/providers/imgstudio/generator.js";
import { generateGpti2ImageBytes } from "../src/providers/gpti2/generator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

vi.mock("../src/providers/imgstudio/generator.js", () => ({
  generateImgStudioImageBytes: vi.fn(),
}));

vi.mock("../src/providers/gpti2/generator.js", () => ({
  generateGpti2ImageBytes: vi.fn(),
}));

vi.mock("../src/quiz/assets/imageDimensionValidator.js", () => ({
  validateReturnedImageDimensions: vi.fn(),
}));

vi.mock("../src/quiz/assets/imageMetadataValidator.js", () => ({
  getRecommendationForAssetRequirement: vi.fn().mockReturnValue({}),
  validateQuizImageBytes: vi.fn().mockResolvedValue({
    actual: { width: 1280, height: 720 },
    issues: [],
  }),
}));

function makeFingerprint(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}

async function createTestEpisode(
  repo: RepositoryService,
  channelId: string,
  title: string,
  premise: string,
) {
  const candidates: TopicCandidate[] = [
    {
      topic_id: `top_${Date.now()}_1`,
      channel_id: channelId,
      content_kind: "episode" as const,
      title,
      premise,
      why_it_fits: "Great topic",
      hook: "Check it out",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      quiz_format: "knowledge",
      question_count: 5,
      age_band: "7-9",
    },
    ...[2, 3, 4, 5].map((i) => ({
      topic_id: `top_${Date.now()}_${i}`,
      channel_id: channelId,
      content_kind: "episode" as const,
      title: `Other Topic ${i}`,
      premise: "Premise",
      why_it_fits: "Fit",
      hook: "Hook",
      estimated_potential: "Med",
      generated_at: new Date().toISOString(),
      selected: false,
      quiz_format: "knowledge" as const,
      question_count: 5,
      age_band: "7-9" as const,
    })),
  ];
  await repo.saveTopicRun(channelId, candidates);
  return await repo.confirmTopic(channelId, candidates[0].topic_id);
}

describe("Stage 3: Image Provider Reference-First Integration", () => {
  let tempDir: string;
  let repository: RepositoryService;
  let logger: StudioLogger;
  let dummyImageBytes: Uint8Array;
  let testChannelId: string;
  let testEpisodeId: string;

  const sampleBase64Reference = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `studio-ref-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    const projectRoot = path.resolve(__dirname, "../../..");
    repository = new RepositoryService(projectRoot, tempDir);
    await repository.ensureBootstrap();
    logger = new StudioLogger(tempDir);

    const channel = await repository.createChannel({ name: "Ref Test Channel" });
    const episode = await createTestEpisode(repository, channel.channel_id, "Episode 1", "Premise 1");
    testChannelId = channel.channel_id;
    testEpisodeId = episode.episode_id;

    dummyImageBytes = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 4,
        background: { r: 50, g: 150, b: 250, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    vi.mocked(generateImgStudioImageBytes).mockResolvedValue({
      bytes: dummyImageBytes,
      model: "test-imgstudio-model",
      aspect_ratio: "16:9",
      resolution: "1K",
      price_vnd: 150,
      url: "https://mock.imgstudio.site/test.png",
    });

    vi.mocked(generateGpti2ImageBytes).mockResolvedValue({
      bytes: dummyImageBytes,
      model: "gpt-image-2",
      aspect_ratio: "16:9",
      size: "1280x720",
      price_vnd: 50,
    });
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("ImgStudioQuizImageProvider & Strategy", () => {
    it("passes referenceImage to generateImgStudioImageBytes when referenceImageBase64 is provided", async () => {
      const provider = new ImgStudioQuizImageProvider(
        repository,
        { channelId: testChannelId, episodeId: testEpisodeId },
        { apiKey: "test-api-key" },
      );

      const result = await provider.generateAsset({
        assetId: "asset_img_1",
        fingerprint: makeFingerprint("asset_img_1"),
        prompt: "A cute mascot in space",
        aspect_ratio: "16:9",
        referenceImageBase64: sampleBase64Reference,
      });

      expect(result).toBeDefined();
      expect(result.path).toContain("asset_img_1");
      expect(generateImgStudioImageBytes).toHaveBeenCalledTimes(1);

      const generatorCall = vi.mocked(generateImgStudioImageBytes).mock.calls[0];
      expect(generatorCall[0]).toBe("A cute mascot in space");
      expect(generatorCall[1]?.referenceImage).toBe(sampleBase64Reference);
    });

    it("leaves referenceImage undefined when referenceImageBase64 is not provided", async () => {
      const provider = new ImgStudioQuizImageProvider(
        repository,
        { channelId: testChannelId, episodeId: testEpisodeId },
        { apiKey: "test-api-key" },
      );

      const result = await provider.generateAsset({
        assetId: "asset_img_2",
        fingerprint: makeFingerprint("asset_img_2"),
        prompt: "A cute mascot standard prompt",
        aspect_ratio: "16:9",
      });

      expect(result).toBeDefined();
      expect(generateImgStudioImageBytes).toHaveBeenCalledTimes(1);

      const generatorCall = vi.mocked(generateImgStudioImageBytes).mock.calls[0];
      expect(generatorCall[1]?.referenceImage).toBeUndefined();
    });

    it("generateImgStudioAsset forwards referenceImageBase64 through ProviderAssetInput", async () => {
      const input: ProviderAssetInput = {
        repository,
        channelId: testChannelId,
        episodeId: testEpisodeId,
        request: {
          asset_id: "asset_strategy_img",
          question_id: null,
          purpose: "hero_question_image",
          subject: "ImgStudio Mascot Test",
          style: "cute_illustration",
          aspect_ratio: "16:9",
          transparent_background: false,
          required: true,
          semantic_key: "mascot-test",
          consistency_group_id: null,
        },
        fingerprint: makeFingerprint("asset_strategy_img"),
        compiledPrompt: "ImgStudio prompt with visual reference",
        configuredProvider: "imgstudio",
        activeEngine: "codex",
        imageConfig: { provider: "imgstudio", api_key: "dummy-key" },
        referenceImageBase64: sampleBase64Reference,
        logger,
      };

      const output = await generateImgStudioAsset(input);
      expect(output.entry.path).toBeDefined();
      expect(generateImgStudioImageBytes).toHaveBeenCalledTimes(1);

      const generatorCall = vi.mocked(generateImgStudioImageBytes).mock.calls[0];
      expect(generatorCall[1]?.referenceImage).toBe(sampleBase64Reference);
    });
  });

  describe("Gpti2QuizImageProvider & Strategy", () => {
    it("passes referenceImageBase64 to generateGpti2ImageBytes when referenceImageBase64 is provided", async () => {
      const provider = new Gpti2QuizImageProvider(
        repository,
        { channelId: testChannelId, episodeId: testEpisodeId },
        { apiKey: "test-gpti2-key" },
      );

      const result = await provider.generateAsset({
        assetId: "asset_gpti2_1",
        fingerprint: makeFingerprint("asset_gpti2_1"),
        prompt: "A cute gpti2 mascot in space",
        aspect_ratio: "16:9",
        referenceImageBase64: sampleBase64Reference,
      });

      expect(result).toBeDefined();
      expect(result.path).toContain("asset_gpti2_1");
      expect(generateGpti2ImageBytes).toHaveBeenCalledTimes(1);

      const generatorCall = vi.mocked(generateGpti2ImageBytes).mock.calls[0];
      expect(generatorCall[0]).toBe("A cute gpti2 mascot in space");
      expect(generatorCall[1]?.referenceImageBase64).toBe(sampleBase64Reference);
    });

    it("leaves referenceImageBase64 undefined when referenceImageBase64 is not provided", async () => {
      const provider = new Gpti2QuizImageProvider(
        repository,
        { channelId: testChannelId, episodeId: testEpisodeId },
        { apiKey: "test-gpti2-key" },
      );

      const result = await provider.generateAsset({
        assetId: "asset_gpti2_2",
        fingerprint: makeFingerprint("asset_gpti2_2"),
        prompt: "A cute mascot standard text prompt",
        aspect_ratio: "16:9",
      });

      expect(result).toBeDefined();
      expect(generateGpti2ImageBytes).toHaveBeenCalledTimes(1);

      const generatorCall = vi.mocked(generateGpti2ImageBytes).mock.calls[0];
      expect(generatorCall[1]?.referenceImageBase64).toBeUndefined();
    });

    it("generateGpti2Asset forwards referenceImageBase64 through ProviderAssetInput", async () => {
      const input: ProviderAssetInput = {
        repository,
        channelId: testChannelId,
        episodeId: testEpisodeId,
        request: {
          asset_id: "asset_strategy_gpti2",
          question_id: null,
          purpose: "hero_question_image",
          subject: "GPT-I2 Mascot Test",
          style: "cute_illustration",
          aspect_ratio: "16:9",
          transparent_background: false,
          required: true,
          semantic_key: "gpti2-mascot-test",
          consistency_group_id: null,
        },
        fingerprint: makeFingerprint("asset_strategy_gpti2"),
        compiledPrompt: "GPT-I2 prompt with visual reference",
        configuredProvider: "gpti2",
        activeEngine: "codex",
        imageConfig: { provider: "gpti2", api_key: "dummy-key" },
        referenceImageBase64: sampleBase64Reference,
        logger,
      };

      const output = await generateGpti2Asset(input);
      expect(output.entry.path).toBeDefined();
      expect(generateGpti2ImageBytes).toHaveBeenCalledTimes(1);

      const generatorCall = vi.mocked(generateGpti2ImageBytes).mock.calls[0];
      expect(generatorCall[1]?.referenceImageBase64).toBe(sampleBase64Reference);
    });
  });

  describe("Thumbnail Variant Generator Forwarding", () => {
    it("forwards visualAnchor base64 as referenceImageBase64 to asset generation", async () => {
      const channel = await repository.getChannel(testChannelId);
      const episode = await repository.getEpisode(testChannelId, testEpisodeId);

      const plan: QuizThumbnailPlan = {
        layout: "solo_mascot",
        hookText: "TEST HOOK",
        badgeText: "HOT",
        visualStyle: "pixar_3d",
        colorTheme: "#ff4400",
        mascotPersona: {
          role: "Explorer",
          costume: "Spacesuit",
          prop: "Compass",
          expression: "Excited",
          poseDescription: "Pointing upward",
        },
        subjectAnchors: [],
        topicTitle: "Variant Episode",
        questionCount: 10,
      };

      const visualAnchor: MascotVisualAnchor = {
        base64: sampleBase64Reference,
        mimeType: "image/png",
        fingerprint: "mock-fingerprint-abc",
      };

      const result = await generateThumbnailVariant({
        repository,
        channel,
        episode,
        ratio: "16:9",
        prompt: "Generated thumbnail prompt with anchor",
        plan,
        options: {
          channelId: channel.channel_id,
          episodeId: episode.episode_id,
          imageConfig: { provider: "imgstudio", api_key: "test-api-key" },
        },
        logger,
        nowTimestamp: 123456789,
        visualAnchor,
      });

      expect(result).toBeDefined();
      expect(result.historyItem.is_active).toBe(true);
      expect(generateImgStudioImageBytes).toHaveBeenCalledTimes(1);

      const generatorCall = vi.mocked(generateImgStudioImageBytes).mock.calls[0];
      expect(generatorCall[1]?.referenceImage).toBe(sampleBase64Reference);
    });

    it("operates safely in text-to-image mode when visualAnchor is null", async () => {
      const channel = await repository.getChannel(testChannelId);
      const episode = await repository.getEpisode(testChannelId, testEpisodeId);

      const plan: QuizThumbnailPlan = {
        layout: "solo_mascot",
        hookText: "NO ANCHOR",
        badgeText: "NEW",
        visualStyle: "pixar_3d",
        colorTheme: "#00ff00",
        mascotPersona: {
          role: "Explorer",
          costume: "Jacket",
          prop: "Map",
          expression: "Happy",
          poseDescription: "Standing",
        },
        subjectAnchors: [],
        topicTitle: "Null Anchor Episode",
        questionCount: 10,
      };

      const result = await generateThumbnailVariant({
        repository,
        channel,
        episode,
        ratio: "16:9",
        prompt: "Generated thumbnail prompt without anchor",
        plan,
        options: {
          channelId: channel.channel_id,
          episodeId: episode.episode_id,
          imageConfig: { provider: "gpti2", api_key: "test-gpti2-key" },
        },
        logger,
        nowTimestamp: 123456789,
        visualAnchor: null,
      });

      expect(result).toBeDefined();
      expect(generateGpti2ImageBytes).toHaveBeenCalledTimes(1);

      const generatorCall = vi.mocked(generateGpti2ImageBytes).mock.calls[0];
      expect(generatorCall[1]?.referenceImageBase64).toBeUndefined();
    });
  });

  describe("End-to-End Mascot Anchor Propagation in thumbnailService", () => {
    it("loads channel mascot visual anchor and forwards to AI provider in generateEpisodeThumbnail", async () => {
      // 1. Create Channel
      const channel = await repository.createChannel({
        name: "E2E Channel",
        language: "English",
      });

      // 2. Create Mascot with master image asset
      const mascot = await repository.saveMascot({
        name: "RocketBunny",
        description: "A speedy space rabbit",
        visual_style: "pixar_3d",
        master_prompt: "a swift white rabbit in a mini astro-suit",
        color_theme: "#f43f5e",
      });

      const mascotAssetUrl = await repository.saveMascotAsset(
        mascot.id,
        "master_concept.png",
        dummyImageBytes,
      );
      await repository.saveMascot({
        ...mascot,
        master_image_url: mascotAssetUrl,
      });

      await repository.updateChannel(channel.channel_id, {
        mascot_id: mascot.id,
      });

      // 3. Create Episode
      const episode = await createTestEpisode(
        repository,
        channel.channel_id,
        "Bunny Space Race",
        "Cosmic rabbit adventures",
      );

      // 4. Generate Thumbnail with ImgStudio provider config
      const manifest = await generateEpisodeThumbnail(repository, {
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        aspectRatio: "16:9",
        imageConfig: { provider: "imgstudio", api_key: "test-key" },
      });

      expect(manifest).toBeDefined();
      expect(manifest.asset_path_16_9).toContain("thumbnail_16_9.jpg");
      expect(generateImgStudioImageBytes).toHaveBeenCalledTimes(1);

      // Verify that the generator call received a valid base64 data URL
      const generatorCall = vi.mocked(generateImgStudioImageBytes).mock.calls[0];
      expect(generatorCall[1]?.referenceImage).toBeDefined();
      expect(generatorCall[1]?.referenceImage).toMatch(/^data:image\/png;base64,/);
    });

    it("loads channel mascot visual anchor and forwards to GPT-I2 in generateEpisodeThumbnail", async () => {
      const channel = await repository.createChannel({
        name: "GPT-I2 E2E Channel",
        language: "English",
      });

      const mascot = await repository.saveMascot({
        name: "CosmicCat",
        description: "A cosmic cat mascot",
        visual_style: "pixar_3d",
        master_prompt: "a celestial cat with starlight fur",
        color_theme: "#8b5cf6",
      });

      const mascotAssetUrl = await repository.saveMascotAsset(
        mascot.id,
        "master_concept.png",
        dummyImageBytes,
      );
      await repository.saveMascot({
        ...mascot,
        master_image_url: mascotAssetUrl,
      });

      await repository.updateChannel(channel.channel_id, {
        mascot_id: mascot.id,
      });

      const episode = await createTestEpisode(
        repository,
        channel.channel_id,
        "Cat Constellations",
        "Exploring cat stars",
      );

      const manifest = await generateEpisodeThumbnail(repository, {
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        aspectRatio: "16:9",
        imageConfig: { provider: "gpti2", api_key: "test-gpti2-key" },
      });

      expect(manifest).toBeDefined();
      expect(manifest.asset_path_16_9).toContain("thumbnail_16_9.jpg");
      expect(generateGpti2ImageBytes).toHaveBeenCalledTimes(1);

      const generatorCall = vi.mocked(generateGpti2ImageBytes).mock.calls[0];
      expect(generatorCall[1]?.referenceImageBase64).toBeDefined();
      expect(generatorCall[1]?.referenceImageBase64).toMatch(/^data:image\/png;base64,/);
    });

    it("falls back cleanly to standard text-to-image when mascot has no master image", async () => {
      const channel = await repository.createChannel({
        name: "No Master Image Channel",
        language: "English",
      });

      const mascot = await repository.saveMascot({
        name: "GhostMascot",
        description: "No master image yet",
        visual_style: "pixar_3d",
        master_prompt: "a mysterious ghost",
        color_theme: "#64748b",
      });

      await repository.updateChannel(channel.channel_id, {
        mascot_id: mascot.id,
      });

      const episode = await createTestEpisode(
        repository,
        channel.channel_id,
        "Haunted Trivia",
        "Spooky questions",
      );

      const manifest = await generateEpisodeThumbnail(repository, {
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        aspectRatio: "16:9",
        imageConfig: { provider: "imgstudio", api_key: "test-key" },
      });

      expect(manifest).toBeDefined();
      expect(manifest.asset_path_16_9).toContain("thumbnail_16_9.jpg");
      expect(generateImgStudioImageBytes).toHaveBeenCalledTimes(1);

      const generatorCall = vi.mocked(generateImgStudioImageBytes).mock.calls[0];
      expect(generatorCall[1]?.referenceImage).toBeUndefined();
    });
  });
});
