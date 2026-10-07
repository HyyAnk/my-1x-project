import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RepositoryService } from "../src/repository.js";
import { resolveQuizAssets } from "../src/quiz/assets/resolveQuizAssets.js";
import { preloadValidExistingAssets } from "../src/quiz/assets/resolvers/existingAssetPreloader.js";
import type { QuizAssetPlan, QuizV2 } from "@studio/shared";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })),
  );
});

// Minimal 1x1 PNG buffer
const VALID_PNG_BUFFER = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

describe("Question Images pipeline reconciliation", () => {
  async function setupTestEnvironment() {
    const root = await mkdtemp(path.join(os.tmpdir(), "pipeline-reconcile-test-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");

    const repository = new RepositoryService(root);
    await repository.ensureBootstrap();

    const channel = await repository.createChannel({
      name: "Space Quiz",
      description: "",
      target_audience: "",
      language: "English",
      market: "",
      dna_mode: "example",
    });

    const topics = [
      {
        topic_id: "topic-1",
        channel_id: channel.channel_id,
        content_kind: "episode" as const,
        title: "Space Facts",
        premise: "Premise",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
        quiz_format: "multiple_choice" as const,
        question_count: 3,
        age_band: "7-9" as const,
      },
    ];
    await repository.saveTopicRun(channel.channel_id, topics);
    const episode = await repository.confirmTopic(channel.channel_id, "topic-1");

    const sampleQuiz: QuizV2 = {
      schema_version: 2,
      episode_id: episode.episode_id,
      age_band: "7-9",
      language: "English",
      questions: [
        {
          id: "q-1",
          number: 1,
          format: "multiple_choice",
          difficulty: 1,
          question: "Question 1",
          choices: [{ id: "c1", text: "A" }, { id: "c2", text: "B" }, { id: "c3", text: "C" }],
          correct_choice_id: "c1",
          explanation: "Exp 1",
          visual_opportunity: "Visual 1",
          source_ids: ["C01"],
        },
        {
          id: "q-2",
          number: 2,
          format: "multiple_choice",
          difficulty: 2,
          question: "Question 2",
          choices: [{ id: "c1", text: "A" }, { id: "c2", text: "B" }, { id: "c3", text: "C" }],
          correct_choice_id: "c1",
          explanation: "Exp 2",
          visual_opportunity: "Visual 2",
          source_ids: ["C02"],
        },
        {
          id: "q-3",
          number: 3,
          format: "multiple_choice",
          difficulty: 3,
          question: "Question 3",
          choices: [{ id: "c1", text: "A" }, { id: "c2", text: "B" }, { id: "c3", text: "C" }],
          correct_choice_id: "c1",
          explanation: "Exp 3",
          visual_opportunity: "Visual 3",
          source_ids: ["C03"],
        },
      ],
    };
    await repository.writeQuiz(channel.channel_id, episode.episode_id, sampleQuiz);

    const assetPlan: QuizAssetPlan = {
      schema_version: 2,
      episode_id: episode.episode_id,
      assets: [
        {
          asset_id: "q1_hero",
          question_id: "q-1",
          subject: "Subject 1",
          purpose: "hero_question_image",
          style: "photo_reference",
          aspect_ratio: "16:9",
          transparent_background: false,
          required: true,
          semantic_key: "q1_hero_key",
          consistency_group_id: null,
        },
        {
          asset_id: "q2_hero",
          question_id: "q-2",
          subject: "Subject 2",
          purpose: "hero_question_image",
          style: "photo_reference",
          aspect_ratio: "16:9",
          transparent_background: false,
          required: true,
          semantic_key: "q2_hero_key",
          consistency_group_id: null,
        },
        {
          asset_id: "q3_hero",
          question_id: "q-3",
          subject: "Subject 3",
          purpose: "hero_question_image",
          style: "photo_reference",
          aspect_ratio: "16:9",
          transparent_background: false,
          required: true,
          semantic_key: "q3_hero_key",
          consistency_group_id: null,
        },
      ],
      consistency_groups: [],
    };
    await repository.writeAssetPlan(channel.channel_id, episode.episode_id, assetPlan);

    return { repository, channel, episode, assetPlan };
  }

  it("preloads user-uploaded assets with source explicit_episode", async () => {
    const { repository, channel, episode, assetPlan } = await setupTestEnvironment();

    // User uploads an image for Question 1
    await repository.saveUploadedQuestionImage(
      channel.channel_id,
      episode.episode_id,
      1,
      VALID_PNG_BUFFER,
      "user_q1.png",
    );

    const existingResolution = await repository.readQuizAssetResolution(channel.channel_id, episode.episode_id);
    expect(existingResolution).not.toBeNull();
    expect(existingResolution?.assets.length).toBe(1);
    expect(existingResolution?.assets[0].source).toBe("explicit_episode");

    const preloaded = await preloadValidExistingAssets({
      repository,
      channelId: channel.channel_id,
      episodeId: episode.episode_id,
      plan: assetPlan,
      existingResolution,
      consistencyGroups: new Map(),
      visualStyle: "pixar_3d",
      activeEngine: "codex",
    });

    expect(preloaded.has("q1_hero")).toBe(true);
    const item = preloaded.get("q1_hero")!;
    expect(item.source).toBe("explicit_episode");
  });

  it("resolves quiz assets preserving user-uploaded image without overwriting", async () => {
    const { repository, channel, episode, assetPlan } = await setupTestEnvironment();

    // User uploads image for Question 2
    const uploadRes = await repository.saveUploadedQuestionImage(
      channel.channel_id,
      episode.episode_id,
      2,
      VALID_PNG_BUFFER,
      "user_q2.png",
    );
    expect(uploadRes.item.status).toBe("user_uploaded");

    // Full pipeline resolution executes (with fallback/test engine)
    const result = await resolveQuizAssets({
      repository,
      channelId: channel.channel_id,
      episodeId: episode.episode_id,
      plan: assetPlan,
      activeEngine: "codex",
      imageConfig: { provider: "custom", api_key: "" }, // Will trigger fallback for un-resolved
    });

    const q2Asset = result.resolution.assets.find((a) => a.asset_id === "q2_hero");
    expect(q2Asset).toBeDefined();
    expect(q2Asset?.source).toBe("explicit_episode");

    // Overview correctly shows user_uploaded count is at least 1
    const overview = await repository.listEpisodeQuestionImages(channel.channel_id, episode.episode_id);
    expect(overview.uploaded_count).toBe(1);
    const q2Item = overview.items.find((i) => i.question_number === 2);
    expect(q2Item?.status).toBe("user_uploaded");
    expect(q2Item?.user_selected).toBe(true);
  });
});
