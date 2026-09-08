import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import {
  BankQuestionSchema,
  type BankQuestion,
  type CancelShortReelResponse,
  type Channel,
  type ConfirmShortReelTopicResponse,
  type EpisodeTopicCandidate,
  type GenerateShortReelResponse,
  type GetShortReelResponse,
  type ListShortReelsResponse,
  type ShortReelRecord,
  type ShortReelTopicCandidate,
} from "@studio/shared";
import Fastify from "fastify";
import { buildApp, type StudioApp } from "../src/app.js";
import { registerShortReelsRoutes } from "../src/routes/shortReels.js";
import { createStubQuizLlmClient } from "./helpers/stubQuizLlmClient.js";
import type { TaskManager } from "../src/tasks/manager.js";

async function createTestImageBuffer(width: number, height: number, color: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { ...color, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {})),
  );
});

async function createTestRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "short-reel-routes-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
  return root;
}

function createSampleBankQuestion(id: string, archetypeId: "versus_faceoff" | "deep_trivia"): BankQuestion {
  const choices =
    archetypeId === "deep_trivia"
      ? [
          { id: "A", text: "Jaguar", is_correct: true },
          { id: "B", text: "Lion", is_correct: false },
          { id: "C", text: "Tiger", is_correct: false },
        ]
      : [
          { id: "A", text: "Jaguar", is_correct: true },
          { id: "B", text: "Lion", is_correct: false },
        ];

  return BankQuestionSchema.parse({
    id,
    archetype_id: archetypeId,
    domain_id: "nature_animals",
    subtopic_id: "predators",
    language: "en",
    question: "Which predator has a stronger bite: Jaguar or Lion?",
    format: "multiple_choice",
    choices,
    correct_choice_id: "A",
    explanation: "Jaguars possess an exceptionally powerful bite force relative to their size.",
    status: "approved",
    age_band: "family",
    difficulty: 2,
    thinking_seconds: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

describe("Short-Reel HTTP Routes and Confirmation Discrimination", () => {
  it("confirms a Short-Reel candidate and returns 201 with content_kind short_reel", async () => {
    const root = await createTestRoot();
    const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });

    try {
      const channel = await app.repository.createChannel({
        name: "Predator Channel",
        description: "Predator comparisons",
        target_audience: "General",
        language: "en",
        market: "US",
        dna_mode: "example",
      });

      await app.repository.saveQuestionBankQuestion(createSampleBankQuestion("bank-jaguar-lion-01", "versus_faceoff"));

      const shortReelTopic: ShortReelTopicCandidate = {
        topic_id: "topic-reel-predators-1",
        channel_id: channel.channel_id,
        content_kind: "short_reel",
        origin: "discovery",
        title: "Jaguar vs Lion Bite Force",
        premise: "Comparing feline bite strengths",
        why_it_fits: "Engaging matchup",
        hook: "Can a jaguar crack turtle shells with one bite?",
        estimated_potential: "Viral",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 1,
        aspect_ratio: "9:16",
        archetype: "versus_faceoff",
      };

      const ep1: EpisodeTopicCandidate = {
        topic_id: "ep-1",
        channel_id: channel.channel_id,
        content_kind: "episode",
        origin: "discovery",
        title: "Ep 1",
        premise: "P1",
        why_it_fits: "W1",
        hook: "H1",
        estimated_potential: "Medium",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 5,
        quiz_format: "multiple_choice",
        age_band: "family",
        visual_style: "flat_vector",
        archetype: "deep_trivia",
      };
      const ep2 = { ...ep1, topic_id: "ep-2" };
      const ep3 = { ...ep1, topic_id: "ep-3" };
      const reel2 = { ...shortReelTopic, topic_id: "topic-reel-2" };

      await app.repository.saveTopicRun(channel.channel_id, [ep1, ep2, ep3, shortReelTopic, reel2]);

      // Confirm with typical TopicCard payload
      const response = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${shortReelTopic.topic_id}/confirm`,
        payload: {
          topic_id: "ignored-by-route",
          question_count: 1,
          visual_style: "mixed",
          auto_start_pipeline: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json<ConfirmShortReelTopicResponse>();
      expect(body.content_kind).toBe("short_reel");
      expect(body.short_reel).toBeDefined();
      expect(body.short_reel.reel_id).toMatch(/^sreel_/);
      expect(body.short_reel.aspect_ratio).toBe("9:16");
      expect(body.short_reel.topic_id).toBe(shortReelTopic.topic_id);
      expect(body.short_reel.source.question_id).toBe("bank-jaguar-lion-01");

      // Verify topic projection
      const topics = await app.repository.listTopics(channel.channel_id);
      const confirmedTopic = topics.find((t) => t.topic_id === shortReelTopic.topic_id);
      expect(confirmedTopic?.selected).toBe(true);

      // Verify list endpoint
      const listResponse = await app.server.inject({
        method: "GET",
        url: `/api/channels/${channel.channel_id}/short-reels`,
      });
      expect(listResponse.statusCode).toBe(200);
      const listBody = listResponse.json<ListShortReelsResponse>();
      expect(listBody.short_reels).toHaveLength(1);
      expect(listBody.short_reels[0].reel_id).toBe(body.short_reel.reel_id);

      // Verify get detail endpoint
      const detailResponse = await app.server.inject({
        method: "GET",
        url: `/api/channels/${channel.channel_id}/short-reels/${body.short_reel.reel_id}`,
      });
      expect(detailResponse.statusCode).toBe(200);
      expect(detailResponse.json<GetShortReelResponse>().short_reel.reel_id).toBe(body.short_reel.reel_id);
    } finally {
      await app.close();
    }
  });

  it("rejects cross-channel confirmation with 404", async () => {
    const root = await createTestRoot();
    const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });

    try {
      const channelA = await app.repository.createChannel({
        name: "Channel A",
        description: "A",
        target_audience: "General",
        language: "en",
        market: "US",
        dna_mode: "example",
      });
      const channelB = await app.repository.createChannel({
        name: "Channel B",
        description: "B",
        target_audience: "General",
        language: "en",
        market: "US",
        dna_mode: "example",
      });

      await app.repository.saveQuestionBankQuestion(createSampleBankQuestion("bank-q-1", "versus_faceoff"));

      const shortReelTopic: ShortReelTopicCandidate = {
        topic_id: "topic-channel-a",
        channel_id: channelA.channel_id,
        content_kind: "short_reel",
        origin: "discovery",
        title: "Title A",
        premise: "Premise A",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 1,
        aspect_ratio: "9:16",
        archetype: "versus_faceoff",
      };

      const dummyEp: EpisodeTopicCandidate = {
        topic_id: "ep-dummy",
        channel_id: channelA.channel_id,
        content_kind: "episode",
        origin: "discovery",
        title: "Ep Dummy",
        premise: "P",
        why_it_fits: "W",
        hook: "H",
        estimated_potential: "Medium",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 5,
        quiz_format: "multiple_choice",
        age_band: "family",
        visual_style: "flat_vector",
        archetype: "deep_trivia",
      };

      await app.repository.saveTopicRun(channelA.channel_id, [
        dummyEp,
        { ...dummyEp, topic_id: "ep-dummy-2" },
        { ...dummyEp, topic_id: "ep-dummy-3" },
        shortReelTopic,
        { ...shortReelTopic, topic_id: "reel-dummy-2" },
      ]);

      // Attempt to confirm Topic A through Channel B URL
      const response = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channelB.channel_id}/topics/${shortReelTopic.topic_id}/confirm`,
        payload: { question_count: 1 },
      });

      expect(response.statusCode).toBe(404);

      // Verify no reels or episodes created in channel B
      const listReelsB = await app.repository.listShortReels(channelB.channel_id);
      expect(listReelsB).toHaveLength(0);
    } finally {
      await app.close();
    }
  });

  it("returns 404 for non-existent topic ID", async () => {
    const root = await createTestRoot();
    const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });

    try {
      const channel = await app.repository.createChannel({
        name: "Missing Topic Channel",
        description: "",
        target_audience: "General",
        language: "en",
        market: "US",
        dna_mode: "example",
      });

      const response = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/non-existent-topic-id/confirm`,
        payload: { question_count: 1 },
      });

      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });

  it("rejects invalid question_count for Short-Reel topic with 400 Bad Request", async () => {
    const root = await createTestRoot();
    const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });

    try {
      const channel = await app.repository.createChannel({
        name: "Conflicting Count Channel",
        description: "",
        target_audience: "General",
        language: "en",
        market: "US",
        dna_mode: "example",
      });

      const shortReelTopic: ShortReelTopicCandidate = {
        topic_id: "topic-reel-count-conflict",
        channel_id: channel.channel_id,
        content_kind: "short_reel",
        origin: "discovery",
        title: "Conflicting Count Topic",
        premise: "Premise",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 1,
        aspect_ratio: "9:16",
        archetype: "versus_faceoff",
      };

      const dummyEp: EpisodeTopicCandidate = {
        topic_id: "ep-c-1",
        channel_id: channel.channel_id,
        content_kind: "episode",
        origin: "discovery",
        title: "Ep 1",
        premise: "P",
        why_it_fits: "W",
        hook: "H",
        estimated_potential: "Medium",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 5,
        quiz_format: "multiple_choice",
        age_band: "family",
        visual_style: "flat_vector",
        archetype: "deep_trivia",
      };

      await app.repository.saveTopicRun(channel.channel_id, [
        dummyEp,
        { ...dummyEp, topic_id: "ep-c-2" },
        { ...dummyEp, topic_id: "ep-c-3" },
        shortReelTopic,
        { ...shortReelTopic, topic_id: "reel-c-2" },
      ]);

      // Attempt sending question_count: 5 to a Short-Reel candidate
      const response = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${shortReelTopic.topic_id}/confirm`,
        payload: { question_count: 5 },
      });

      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it("ignores forged client discriminator and prioritizes server topic content_kind", async () => {
    const root = await createTestRoot();
    const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });

    try {
      const channel = await app.repository.createChannel({
        name: "Forged Discriminator Channel",
        description: "",
        target_audience: "General",
        language: "en",
        market: "US",
        dna_mode: "example",
      });

      await app.repository.saveQuestionBankQuestion(createSampleBankQuestion("bank-forged-01", "deep_trivia"));

      const shortReelTopic: ShortReelTopicCandidate = {
        topic_id: "topic-reel-forged",
        channel_id: channel.channel_id,
        content_kind: "short_reel",
        origin: "discovery",
        title: "Deep Trivia Reel",
        premise: "Premise",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 1,
        aspect_ratio: "9:16",
        archetype: "deep_trivia",
      };

      const dummyEp: EpisodeTopicCandidate = {
        topic_id: "ep-f-1",
        channel_id: channel.channel_id,
        content_kind: "episode",
        origin: "discovery",
        title: "Ep 1",
        premise: "P",
        why_it_fits: "W",
        hook: "H",
        estimated_potential: "Medium",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 5,
        quiz_format: "multiple_choice",
        age_band: "family",
        visual_style: "flat_vector",
        archetype: "deep_trivia",
      };

      await app.repository.saveTopicRun(channel.channel_id, [
        dummyEp,
        { ...dummyEp, topic_id: "ep-f-2" },
        { ...dummyEp, topic_id: "ep-f-3" },
        shortReelTopic,
        { ...shortReelTopic, topic_id: "reel-f-2" },
      ]);

      // Client passes content_kind: "episode" in payload attempting to forge episode confirmation
      const response = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${shortReelTopic.topic_id}/confirm`,
        payload: {
          content_kind: "episode",
          question_count: 1,
        },
      });

      // Must be handled as Short-Reel because the server-stored topic is short_reel
      expect(response.statusCode).toBe(201);
      const body = response.json<ConfirmShortReelTopicResponse>();
      expect(body.content_kind).toBe("short_reel");
      expect(body.short_reel).toBeDefined();
    } finally {
      await app.close();
    }
  });

  it("handles idempotent re-confirmation cleanly returning existing Short-Reel", async () => {
    const root = await createTestRoot();
    const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });

    try {
      const channel = await app.repository.createChannel({
        name: "Idempotent Channel",
        description: "",
        target_audience: "General",
        language: "en",
        market: "US",
        dna_mode: "example",
      });

      await app.repository.saveQuestionBankQuestion(createSampleBankQuestion("bank-idempotent-01", "versus_faceoff"));

      const shortReelTopic: ShortReelTopicCandidate = {
        topic_id: "topic-reel-idempotent",
        channel_id: channel.channel_id,
        content_kind: "short_reel",
        origin: "discovery",
        title: "Idempotent Reel",
        premise: "Premise",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 1,
        aspect_ratio: "9:16",
        archetype: "versus_faceoff",
      };

      const dummyEp: EpisodeTopicCandidate = {
        topic_id: "ep-i-1",
        channel_id: channel.channel_id,
        content_kind: "episode",
        origin: "discovery",
        title: "Ep 1",
        premise: "P",
        why_it_fits: "W",
        hook: "H",
        estimated_potential: "Medium",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 5,
        quiz_format: "multiple_choice",
        age_band: "family",
        visual_style: "flat_vector",
        archetype: "deep_trivia",
      };

      await app.repository.saveTopicRun(channel.channel_id, [
        dummyEp,
        { ...dummyEp, topic_id: "ep-i-2" },
        { ...dummyEp, topic_id: "ep-i-3" },
        shortReelTopic,
        { ...shortReelTopic, topic_id: "reel-i-2" },
      ]);

      const firstConfirm = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${shortReelTopic.topic_id}/confirm`,
        payload: { question_count: 1 },
      });
      expect(firstConfirm.statusCode).toBe(201);
      const firstReel = firstConfirm.json<ConfirmShortReelTopicResponse>().short_reel;

      // Second confirm call
      const secondConfirm = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${shortReelTopic.topic_id}/confirm`,
        payload: { question_count: 1 },
      });
      expect(secondConfirm.statusCode).toBe(201);
      const secondReel = secondConfirm.json<ConfirmShortReelTopicResponse>().short_reel;

      expect(secondReel.reel_id).toBe(firstReel.reel_id);
    } finally {
      await app.close();
    }
  });

  describe("HTTP-01 through HTTP-05: Phase 06 Endpoint Behaviors", () => {
    async function createTestReel(app: StudioApp): Promise<{ channel: Channel; reel: ShortReelRecord }> {
      const channel = await app.repository.createChannel({
        name: "Route Test Channel",
        description: "",
        target_audience: "General",
        language: "en",
        market: "US",
        dna_mode: "example",
      });

      await app.repository.saveQuestionBankQuestion(createSampleBankQuestion("bank-test-q-1", "versus_faceoff"));

      const shortReelTopic: ShortReelTopicCandidate = {
        topic_id: "topic-reel-test-1",
        channel_id: channel.channel_id,
        content_kind: "short_reel",
        origin: "discovery",
        title: "Route Test Reel",
        premise: "Premise",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 1,
        aspect_ratio: "9:16",
        archetype: "versus_faceoff",
      };

      const dummyEp: EpisodeTopicCandidate = {
        topic_id: "ep-dummy-1",
        channel_id: channel.channel_id,
        content_kind: "episode",
        origin: "discovery",
        title: "Ep 1",
        premise: "P",
        why_it_fits: "W",
        hook: "H",
        estimated_potential: "Medium",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 5,
        quiz_format: "multiple_choice",
        age_band: "family",
        visual_style: "flat_vector",
        archetype: "deep_trivia",
      };

      await app.repository.saveTopicRun(channel.channel_id, [
        dummyEp,
        { ...dummyEp, topic_id: "ep-dummy-2" },
        { ...dummyEp, topic_id: "ep-dummy-3" },
        shortReelTopic,
        { ...shortReelTopic, topic_id: "reel-dummy-2" },
      ]);

      const confirmResponse = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${shortReelTopic.topic_id}/confirm`,
        payload: { question_count: 1 },
      });

      expect(confirmResponse.statusCode).toBe(201);
      return { channel, reel: confirmResponse.json<ConfirmShortReelTopicResponse>().short_reel };
    }

    async function waitForTaskCompletion(tasks: TaskManager, taskId: string): Promise<void> {
      await new Promise<void>((resolve) => {
        const check = () => {
          const t = tasks.get(taskId);
          if (t && ["COMPLETED", "FAILED", "CANCELLED"].includes(t.status)) {
            tasks.off("event", onEvent);
            resolve();
          }
        };
        const onEvent = (event: { type?: string; task?: { task_id?: string } }) => {
          if (event?.type === "task.updated" && event?.task?.task_id === taskId) {
            check();
          }
        };
        tasks.on("event", onEvent);
        check();
      });
    }

    it("HTTP-01: rejects cross-channel access, invalid IDs/body, and non-existent records with typed status codes", async () => {
      const root = await createTestRoot();
      const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });

      try {
        const { channel: channelA, reel } = await createTestReel(app);
        const channelB = await app.repository.createChannel({
          name: "Channel B",
          description: "",
          target_audience: "General",
          language: "en",
          market: "US",
          dna_mode: "example",
        });

        // Cross-channel access to reel belongs to channel A through channel B path -> 404
        const crossChannelRes = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channelB.channel_id}/short-reels/${reel.reel_id}`,
        });
        expect(crossChannelRes.statusCode).toBe(404);
        const crossJson = crossChannelRes.json<{ error?: string; stack?: string }>();
        expect(crossJson.error).toBeDefined();
        expect(crossJson.stack).toBeUndefined();

        // Non-existent reel ID -> 404
        const notFoundRes = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channelA.channel_id}/short-reels/non-existent-reel`,
        });
        expect(notFoundRes.statusCode).toBe(404);

        // Malformed PATCH body -> 400
        const badPatchRes = await app.server.inject({
          method: "PATCH",
          url: `/api/channels/${channelA.channel_id}/short-reels/${reel.reel_id}`,
          payload: { invalid_field: 123 },
        });
        expect(badPatchRes.statusCode).toBe(400);

        // Invalid export revision query param -> 400
        const badExportRes = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channelA.channel_id}/short-reels/${reel.reel_id}/export?revision=invalid`,
        });
        expect(badExportRes.statusCode).toBe(400);

        // Export with non-ready package units -> 422
        const unreadyExportRes = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channelA.channel_id}/short-reels/${reel.reel_id}/export?revision=1`,
        });
        expect(unreadyExportRes.statusCode).toBe(422);
      } finally {
        await app.close();
      }
    });

    it("HTTP-02: double generate with same request ID returns 202 acknowledging the same task", async () => {
      const root = await createTestRoot();
      const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });

      try {
        const { channel, reel } = await createTestReel(app);

        // Configure mascot and cover mock for channel so package generation can complete
        const mascot = await app.repository.saveMascot({ name: "Route Mascot" });
        await app.repository.updateChannel(channel.channel_id, { mascot_id: mascot.id });
        const mascotBytes = await createTestImageBuffer(256, 256, { r: 10, g: 20, b: 30 });
        const styleBytes = await createTestImageBuffer(256, 256, { r: 40, g: 50, b: 60 });
        const mUrl = await app.repository.saveMascotAsset(mascot.id, "m.png", mascotBytes);
        const sUrl = await app.repository.saveMascotAsset(mascot.id, "s.png", styleBytes);
        await app.repository.saveMascot({
          ...mascot,
          master_image_url: mUrl,
          styles: [
            {
              id: "s1",
              name: "Style",
              keyword: "cinematic",
              anchor_image_url: sUrl,
              is_default: true,
              states: { thinking: [], celebrate: [] },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          active_style_id: "s1",
        });
        const coverPath = path.join(root, "cover-provider.png");
        const coverBuf = await createTestImageBuffer(1080, 1920, { r: 100, g: 150, b: 200 });
        await writeFile(coverPath, coverBuf);
        app.tasks.createImageProvider = () => ({
          generateReference: () => Promise.resolve({ asset_path: coverPath }),
        });

        // First generation call
        const firstGen = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reel.revision,
            request_id: "gen-req-001",
            target: "references",
          },
        });
        expect(firstGen.statusCode).toBe(202);
        const firstBody = firstGen.json<GenerateShortReelResponse>();
        expect(firstBody.task).toBeDefined();
        expect(firstBody.task.reel_id).toBe(reel.reel_id);
        expect(firstBody.task.episode_id).toBeNull();
        expect(firstBody.task.short_reel_request).toEqual({
          request_id: "gen-req-001",
          expected_revision: reel.revision,
          target: "references",
        });

        // Second generation call with the EXACT SAME request_id (replay)
        const secondGen = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reel.revision,
            request_id: "gen-req-001",
            target: "references",
          },
        });
        expect(secondGen.statusCode).toBe(202);
        const secondBody = secondGen.json<GenerateShortReelResponse>();
        // Acknowledges the identical task ID
        expect(secondBody.task.task_id).toBe(firstBody.task.task_id);

        await new Promise<void>((resolve) => {
          const check = () => {
            const task = app.tasks.get(firstBody.task.task_id);
            if (["COMPLETED", "FAILED", "CANCELLED"].includes(task.status)) {
              app.tasks.off("event", onEvent);
              resolve();
            }
          };
          const onEvent = () => check();
          app.tasks.on("event", onEvent);
          check();
        });
        expect(app.tasks.get(firstBody.task.task_id).status).toBe("COMPLETED");
        const generated = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        expect(generated.units.references.state).toBe("ready");
        expect(generated.units.script.state).toBe("missing");
        const reference = generated.units.references.last_accepted_payload?.references[0];
        expect(reference).toBeDefined();
        const assetResponse = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/assets/${reference?.asset_id}`,
        });
        expect(assetResponse.statusCode).toBe(200);
        expect(assetResponse.headers["content-type"]).toContain(reference?.mime_type);
        expect(assetResponse.rawPayload.length).toBeGreaterThan(0);

        const completedReplay = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: { expected_revision: reel.revision, request_id: "gen-req-001", target: "references" },
        });
        expect(completedReplay.statusCode).toBe(202);
        expect(completedReplay.json<GenerateShortReelResponse>().task.task_id).toBe(firstBody.task.task_id);
      } finally {
        await app.close();
      }
    });

    it("HTTP-03: stale PATCH revision returns 409 STALE_REVISION and preserves state", async () => {
      const root = await createTestRoot();
      const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });

      try {
        const { channel, reel } = await createTestReel(app);

        // PATCH with stale expected revision (999 instead of 1)
        const patchRes = await app.server.inject({
          method: "PATCH",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}`,
          payload: {
            expected_revision: 999,
            request_id: "patch-req-stale",
            command: {
              kind: "update_model_note",
              model_note: "This note should not be written",
            },
          },
        });

        expect(patchRes.statusCode).toBe(409);
        expect(["STALE_REVISION", "REVISION_CONFLICT"]).toContain(patchRes.json<{ code: string }>().code);

        // Verify stored reel is unchanged
        const checkRes = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}`,
        });
        expect(checkRes.statusCode).toBe(200);
        expect(checkRes.json<GetShortReelResponse>().short_reel.revision).toBe(1);
        expect(checkRes.json<GetShortReelResponse>().short_reel.model_note).not.toBe("This note should not be written");
      } finally {
        await app.close();
      }
    });

    it("HTTP-04: restart while task pending reconciles orphan work without eternal spinner", async () => {
      const root = await createTestRoot();
      const app1 = await buildApp(root, { llmClient: createStubQuizLlmClient() });
      let channelId!: string;
      let reelId!: string;

      try {
        const { channel, reel } = await createTestReel(app1);
        channelId = channel.channel_id;
        reelId = reel.reel_id;

        // Simulate an in-flight operation by submitting a task and beginning a unit attempt
        const { beginReelUnitAttempt } = await import("../src/shortReel/unitLifecycle.js");
        await beginReelUnitAttempt(app1.repository, { channel_id: channelId, reel_id: reelId }, "script", "op-orphan-123");

        // Verify it was marked pending
        const pendingReel = await app1.repository.getShortReel({ channel_id: channelId, reel_id: reelId });
        expect(pendingReel.units.script.state).toBe("pending");
      } finally {
        await app1.close();
      }

      // Simulate process restart by building a new app on the exact same root
      const app2 = await buildApp(root, { llmClient: createStubQuizLlmClient() });
      try {
        const restartedReel = await app2.repository.getShortReel({ channel_id: channelId, reel_id: reelId });
        // The orphaned pending attempt must have been reconciled to a terminal state (failed/cancelled), not left as pending!
        expect(restartedReel.units.script.state).not.toBe("pending");
        expect(["failed", "cancelled"]).toContain(restartedReel.units.script.state);
      } finally {
        await app2.close();
      }
    });

    it("HTTP-05: POST cancel acknowledges cancellation and terminal state is updated", async () => {
      const root = await createTestRoot();
      const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });

      try {
        const { channel, reel } = await createTestReel(app);

        // Begin a unit attempt
        const { beginReelUnitAttempt } = await import("../src/shortReel/unitLifecycle.js");
        await beginReelUnitAttempt(app.repository, { channel_id: channel.channel_id, reel_id: reel.reel_id }, "cover", "op-cancel-test");

        // Verify pending
        const before = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        expect(before.units.cover.state).toBe("pending");

        // Submit and simulate a running task with AbortController
        const task = app.tasks.submit(
          "GENERATE_SHORT_REEL_PACKAGE",
          channel.channel_id,
          null,
          undefined,
          undefined,
          "op-cancel-test",
          reel.reel_id,
        );
        await app.tasks.update(task.task_id, { status: "RUNNING" });
        const abortCtrl = new AbortController();
        app.tasks.activeShortReelControllers.set(task.task_id, abortCtrl);

        // Call cancel route
        const cancelRes = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/cancel`,
          payload: {
            operation_id: "op-cancel-test",
            request_id: "cancel-req-001",
          },
        });

        expect(cancelRes.statusCode).toBe(200);
        const body = cancelRes.json<CancelShortReelResponse>();
        expect(body.acknowledged).toBe(true);
        expect(body.task).toBeDefined();
        expect(body.task?.status).toBe("CANCELLED");
        expect(body.short_reel.units.cover.state).toBe("cancelled");
        expect(abortCtrl.signal.aborted).toBe(true);
        expect(app.tasks.get(task.task_id).status).toBe("CANCELLED");
      } finally {
        await app.close();
      }
    });

    it("HTTP-05b: POST cancel with the task ID cancels its running task and pending units", async () => {
      const root = await createTestRoot();
      const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });

      try {
        const { channel, reel } = await createTestReel(app);

        const { beginReelUnitAttempt } = await import("../src/shortReel/unitLifecycle.js");
        await beginReelUnitAttempt(
          app.repository,
          { channel_id: channel.channel_id, reel_id: reel.reel_id },
          "script",
          "op-unit-internal-99",
        );

        const task = app.tasks.submit(
          "GENERATE_SHORT_REEL_PACKAGE",
          channel.channel_id,
          null,
          undefined,
          undefined,
          "gen-req-99",
          reel.reel_id,
        );
        await app.tasks.update(task.task_id, { status: "RUNNING" });
        const abortCtrl = new AbortController();
        app.tasks.activeShortReelControllers.set(task.task_id, abortCtrl);

        const cancelRes = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/cancel`,
          payload: {
            operation_id: task.task_id,
            request_id: "cancel-req-002",
          },
        });

        expect(cancelRes.statusCode).toBe(200);
        const body = cancelRes.json<CancelShortReelResponse>();
        expect(body.acknowledged).toBe(true);
        expect(body.task?.status).toBe("CANCELLED");
        expect(body.short_reel.units.script.state).toBe("cancelled");
        expect(abortCtrl.signal.aborted).toBe(true);
      } finally {
        await app.close();
      }
    });

    it("HTTP-05d: an unrelated operation ID cannot cancel a running reel task or sibling unit", async () => {
      const root = await createTestRoot();
      const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });

      try {
        const { channel, reel } = await createTestReel(app);
        const { beginReelUnitAttempt } = await import("../src/shortReel/unitLifecycle.js");
        await beginReelUnitAttempt(app.repository, { channel_id: channel.channel_id, reel_id: reel.reel_id }, "script", "owned-operation");
        const task = app.tasks.submit(
          "GENERATE_SHORT_REEL_PACKAGE",
          channel.channel_id,
          null,
          undefined,
          undefined,
          "owned-request",
          reel.reel_id,
        );
        await app.tasks.update(task.task_id, { status: "RUNNING" });

        const response = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/cancel`,
          payload: { operation_id: "unrelated-operation", request_id: "cancel-unrelated" },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json<CancelShortReelResponse>().acknowledged).toBe(false);
        expect(app.tasks.get(task.task_id).status).toBe("RUNNING");
        const unchanged = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        expect(unchanged.units.script.state).toBe("pending");
        await app.tasks.cancel(task.task_id);
      } finally {
        await app.close();
      }
    });

    it("HTTP-05c: Task runner aborts and respects CANCELLED status without completing", async () => {
      const root = await createTestRoot();
      const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });

      try {
        const { channel, reel } = await createTestReel(app);
        const task = app.tasks.submit(
          "GENERATE_SHORT_REEL_PACKAGE",
          channel.channel_id,
          null,
          undefined,
          undefined,
          "gen-req-100",
          reel.reel_id,
        );

        // Cancel the task immediately
        await app.tasks.cancel(task.task_id);
        expect(app.tasks.get(task.task_id).status).toBe("CANCELLED");

        // Running a cancelled task should not overwrite CANCELLED status
        await app.tasks.run(app.tasks.get(task.task_id));
        expect(app.tasks.get(task.task_id).status).toBe("CANCELLED");
        expect(app.tasks.activeShortReelControllers.has(task.task_id)).toBe(false);
      } finally {
        await app.close();
      }
    });

    it("stores a safe task failure instead of exposing a provider error", async () => {
      const root = await createTestRoot();
      const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });
      try {
        const { channel, reel } = await createTestReel(app);
        app.tasks.createImageProvider = () => ({
          generateReference: () => Promise.reject(new Error("provider-secret-token-123")),
        });
        const task = app.tasks.submitShortReel(channel.channel_id, reel.reel_id, {
          expected_revision: reel.revision,
          request_id: "safe-error-request",
          target: "cover",
        });
        await new Promise<void>((resolve) => {
          const listener = (event: { task?: { task_id: string; status: string } }) => {
            if (event.task?.task_id === task.task_id && event.task.status === "FAILED") {
              app.tasks.off("event", listener);
              resolve();
            }
          };
          app.tasks.on("event", listener);
        });
        expect(app.tasks.get(task.task_id).error).toBe("Image provider failed to generate a valid cover. Retry generation.");
        expect(app.tasks.get(task.task_id).error).not.toContain("provider-secret-token-123");
      } finally {
        await app.close();
      }
    });

    it("HTTP-06a: POST /generate with target: 'cover' regenerates cover specifically even if previously ready", async () => {
      const root = await createTestRoot();
      const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });

      try {
        const { channel, reel } = await createTestReel(app);

        // Setup mascot and cover provider
        const mascot = await app.repository.saveMascot({ name: "Cover Test Mascot" });
        await app.repository.updateChannel(channel.channel_id, { mascot_id: mascot.id });
        const mascotBytes = await createTestImageBuffer(256, 256, { r: 10, g: 20, b: 30 });
        const styleBytes = await createTestImageBuffer(256, 256, { r: 40, g: 50, b: 60 });
        const mUrl = await app.repository.saveMascotAsset(mascot.id, "m.png", mascotBytes);
        const sUrl = await app.repository.saveMascotAsset(mascot.id, "s.png", styleBytes);
        await app.repository.saveMascot({
          ...mascot,
          master_image_url: mUrl,
          styles: [
            {
              id: "s1",
              name: "Style",
              keyword: "cinematic",
              anchor_image_url: sUrl,
              is_default: true,
              states: { thinking: [], celebrate: [] },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          active_style_id: "s1",
        });
        const coverPath = path.join(root, "cover-test-provider.png");
        const coverBuf = await createTestImageBuffer(1080, 1920, { r: 100, g: 150, b: 200 });
        await writeFile(coverPath, coverBuf);
        app.tasks.createImageProvider = () => ({
          generateReference: () => Promise.resolve({ asset_path: coverPath }),
        });

        // 1. First cover generation
        const gen1 = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reel.revision,
            request_id: "gen-cover-req-1",
            target: "cover",
          },
        });
        expect(gen1.statusCode).toBe(202);
        const taskId1 = gen1.json<GenerateShortReelResponse>().task.task_id;
        await waitForTaskCompletion(app.tasks, taskId1);
        expect(app.tasks.get(taskId1).status).toBe("COMPLETED");

        const reelAfterFirst = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        expect(reelAfterFirst.units.cover.state).toBe("ready");
        expect(reelAfterFirst.units.cover.last_accepted_payload).toBeDefined();
        expect(reelAfterFirst.units.references.state).toBe("missing");
        expect(reelAfterFirst.units.script.state).toBe("missing");
        expect(reelAfterFirst.units.publishing.state).toBe("missing");

        // 2. Regenerate cover specifically even though it is already ready
        const gen2 = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reelAfterFirst.revision,
            request_id: "gen-cover-req-2",
            target: "cover",
          },
        });
        expect(gen2.statusCode).toBe(202);
        const taskId2 = gen2.json<GenerateShortReelResponse>().task.task_id;
        await waitForTaskCompletion(app.tasks, taskId2);
        expect(app.tasks.get(taskId2).status).toBe("COMPLETED");

        const reelAfterSecond = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        expect(reelAfterSecond.units.cover.state).toBe("ready");
        expect(reelAfterSecond.units.cover.last_accepted_payload).toBeDefined();
        expect(reelAfterSecond.revision).toBeGreaterThan(reelAfterFirst.revision);
        // Ensure other units remained untouched
        expect(reelAfterSecond.units.references.state).toBe("missing");
        expect(reelAfterSecond.units.script.state).toBe("missing");
        expect(reelAfterSecond.units.publishing.state).toBe("missing");
      } finally {
        await app.close();
      }
    });

    it("HTTP-06b: POST /generate with target: 'references' resolves references specifically", async () => {
      const root = await createTestRoot();
      const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });

      try {
        const { channel, reel } = await createTestReel(app);

        // Setup mascot
        const mascot = await app.repository.saveMascot({ name: "References Mascot" });
        await app.repository.updateChannel(channel.channel_id, { mascot_id: mascot.id });
        const mascotBytes = await createTestImageBuffer(256, 256, { r: 10, g: 20, b: 30 });
        const styleBytes = await createTestImageBuffer(256, 256, { r: 40, g: 50, b: 60 });
        const mUrl = await app.repository.saveMascotAsset(mascot.id, "m.png", mascotBytes);
        const sUrl = await app.repository.saveMascotAsset(mascot.id, "s.png", styleBytes);
        await app.repository.saveMascot({
          ...mascot,
          master_image_url: mUrl,
          styles: [
            {
              id: "s1",
              name: "Style",
              keyword: "cinematic",
              anchor_image_url: sUrl,
              is_default: true,
              states: { thinking: [], celebrate: [] },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          active_style_id: "s1",
        });

        const gen = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reel.revision,
            request_id: "gen-ref-001",
            target: "references",
          },
        });
        expect(gen.statusCode).toBe(202);
        const taskId = gen.json<GenerateShortReelResponse>().task.task_id;
        await waitForTaskCompletion(app.tasks, taskId);
        expect(app.tasks.get(taskId).status).toBe("COMPLETED");

        const reloaded = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        expect(reloaded.units.references.state).toBe("ready");
        expect(reloaded.units.references.last_accepted_payload?.references.length).toBeGreaterThan(0);
        expect(reloaded.units.script.state).toBe("missing");
        expect(reloaded.units.cover.state).toBe("missing");
        expect(reloaded.units.publishing.state).toBe("missing");
      } finally {
        await app.close();
      }
    });

    it("HTTP-06c: POST /generate with target: 'publishing' generates publishing specifically", async () => {
      const root = await createTestRoot();
      const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });

      try {
        const { channel, reel } = await createTestReel(app);

        (app.tasks as { codex?: unknown }).codex = {
          connect: () => Promise.resolve(),
          generateContent: () =>
            Promise.resolve(
              JSON.stringify({
                hook: "Hook test",
                description: "Desc test",
                cta: "Comment below!",
                hashtags: ["#Shorts", "#Trivia"],
              }),
            ),
        };

        const gen = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reel.revision,
            request_id: "gen-pub-001",
            target: "publishing",
          },
        });
        expect(gen.statusCode).toBe(202);
        const taskId = gen.json<GenerateShortReelResponse>().task.task_id;
        await waitForTaskCompletion(app.tasks, taskId);
        expect(app.tasks.get(taskId).status).toBe("COMPLETED");

        const reloaded = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        expect(reloaded.units.publishing.state).toBe("ready");
        expect(reloaded.units.publishing.last_accepted_payload?.hook).toBe("Hook test");
        expect(reloaded.units.script.state).toBe("missing");
        expect(reloaded.units.references.state).toBe("missing");
        expect(reloaded.units.cover.state).toBe("missing");
      } finally {
        await app.close();
      }
    });

    it("HTTP-06d: direct handler execution errors map to typed status codes without TaskManager", async () => {
      const root = await createTestRoot();
      const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });

      try {
        const { channel, reel } = await createTestReel(app);

        // Standalone server with routes registered WITHOUT TaskManager
        const standalone = Fastify();
        await standalone.register(
          registerShortReelsRoutes({
            repository: app.repository,
            logger: app.logger,
          }),
        );

        // Case 1: Channel has no mascot -> resolveReelReferences throws ReferenceError("MISSING_REFERENCE") -> 422
        const resMissingRef = await standalone.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reel.revision,
            request_id: "direct-ref-missing",
            target: "references",
          },
        });
        expect(resMissingRef.statusCode).toBe(422);
        const missingBody = resMissingRef.json<{ code: string; error?: string }>();
        expect(missingBody.code).toBe("MISSING_REFERENCE");
        expect(missingBody.error).toBeDefined();

        // Case 2: Channel has invalid mascot ID -> resolveReelReferences throws ReferenceError("INVALID_REFERENCE_PATH") -> 400
        await app.repository.updateChannel(channel.channel_id, { mascot_id: "invalid@mascot!id" });
        const reelAfterCase1 = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        const resInvalidPath = await standalone.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reelAfterCase1.revision,
            request_id: "direct-ref-invalid",
            target: "references",
          },
        });
        expect(resInvalidPath.statusCode).toBe(400);
        const invalidBody = resInvalidPath.json<{ code: string }>();
        expect(invalidBody.code).toBe("INVALID_REFERENCE_PATH");

        // Case 3: Cover generation without provider -> CoverGenerationError("PROVIDER_ERROR") -> 503
        const reelAfterCase2 = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        const resCoverProviderErr = await standalone.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reelAfterCase2.revision,
            request_id: "direct-cover-err",
            target: "cover",
          },
        });
        expect(resCoverProviderErr.statusCode).toBe(503);
        const coverErrBody = resCoverProviderErr.json<{ code: string }>();
        expect(coverErrBody.code).toBe("PROVIDER_ERROR");

        await standalone.close();
      } finally {
        await app.close();
      }
    });
  });
});
