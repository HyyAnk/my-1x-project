import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  BankQuestionSchema,
  hashBankQuestionSource,
  type BankQuestion,
  type TopicAvailabilityBatch,
  type TopicAvailability,
  type TopicRunResult,
} from "@studio/shared";
import { buildApp, type StudioApp } from "../src/app.js";

describe("Stage 5: Topic Batch Availability Route", () => {
  let app: StudioApp;
  let tempStorage: string;
  let testChannelId: string;
  let q1: BankQuestion;
  let q2: BankQuestion;
  let q3: BankQuestion;
  let q4: BankQuestion;

  function makeBankQuestion(id: string, overrides: Partial<BankQuestion> = {}): BankQuestion {
    return BankQuestionSchema.parse({
      id,
      format: "multiple_choice",
      archetype_id: "deep_trivia",
      domain_id: "science",
      subtopic_id: "animals",
      language: "en",
      status: "approved",
      age_band: "7-9",
      question: `Question text for ${id}`,
      explanation: `Explanation for ${id}`,
      choices: [
        { id: "c1", text: "Option A", is_correct: true },
        { id: "c2", text: "Option B", is_correct: false },
        { id: "c3", text: "Option C", is_correct: false },
      ],
      correct_choice_id: "c1",
      ...overrides,
    });
  }

  beforeAll(async () => {
    let curr = process.cwd();
    while (curr !== path.dirname(curr)) {
      if (existsSync(path.join(curr, "pnpm-workspace.yaml"))) break;
      curr = path.dirname(curr);
    }
    app = await buildApp(curr);
    tempStorage = await mkdtemp(path.join(os.tmpdir(), "topic-avail-route-test-"));
    await app.repository.setStorageRoot(tempStorage);

    const channel = await app.repository.createChannel({
      name: "Availability Test Channel",
      description: "Channel for testing topic availability endpoint",
      target_audience: "Everyone",
      language: "English",
      country: "US",
      market: "US",
      dna_mode: "ai",
    });
    testChannelId = channel.channel_id;

    // Seed questions into Question Bank
    q1 = makeBankQuestion("avail-q-1", { question: "What is the fastest animal on earth?" });
    q2 = makeBankQuestion("avail-q-2", { question: "Which planet has the most moons?" });
    q3 = makeBankQuestion("avail-q-3", { question: "What is the largest mammal?" });
    q4 = makeBankQuestion("avail-q-4", {
      format: "true_false",
      archetype_id: "versus_faceoff",
      question: "Is water composed of hydrogen and oxygen?",
      choices: [
        { id: "c1", text: "True", is_correct: true },
        { id: "c2", text: "False", is_correct: false },
      ],
    });

    await app.repository.saveQuestionBankQuestion(q1);
    await app.repository.saveQuestionBankQuestion(q2);
    await app.repository.saveQuestionBankQuestion(q3);
    await app.repository.saveQuestionBankQuestion(q4);
  });

  afterAll(async () => {
    await rm(tempStorage, { recursive: true, force: true }).catch(() => {});
  });

  it("returns batch availability for channel topics", async () => {
    const runResult: TopicRunResult = {
      run_id: "run-avail-test-1",
      target_episode_count: 1,
      target_short_reel_count: 1,
      shortages: [],
      candidates: [
        {
          slot_id: "slot-ep-1",
          topic_id: "top-ep-avail-1",
          channel_id: testChannelId,
          title: "Speed of Nature",
          premise: "Comparing animal speeds",
          why_it_fits: "Engaging science topic",
          hook: "Who is really the fastest?",
          estimated_potential: "High",
          generated_at: new Date().toISOString(),
          selected: false,
          origin: "discovery",
          content_kind: "episode",
          quiz_format: "multiple_choice",
          question_count: 3,
          age_band: "7-9",
          visual_style: "pixar_3d",
          archetype: "deep_trivia",
          source_bindings: [
            {
              source_question_id: q1.id,
              source_hash_version: 1,
              source_content_hash: hashBankQuestionSource(q1),
              projection_provenance: {
                source_variant: "native",
                resolved_language: "en",
                translation_key: null,
                translation_provenance: "native",
              },
            },
            {
              source_question_id: q2.id,
              source_hash_version: 1,
              source_content_hash: hashBankQuestionSource(q2),
              projection_provenance: {
                source_variant: "native",
                resolved_language: "en",
                translation_key: null,
                translation_provenance: "native",
              },
            },
            {
              source_question_id: q3.id,
              source_hash_version: 1,
              source_content_hash: hashBankQuestionSource(q3),
              projection_provenance: {
                source_variant: "native",
                resolved_language: "en",
                translation_key: null,
                translation_provenance: "native",
              },
            },
          ],
        },
        {
          slot_id: "slot-sr-1",
          topic_id: "top-sr-avail-1",
          channel_id: testChannelId,
          title: "Chemistry Faceoff",
          premise: "Fast science facts",
          why_it_fits: "Quick engaging hook",
          hook: "True or False?",
          estimated_potential: "High",
          generated_at: new Date().toISOString(),
          selected: false,
          origin: "discovery",
          content_kind: "short_reel",
          question_count: 1,
          aspect_ratio: "9:16",
          archetype: "versus_faceoff",
          source_bindings: [
            {
              source_question_id: q4.id,
              source_hash_version: 1,
              source_content_hash: hashBankQuestionSource(q4),
              projection_provenance: {
                source_variant: "native",
                resolved_language: "en",
                translation_key: null,
                translation_provenance: "native",
              },
            },
          ],
        },
      ],
    };

    await app.repository.saveTopicRun(testChannelId, runResult);

    const res = await app.server.inject({
      method: "GET",
      url: `/api/channels/${testChannelId}/topics/availability`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as TopicAvailabilityBatch;
    expect(body.scan_status).toBe("complete_nonempty");
    expect(body.snapshot_token).toBeDefined();
    expect(body.topics).toHaveLength(2);

    const epAvail = body.topics.find((t: TopicAvailability) => t.topic_id === "top-ep-avail-1");
    expect(epAvail).toBeDefined();
    expect(epAvail?.can_confirm).toBe(true);
    expect(epAvail?.reason_code).toBe("AVAILABLE");
    expect(epAvail?.source_capacity).toBe(3);

    const srAvail = body.topics.find((t: TopicAvailability) => t.topic_id === "top-sr-avail-1");
    expect(srAvail).toBeDefined();
    expect(srAvail?.can_confirm).toBe(true);
    expect(srAvail?.reason_code).toBe("AVAILABLE");
    expect(srAvail?.source_capacity).toBe(1);
  });

  it("identifies UNBOUND_LEGACY_TOPIC candidates correctly", async () => {
    const legacyRun = {
      run_id: "run-legacy-1",
      target_episode_count: 1,
      target_short_reel_count: 0,
      shortages: [],
      candidates: [
        {
          topic_id: "top-legacy-unbound",
          channel_id: testChannelId,
          title: "Legacy Topic",
          premise: "Old topic without sources",
          why_it_fits: "Legacy fits",
          hook: "Old hook",
          estimated_potential: "Low",
          generated_at: new Date(Date.now() + 1000).toISOString(),
          selected: false,
          origin: "discovery",
          content_kind: "episode",
          quiz_format: "multiple_choice",
          question_count: 5,
          age_band: "7-9",
          visual_style: "mixed",
        },
      ],
    };

    await app.repository.saveTopicRun(testChannelId, legacyRun.candidates as unknown as any);

    const res = await app.server.inject({
      method: "GET",
      url: `/api/channels/${testChannelId}/topics/availability`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as TopicAvailabilityBatch;
    const legacyAvail = body.topics.find((t: TopicAvailability) => t.topic_id === "top-legacy-unbound");
    expect(legacyAvail).toBeDefined();
    expect(legacyAvail?.can_confirm).toBe(false);
    expect(legacyAvail?.reason_code).toBe("UNBOUND_LEGACY_TOPIC");
    expect(legacyAvail?.retryable).toBe(true);
    expect(legacyAvail?.recovery_action).toContain("Re-suggest");
  });

  it("identifies SOURCE_CHANGED when bound question content is modified", async () => {
    const modifiedQ1 = { ...q1, question: "What is the speed of sound?" };
    await app.repository.saveQuestionBankQuestion(modifiedQ1);

    const res = await app.server.inject({
      method: "GET",
      url: `/api/channels/${testChannelId}/topics/availability`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as TopicAvailabilityBatch;
    const epAvail = body.topics.find((t: TopicAvailability) => t.topic_id === "top-ep-avail-1");
    expect(epAvail).toBeDefined();
    expect(epAvail?.can_confirm).toBe(false);
    expect(epAvail?.reason_code).toBe("SOURCE_CHANGED");
    expect(epAvail?.source_capacity).toBe(0);
  });

  it("returns 404 when channel does not exist", async () => {
    const res = await app.server.inject({
      method: "GET",
      url: `/api/channels/non-existent-channel/topics/availability`,
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns NO_ELIGIBLE_SOURCES when bound question is not approved", async () => {
    const unapprovedQ = makeBankQuestion("q-unapproved", { status: "draft" });
    await app.repository.saveQuestionBankQuestion(unapprovedQ);

    const runWithUnapproved: TopicRunResult = {
      run_id: "run-unapproved-test",
      target_episode_count: 0,
      target_short_reel_count: 1,
      shortages: [],
      candidates: [
        {
          slot_id: "slot-sr-unapproved",
          topic_id: "top-sr-unapproved",
          channel_id: testChannelId,
          title: "Unapproved Question Topic",
          premise: "Test premise",
          why_it_fits: "Test fit",
          hook: "Test hook",
          estimated_potential: "Normal",
          generated_at: new Date(Date.now() + 2000).toISOString(),
          selected: false,
          origin: "discovery",
          content_kind: "short_reel",
          question_count: 1,
          aspect_ratio: "9:16",
          archetype: "versus_faceoff",
          source_bindings: [
            {
              source_question_id: unapprovedQ.id,
              source_hash_version: 1,
              source_content_hash: hashBankQuestionSource(unapprovedQ),
              projection_provenance: {
                source_variant: "native",
                resolved_language: "en",
                translation_key: null,
                translation_provenance: "native",
              },
            },
          ],
        },
      ],
    };

    await app.repository.saveTopicRun(testChannelId, runWithUnapproved);

    const res = await app.server.inject({
      method: "GET",
      url: `/api/channels/${testChannelId}/topics/availability`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as TopicAvailabilityBatch;
    const srAvail = body.topics.find((t: TopicAvailability) => t.topic_id === "top-sr-unapproved");
    expect(srAvail).toBeDefined();
    expect(srAvail?.can_confirm).toBe(false);
    expect(srAvail?.reason_code).toBe("NO_ELIGIBLE_SOURCES");
    expect(srAvail?.source_capacity).toBe(0);
  });
});
