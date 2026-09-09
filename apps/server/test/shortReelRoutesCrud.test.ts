import { describe, expect, it } from "vitest";
import type { CancelShortReelResponse, ConfirmShortReelTopicResponse, GetShortReelResponse, ListShortReelsResponse } from "@studio/shared";
import {
  buildShortReelTopicCandidate,
  buildTestApp,
  createSampleBankQuestion,
  createTestChannel,
  createTestReel,
  createTestRoot,
  seedTopicRunWithReel,
} from "./shortReelRoutesTestUtils.js";

describe("Short-Reel HTTP Routes and Confirmation Discrimination", () => {
  it("confirms a Short-Reel candidate and returns 201 with content_kind short_reel", async () => {
    const root = await createTestRoot();
    const app = await buildTestApp(root);

    try {
      const channel = await createTestChannel(app, "Predator Channel");

      await app.repository.saveQuestionBankQuestion(createSampleBankQuestion("bank-jaguar-lion-01", "versus_faceoff"));

      const shortReelTopic = buildShortReelTopicCandidate({
        channelId: channel.channel_id,
        topicId: "topic-reel-predators-1",
        title: "Jaguar vs Lion Bite Force",
        archetype: "versus_faceoff",
        questionId: "bank-jaguar-lion-01",
      });

      const ep1 = {
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
      } as const;
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
    const app = await buildTestApp(root);

    try {
      const channelA = await createTestChannel(app, "Channel A");
      const channelB = await createTestChannel(app, "Channel B");

      await app.repository.saveQuestionBankQuestion(createSampleBankQuestion("bank-q-1", "versus_faceoff"));

      const shortReelTopic = {
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
      } as const;

      const dummyEp = {
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
      } as const;

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

  it("ignores forged client discriminator and prioritizes server topic content_kind", async () => {
    const root = await createTestRoot();
    const app = await buildTestApp(root);

    try {
      const channel = await createTestChannel(app, "Forged Discriminator Channel");

      await app.repository.saveQuestionBankQuestion(createSampleBankQuestion("bank-forged-01", "deep_trivia"));

      const shortReelTopic = await seedTopicRunWithReel({
        app,
        channelId: channel.channel_id,
        reelTopicId: "topic-reel-forged",
        reelArchetype: "deep_trivia",
      });

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
    const app = await buildTestApp(root);

    try {
      const channel = await createTestChannel(app, "Idempotent Channel");

      await app.repository.saveQuestionBankQuestion(createSampleBankQuestion("bank-idempotent-01", "versus_faceoff"));

      const shortReelTopic = await seedTopicRunWithReel({
        app,
        channelId: channel.channel_id,
        reelTopicId: "topic-reel-idempotent",
      });

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

  it("HTTP-04: restart while task pending reconciles orphan work without eternal spinner", async () => {
    const root = await createTestRoot();
    const app1 = await buildTestApp(root);
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
    const app2 = await buildTestApp(root);
    try {
      const restartedReel = await app2.repository.getShortReel({ channel_id: channelId, reel_id: reelId });
      // The orphaned pending attempt must have been reconciled to a terminal state (failed/cancelled), not left as pending!
      expect(restartedReel.units.script.state).not.toBe("pending");
      expect(["failed", "cancelled"]).toContain(restartedReel.units.script.state);
    } finally {
      await app2.close();
    }
  });

  it("stores a safe task failure instead of exposing a provider error", async () => {
    const root = await createTestRoot();
    const app = await buildTestApp(root);
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
});
