import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RepositoryService } from "../src/repository.js";
import type { QuizV2 } from "@studio/shared";

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

describe("Question Images repository workflow", () => {
  async function createTestEnv() {
    const root = await mkdtemp(path.join(os.tmpdir(), "question-images-test-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");

    const repository = new RepositoryService(root);
    await repository.ensureBootstrap();

    const channel = await repository.createChannel({
      name: "Quiz Channel",
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
        title: "Space Wonders",
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
          question: "Which planet is famous for prominent rings?",
          choices: [
            { id: "c1", text: "Saturn" },
            { id: "c2", text: "Mars" },
            { id: "c3", text: "Venus" },
          ],
          correct_choice_id: "c1",
          explanation: "Saturn has huge rings made of ice and rock.",
          visual_opportunity: "Saturn in space",
          source_ids: ["C01"],
        },
        {
          id: "q-2",
          number: 2,
          format: "multiple_choice",
          difficulty: 2,
          question: "What is the closest planet to the Sun?",
          choices: [
            { id: "c1", text: "Mercury" },
            { id: "c2", text: "Earth" },
            { id: "c3", text: "Jupiter" },
          ],
          correct_choice_id: "c1",
          explanation: "Mercury orbits closest to the Sun.",
          visual_opportunity: "Mercury glowing near the sun",
          source_ids: ["C02"],
        },
        {
          id: "q-3",
          number: 3,
          format: "multiple_choice",
          difficulty: 2,
          question: "Which planet is known as the Red Planet?",
          choices: [
            { id: "c1", text: "Mars" },
            { id: "c2", text: "Venus" },
            { id: "c3", text: "Neptune" },
          ],
          correct_choice_id: "c1",
          explanation: "Mars appears red due to iron oxide on its surface.",
          visual_opportunity: "Mars surface with canyons",
          source_ids: ["C03"],
        },
      ],
    };

    await repository.writeQuiz(channel.channel_id, episode.episode_id, sampleQuiz);

    return { repository, channel, episode };
  }

  it("lists question images with initial missing status", async () => {
    const { repository, channel, episode } = await createTestEnv();

    const overview = await repository.listEpisodeQuestionImages(channel.channel_id, episode.episode_id);

    expect(overview.total_questions).toBe(3);
    expect(overview.ready_count).toBe(0);
    expect(overview.missing_count).toBe(3);
    expect(overview.uploaded_count).toBe(0);
    expect(overview.items.length).toBe(3);

    expect(overview.items[0].question_number).toBe(1);
    expect(overview.items[0].question_text).toBe("Which planet is famous for prominent rings?");
    expect(overview.items[0].status).toBe("missing");
    expect(overview.items[0].user_selected).toBe(false);
  });

  it("persists uploaded image and marks status as user_uploaded", async () => {
    const { repository, channel, episode } = await createTestEnv();

    const { item, invalidated } = await repository.saveUploadedQuestionImage(
      channel.channel_id,
      episode.episode_id,
      1,
      VALID_PNG_BUFFER,
      "custom_saturn.png",
    );

    expect(item.question_number).toBe(1);
    expect(item.status).toBe("user_uploaded");
    expect(item.user_selected).toBe(true);
    expect(item.source).toBe("explicit_episode");
    expect(item.image_url).toContain("CB-01.png");
    expect(Array.isArray(invalidated)).toBe(true);

    const overview = await repository.listEpisodeQuestionImages(channel.channel_id, episode.episode_id);
    expect(overview.ready_count).toBe(1);
    expect(overview.uploaded_count).toBe(1);
    expect(overview.missing_count).toBe(2);
  });

  it("deletes custom uploaded image and resets question status back to missing", async () => {
    const { repository, channel, episode } = await createTestEnv();

    await repository.saveUploadedQuestionImage(
      channel.channel_id,
      episode.episode_id,
      1,
      VALID_PNG_BUFFER,
      "custom_saturn.png",
    );

    const { item, invalidated } = await repository.deleteUploadedQuestionImage(
      channel.channel_id,
      episode.episode_id,
      1,
    );

    expect(item.question_number).toBe(1);
    expect(item.status).toBe("missing");
    expect(item.user_selected).toBe(false);
    expect(Array.isArray(invalidated)).toBe(true);

    const overview = await repository.listEpisodeQuestionImages(channel.channel_id, episode.episode_id);
    expect(overview.ready_count).toBe(0);
    expect(overview.uploaded_count).toBe(0);
    expect(overview.missing_count).toBe(3);
  });

  it("resolves 3 square slots (1:1) for visual_choices_three layout", async () => {
    const { repository, channel, episode } = await createTestEnv();

    const quiz = await repository.readQuiz(channel.channel_id, episode.episode_id);
    if (!quiz) throw new Error("Quiz not found");

    // Configure Q1 to use visual_choices_three layout
    quiz.questions[0].layout_id = "visual_choices_three";
    quiz.questions[0].choices = [
      { id: "c1", text: "Mercury" },
      { id: "c2", text: "Venus" },
      { id: "c3", text: "Earth" },
    ];
    await repository.writeQuiz(channel.channel_id, episode.episode_id, quiz);

    const overview = await repository.listEpisodeQuestionImages(channel.channel_id, episode.episode_id);
    const item1 = overview.items[0];

    expect(item1.layout_id).toBe("visual_choices_three");
    expect(item1.slots.length).toBe(3);

    expect(item1.slots[0].slot_id).toBe("c1");
    expect(item1.slots[0].label).toBe("Choice A");
    expect(item1.slots[0].choice_text).toBe("Mercury");
    expect(item1.slots[0].aspect_ratio).toBe("1:1");
    expect(item1.slots[0].purpose).toBe("answer_option");
    expect(item1.slots[0].status).toBe("missing");

    expect(item1.slots[1].slot_id).toBe("c2");
    expect(item1.slots[1].label).toBe("Choice B");
    expect(item1.slots[1].choice_text).toBe("Venus");
    expect(item1.slots[1].aspect_ratio).toBe("1:1");

    expect(item1.slots[2].slot_id).toBe("c3");
    expect(item1.slots[2].label).toBe("Choice C");
    expect(item1.slots[2].choice_text).toBe("Earth");
    expect(item1.slots[2].aspect_ratio).toBe("1:1");
  });

  it("resolves 3 portrait slots (3:4) for visual_choices_three_pure and 2 slots for split_versus_two", async () => {
    const { repository, channel, episode } = await createTestEnv();

    const quiz = await repository.readQuiz(channel.channel_id, episode.episode_id);
    if (!quiz) throw new Error("Quiz not found");

    quiz.questions[0].layout_id = "visual_choices_three_pure";
    quiz.questions[1].layout_id = "split_versus_two";
    quiz.questions[1].choices = [
      { id: "c1", text: "Lion" },
      { id: "c2", text: "Tiger" },
      { id: "c3", text: "Bear" },
    ];
    await repository.writeQuiz(channel.channel_id, episode.episode_id, quiz);

    const overview = await repository.listEpisodeQuestionImages(channel.channel_id, episode.episode_id);
    const q1 = overview.items[0];
    const q2 = overview.items[1];

    expect(q1.layout_id).toBe("visual_choices_three_pure");
    expect(q1.slots.length).toBe(3);
    expect(q1.slots[0].aspect_ratio).toBe("3:4");
    expect(q1.slots[1].aspect_ratio).toBe("3:4");
    expect(q1.slots[2].aspect_ratio).toBe("3:4");

    expect(q2.layout_id).toBe("split_versus_two");
    expect(q2.slots.length).toBe(2);
    expect(q2.slots[0].label).toBe("Choice A");
    expect(q2.slots[0].aspect_ratio).toBe("16:9");
    expect(q2.slots[1].label).toBe("Choice B");
    expect(q2.slots[1].aspect_ratio).toBe("16:9");
  });

  it("maps resolved choice assets to corresponding slots correctly without collision", async () => {
    const { repository, channel, episode } = await createTestEnv();

    const quiz = await repository.readQuiz(channel.channel_id, episode.episode_id);
    if (!quiz) throw new Error("Quiz not found");

    quiz.questions[0].layout_id = "visual_choices_three";
    quiz.questions[0].choices = [
      { id: "c1", text: "Choice 1" },
      { id: "c2", text: "Choice 2" },
      { id: "c3", text: "Choice 3" },
    ];
    await repository.writeQuiz(channel.channel_id, episode.episode_id, quiz);

    // Mock asset resolution where choice 1 is generated and ready
    await repository.writeQuizAssetResolution(channel.channel_id, episode.episode_id, {
      schema_version: 2,
      episode_id: episode.episode_id,
      template_id: "candy_arcade",
      assets: [
        {
          asset_id: "asset-q-1-c1",
          question_id: "q-1",
          choice_id: "c1",
          purpose: "answer_option",
          aspect_ratio: "1:1",
          style: "photo_reference",
          subject: "Choice 1 illustration",
          semantic_key: "q-1:choice:c1",
          transparent_background: true,
          required: true,
          fingerprint: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          path: `channels/${channel.channel_id}/episodes/${episode.episode_id}/assets/quiz-images/asset-q-1-c1-0123456789ab.png`,
          source: "provider",
        },
      ],
    });

    const overview = await repository.listEpisodeQuestionImages(channel.channel_id, episode.episode_id);
    const item = overview.items[0];

    expect(item.slots.length).toBe(3);
    expect(item.slots[0].status).toBe("ai_generated");
    expect(item.slots[0].source).toBe("provider");
    expect(item.slots[0].image_url).toContain("slotId=c1");

    expect(item.slots[1].status).toBe("missing");
    expect(item.slots[2].status).toBe("missing");
  });

  it("persists uploaded image targeting specific choice slot without affecting other slots", async () => {
    const { repository, channel, episode } = await createTestEnv();

    const quiz = await repository.readQuiz(channel.channel_id, episode.episode_id);
    if (!quiz) throw new Error("Quiz not found");

    quiz.questions[0].layout_id = "visual_choices_three";
    quiz.questions[0].choices = [
      { id: "c1", text: "Mercury" },
      { id: "c2", text: "Venus" },
      { id: "c3", text: "Earth" },
    ];
    await repository.writeQuiz(channel.channel_id, episode.episode_id, quiz);

    // Upload to Choice B (slotId: "c2")
    const { item, invalidated } = await repository.saveUploadedQuestionImage(
      channel.channel_id,
      episode.episode_id,
      1,
      VALID_PNG_BUFFER,
      "custom_venus.png",
      { slotId: "c2" },
    );

    expect(Array.isArray(invalidated)).toBe(true);
    expect(item.slots.length).toBe(3);

    // Choice B should now be user_uploaded
    expect(item.slots[1].slot_id).toBe("c2");
    expect(item.slots[1].status).toBe("user_uploaded");
    expect(item.slots[1].user_selected).toBe(true);
    expect(item.slots[1].source).toBe("explicit_episode");
    expect(item.slots[1].image_url).toContain("slotId=c2");

    // Choices A & C remain missing
    expect(item.slots[0].status).toBe("missing");
    expect(item.slots[2].status).toBe("missing");

    // Delete uploaded image for Choice B
    const { item: resetItem } = await repository.deleteUploadedQuestionImage(
      channel.channel_id,
      episode.episode_id,
      1,
      { slotId: "c2" },
    );

    expect(resetItem.slots[1].status).toBe("missing");
    expect(resetItem.slots[1].user_selected).toBe(false);
  });
});
