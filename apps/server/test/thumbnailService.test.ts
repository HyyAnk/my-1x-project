import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RepositoryService } from "../src/repository.js";
import {
  generateEpisodeThumbnail,
  getEpisodeThumbnailManifest,
} from "../src/quiz/thumbnail/index.js";
import type { ImageProvider } from "../src/providers/index.js";
import type { TopicCandidate } from "@studio/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Thumbnail Service & API Integration (Step 3)", () => {
  let tempDir: string;
  let repository: RepositoryService;

  async function createTestEpisode(
    repo: RepositoryService,
    channelId: string,
    title: string,
    premise: string,
    quizFormat: "knowledge" | "image_guess" | "multiple_choice" | "true_false" | "odd_one_out" = "knowledge",
  ) {
    const candidates: TopicCandidate[] = [
      {
        topic_id: `top_${Date.now()}_1`,
        channel_id: channelId,
        title,
        premise,
        why_it_fits: "Great topic",
        hook: "Check it out",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
        quiz_format: quizFormat,
        question_count: 8,
        age_band: "7-9",
      },
      ...[2, 3, 4, 5].map((i) => ({
        topic_id: `top_${Date.now()}_${i}`,
        channel_id: channelId,
        title: `Other Topic ${i}`,
        premise: "Premise",
        why_it_fits: "Fit",
        hook: "Hook",
        estimated_potential: "Med",
        generated_at: new Date().toISOString(),
        selected: false,
        quiz_format: "knowledge" as const,
        question_count: 8,
        age_band: "7-9" as const,
      })),
    ];
    await repo.saveTopicRun(channelId, candidates);
    return await repo.confirmTopic(channelId, candidates[0].topic_id);
  }

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `studio-thumb-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    const projectRoot = path.resolve(__dirname, "../../..");
    repository = new RepositoryService(projectRoot, tempDir);
    await repository.ensureBootstrap();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("generates dual 16:9 and 9:16 thumbnails and saves manifest + updates episode", async () => {
    // 1. Create test channel
    const channel = await repository.createChannel({
      name: "Space Trivia Kids",
      description: "Awesome astronomy quizzes for smart kids",
      target_audience: "Kids & Families",
    });

    // 2. Create test mascot
    const mascot = await repository.saveMascot({
      name: "AstroFox",
      description: "A cute robotic space fox",
      visual_style: "pixar_3d",
      master_prompt: "a clever cute robotic fox with cyan glowing ears and white armor",
      color_theme: "#06b6d4",
    });

    // Assign mascot to channel
    await repository.updateChannel(channel.channel_id, {
      mascot_id: mascot.id,
    });

    // 3. Create test episode
    const episode = await createTestEpisode(
      repository,
      channel.channel_id,
      "Solar System Secrets: Would You Rather Explore Mars or Jupiter?",
      "Epic space showdown and quiz",
    );

    // Mock Image Provider that writes a dummy image
    const mockImageProvider: ImageProvider = {
      generateReference: async (prompt: string) => {
        const dummyPath = path.join(tempDir, `mock_thumb_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
        await writeFile(dummyPath, Buffer.from(`MOCK_THUMBNAIL_IMAGE_DATA_FOR_${prompt.slice(0, 30)}`));
        return { asset_path: dummyPath, fallback_tier: 0, degraded: false };
      },
    };

    // 4. Run Thumbnail Generator
    const manifest = await generateEpisodeThumbnail(repository, {
      channelId: channel.channel_id,
      episodeId: episode.episode_id,
      aspectRatio: "both",
      imageProvider: mockImageProvider,
    });

    expect(manifest).toBeDefined();
    expect(manifest.episode_id).toBe(episode.episode_id);
    expect(manifest.layout).toBe("split_vs"); // Auto-resolved from "Would You Rather"
    expect(manifest.asset_path_16_9).toContain("thumbnail_16_9.jpg");
    expect(manifest.asset_path_9_16).toContain("thumbnail_9_16.jpg");
    expect(manifest.prompt_16_9).toContain("16:9");
    expect(manifest.prompt_9_16).toContain("9:16");
    expect(manifest.mascot_persona).toContain("Referee");

    // 5. Verify manifest retrieval
    const fetchedManifest = await getEpisodeThumbnailManifest(repository, channel.channel_id, episode.episode_id);
    expect(fetchedManifest).toEqual(manifest);

    // 6. Verify Episode metadata updated
    const updatedEpisode = await repository.getEpisode(channel.channel_id, episode.episode_id);
    expect(updatedEpisode.thumbnail_asset_path_16_9).toBe(manifest.asset_path_16_9);
    expect(updatedEpisode.thumbnail_asset_path_9_16).toBe(manifest.asset_path_9_16);
  });

  it("supports layout override and custom hook text", async () => {
    const channel = await repository.createChannel({
      name: "History Mysteries",
    });

    const episode = await createTestEpisode(
      repository,
      channel.channel_id,
      "Ancient Pyramids Explained",
      "100 historical facts",
    );

    const mockImageProvider: ImageProvider = {
      generateReference: async () => {
        const dummyPath = path.join(tempDir, `mock_thumb_override.jpg`);
        await writeFile(dummyPath, Buffer.from("MOCK_OVERRIDE_DATA"));
        return { asset_path: dummyPath, fallback_tier: 0, degraded: false };
      },
    };

    const manifest = await generateEpisodeThumbnail(repository, {
      channelId: channel.channel_id,
      episodeId: episode.episode_id,
      layoutOverride: "mystery_silhouette",
      customHookText: "AI ĐÃ XÂY KIM TỰ THÁP?",
      aspectRatio: "16:9",
      imageProvider: mockImageProvider,
    });

    expect(manifest.layout).toBe("mystery_silhouette");
    expect(manifest.hook_text).toBe("AI ĐÃ XÂY KIM TỰ THÁP?");
    expect(manifest.asset_path_16_9).toBeDefined();
    expect(manifest.asset_path_9_16).toBeNull(); // Only 16:9 was requested
  });

  it("auto-detects 16:9 thumbnail when video mode is standard 16:9", async () => {
    const channel = await repository.createChannel({ name: "General Knowledge Studio" });
    const episode = await createTestEpisode(repository, channel.channel_id, "General Trivia Quiz 50", "Trivia facts");

    const mockImageProvider: ImageProvider = {
      generateReference: async () => {
        const dummyPath = path.join(tempDir, `mock_auto_169.jpg`);
        await writeFile(dummyPath, Buffer.from("MOCK_169_DATA"));
        return { asset_path: dummyPath, fallback_tier: 0, degraded: false };
      },
    };

    const manifest = await generateEpisodeThumbnail(repository, {
      channelId: channel.channel_id,
      episodeId: episode.episode_id,
      aspectRatio: "auto",
      imageProvider: mockImageProvider,
    });

    expect(manifest.asset_path_16_9).toBeDefined();
    expect(manifest.asset_path_9_16).toBeNull(); // Auto detected standard 16:9
  });

  it("auto-detects 9:16 thumbnail when video is Shorts", async () => {
    const channel = await repository.createChannel({ name: "Shorts Trivia Blitz" });
    const episode = await createTestEpisode(repository, channel.channel_id, "Crazy Animals Facts #Shorts", "Viral short facts");

    const mockImageProvider: ImageProvider = {
      generateReference: async () => {
        const dummyPath = path.join(tempDir, `mock_auto_916.jpg`);
        await writeFile(dummyPath, Buffer.from("MOCK_916_DATA"));
        return { asset_path: dummyPath, fallback_tier: 0, degraded: false };
      },
    };

    const manifest = await generateEpisodeThumbnail(repository, {
      channelId: channel.channel_id,
      episodeId: episode.episode_id,
      aspectRatio: "auto",
      imageProvider: mockImageProvider,
    });

    expect(manifest.asset_path_9_16).toBeDefined();
    expect(manifest.asset_path_16_9).toBeNull(); // Auto detected 9:16 Shorts
  });
});

