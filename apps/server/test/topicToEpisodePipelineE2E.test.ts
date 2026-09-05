import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildApp, type StudioApp } from "../src/app.js";
import type { BankQuestion, TopicCandidate } from "@studio/shared";

describe("Topic to Episode Pipeline E2E Bridge", () => {
  let app: StudioApp;
  let tempStorage: string;
  let testChannelId: string;
  let otherChannelId: string;

  beforeAll(async () => {
    let curr = process.cwd();
    while (curr !== path.dirname(curr)) {
      if (existsSync(path.join(curr, "pnpm-workspace.yaml"))) break;
      curr = path.dirname(curr);
    }
    app = await buildApp(curr);
    tempStorage = await mkdtemp(path.join(os.tmpdir(), "qb-pipeline-e2e-"));
    app.repository.setStorageRoot(tempStorage);

    const channel1 = await app.repository.createChannel({
      name: "History Mysteries Channel",
      language: "English",
    });
    testChannelId = channel1.channel_id;

    const channel2 = await app.repository.createChannel({
      name: "Other Channel",
      language: "English",
    });
    otherChannelId = channel2.channel_id;
  });

  afterAll(async () => {
    await app.close();
    if (tempStorage) {
      await rm(tempStorage, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
    }
  });

  it("confirms a topic creating an episode with pre-populated quiz.json in retention arc order", async () => {
    // 1. Seed 3 questions in Question Bank with distinct difficulties
    const seedQ1: BankQuestion = {
      id: "E2E-HIST-001",
      archetype_id: "deep_trivia",
      domain_id: "history_ancient",
      subtopic_id: "roman_empire",
      question: "Which color dye was so expensive in ancient Rome that only emperors could wear full robes of it?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Tyrian Purple", is_correct: true },
        { id: "B", text: "Egyptian Blue", is_correct: false },
        { id: "C", text: "Spartan Red", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Tyrian purple was harvested from thousands of sea snails and worth more than gold.",
      fun_fact: "A single pound of Tyrian purple dye required crushing 60,000 snails.",
      difficulty: 1, // Hook (diff 1)
      visual_spec: { prompt: "Cinematic shot of ancient Roman emperor in luxurious purple robes", intent: "question_illustration" },
      status: "approved",
      language: "en",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const seedQ2: BankQuestion = {
      id: "E2E-HIST-002",
      archetype_id: "deep_trivia",
      domain_id: "history_ancient",
      subtopic_id: "roman_empire",
      question: "Approximately how many miles of paved roads did the Roman Empire construct at its height?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "15,000 miles", is_correct: false },
        { id: "B", text: "50,000 miles", is_correct: true },
        { id: "C", text: "120,000 miles", is_correct: false },
      ],
      correct_choice_id: "B",
      explanation: "The Romans constructed over 50,000 miles of stone-paved highways linking all provinces.",
      difficulty: 3, // Challenge (diff 3)
      visual_spec: { prompt: "Stone-paved Roman military road cutting through rolling green hills", intent: "question_illustration" },
      status: "approved",
      language: "en",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const seedQ3: BankQuestion = {
      id: "E2E-HIST-003",
      archetype_id: "deep_trivia",
      domain_id: "history_ancient",
      subtopic_id: "roman_empire",
      question: "Which erratic Roman emperor notoriously ordered his soldiers to collect seashells as spoils of war from Neptune?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Nero", is_correct: false },
        { id: "B", text: "Caligula", is_correct: true },
        { id: "C", text: "Commodus", is_correct: false },
      ],
      correct_choice_id: "B",
      explanation: "Caligula marched his legions to the English Channel and commanded them to gather seashells.",
      fun_fact: "He proclaimed the sea shells as the spoils of the conquered ocean.",
      difficulty: 5, // Climax (diff 5)
      visual_spec: { prompt: "Roman legionaries gathering seashells on the beach under imperial orders", intent: "question_illustration" },
      status: "approved",
      language: "en",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await app.repository.saveQuestionBankQuestion(seedQ1);
    await app.repository.saveQuestionBankQuestion(seedQ2);
    await app.repository.saveQuestionBankQuestion(seedQ3);

    // 2. Setup topic candidate with matching archetype and domain
    const topic: TopicCandidate = {
      topic_id: "topic-rome-mysteries",
      channel_id: testChannelId,
      title: "Secrets of the Roman Empire (Shorts)",
      premise: "Mind-blowing facts and trivia about ancient Rome that will leave you stunned.",
      why_it_fits: "High engagement historical trivia tailored for quick video retention.",
      hook: "Did you know Roman emperors declared war on the sea?",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 3,
      domain_id: "history_ancient",
      subtopic_id: "roman_empire",
      archetype: "deep_trivia",
      suggested_layout: "media_left_choices_right",
    };

    await app.repository.saveTopicRun(testChannelId, [
      topic,
      { ...topic, topic_id: "topic-rome-2", title: "Rome 2" },
      { ...topic, topic_id: "topic-rome-3", title: "Rome 3" },
      { ...topic, topic_id: "topic-rome-4", title: "Rome 4" },
      { ...topic, topic_id: "topic-rome-5", title: "Rome 5" },
    ]);

    // 3. Confirm the topic via REST API
    const response = await app.server.inject({
      method: "POST",
      url: `/api/channels/${testChannelId}/topics/${topic.topic_id}/confirm`,
      payload: {
        topic_id: topic.topic_id,
        question_count: 3,
        auto_start_pipeline: true,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();

    // Verify root return contract
    expect(body.episode).toBeDefined();
    expect(body.quiz).toBeDefined();
    expect(body.director_plan).toBeDefined();
    expect(body.curated_source).toBe("bank_only");
    expect(body.question_ids).toHaveLength(3);
    expect(body.cooldown_recorded).toBe(true);
    expect(body.task).toBeDefined();
    expect(body.task.task_type).toBe("GENERATE_PIPELINE");

    // Verify episode configuration
    const ep = body.episode;
    expect(ep.quiz_config.question_count).toBe(3);
    expect(ep.quiz_config.archetype).toBe("deep_trivia");
    expect(ep.quiz_config.target_layout).toBe("media_left_choices_right");
    expect(ep.quiz_config.render_aspect_ratio).toBe("9:16");

    // 4. Verify quiz.json on disk contains 3 questions in retention arc order
    const storedQuiz = await app.repository.readQuiz(testChannelId, ep.episode_id);
    expect(storedQuiz).toBeDefined();
    expect(storedQuiz!.questions).toHaveLength(3);

    // Sequential numbering
    expect(storedQuiz!.questions[0].number).toBe(1);
    expect(storedQuiz!.questions[1].number).toBe(2);
    expect(storedQuiz!.questions[2].number).toBe(3);

    // 3-Act Retention Arc: Slot 1 (Hook: diff <= 2), Slot 2 (Challenge: diff 2-3), Slot 3 (Climax: diff 4-5)
    expect(storedQuiz!.questions[0].difficulty).toBeLessThanOrEqual(2);
    expect(storedQuiz!.questions[1].difficulty).toBeGreaterThanOrEqual(2);
    expect(storedQuiz!.questions[1].difficulty).toBeLessThanOrEqual(4);
    expect(storedQuiz!.questions[2].difficulty).toBeGreaterThanOrEqual(4);

    expect(storedQuiz!.questions[0].id).toBe("E2E-HIST-001");
    expect(storedQuiz!.questions[1].id).toBe("E2E-HIST-002");
    expect(storedQuiz!.questions[2].id).toBe("E2E-HIST-003");

    // 5. Verify director_plan.json on disk
    const storedDirector = await app.repository.readDirectorPlan(testChannelId, ep.episode_id);
    expect(storedDirector).toBeDefined();
    expect(storedDirector!.beats).toHaveLength(3);
    expect(storedDirector!.beats[0].layout_id).toBe("media_left_choices_right");
    expect(storedDirector!.beats[0].question_id).toBe(storedQuiz!.questions[0].id);
    expect(storedDirector!.beats[1].question_id).toBe(storedQuiz!.questions[1].id);
    expect(storedDirector!.beats[2].question_id).toBe(storedQuiz!.questions[2].id);

    // 6. Verify 30-day channel cooldown was recorded for all 3 questions
    const cooldownQuery = await app.repository.queryQuestionBankQuestions({
      channelId: testChannelId,
    });

    const cooldownMap = new Map(cooldownQuery.questions.map((q) => [q.id, q.channel_cooldown]));
    expect(cooldownMap.get("E2E-HIST-001")?.is_cooldown).toBe(true);
    expect(cooldownMap.get("E2E-HIST-001")?.days_remaining).toBeGreaterThanOrEqual(29);
    expect(cooldownMap.get("E2E-HIST-002")?.is_cooldown).toBe(true);
    expect(cooldownMap.get("E2E-HIST-003")?.is_cooldown).toBe(true);

    // Verify other channel does NOT have cooldown
    const otherQuery = await app.repository.queryQuestionBankQuestions({
      channelId: otherChannelId,
    });
    const otherMap = new Map(otherQuery.questions.map((q) => [q.id, q.channel_cooldown]));
    expect(otherMap.get("E2E-HIST-001")?.is_cooldown).toBe(false);
  });

  it("submits a PIPELINE task when auto_start_pipeline is true, and skips when false", async () => {
    const topic: TopicCandidate = {
      topic_id: "topic-pipeline-toggle",
      channel_id: testChannelId,
      title: "Pipeline Submission Check",
      premise: "Verifies autonomous pipeline start behavior.",
      why_it_fits: "Pipeline test.",
      hook: "Ready to auto start?",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 3,
      domain_id: "science_space",
      archetype: "speed_blitz",
    };

    await app.repository.saveTopicRun(testChannelId, [
      topic,
      { ...topic, topic_id: "topic-toggle-2", title: "Toggle 2" },
      { ...topic, topic_id: "topic-toggle-3", title: "Toggle 3" },
      { ...topic, topic_id: "topic-toggle-4", title: "Toggle 4" },
      { ...topic, topic_id: "topic-toggle-5", title: "Toggle 5" },
    ]);

    // Test with auto_start_pipeline: false
    const resNoPipeline = await app.server.inject({
      method: "POST",
      url: `/api/channels/${testChannelId}/topics/${topic.topic_id}/confirm`,
      payload: {
        topic_id: topic.topic_id,
        auto_start_pipeline: false,
      },
    });

    expect(resNoPipeline.statusCode).toBe(201);
    expect(resNoPipeline.json().task).toBeNull();

    // Test with auto_start_pipeline: true (default)
    const topic2 = { ...topic, topic_id: "topic-toggle-2", title: "Auto Pipeline Active" };
    const resWithPipeline = await app.server.inject({
      method: "POST",
      url: `/api/channels/${testChannelId}/topics/${topic2.topic_id}/confirm`,
      payload: {
        topic_id: topic2.topic_id,
        auto_start_pipeline: true,
      },
    });

    expect(resWithPipeline.statusCode).toBe(201);
    const body = resWithPipeline.json();
    expect(body.task).not.toBeNull();
    expect(body.task.task_type).toBe("GENERATE_PIPELINE");
    expect(body.task.channel_id).toBe(testChannelId);
    expect(body.task.episode_id).toBe(body.episode.episode_id);
  });

  it("handles JIT fallback when Question Bank has no pre-existing candidates", async () => {
    const topic: TopicCandidate = {
      topic_id: "topic-jit-fallback-test",
      channel_id: testChannelId,
      title: "Mystery Creature Identification",
      premise: "Guess the creature behind the dark silhouette.",
      why_it_fits: "High engagement silhouette mystery.",
      hook: "Can you guess what creature this is before the laser reveals it?",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 3,
      domain_id: "nature_animals",
      subtopic_id: "deep_sea",
      archetype: "mystery_reveal",
      suggested_layout: "mystery_reveal",
    };

    await app.repository.saveTopicRun(testChannelId, [
      topic,
      { ...topic, topic_id: "topic-jit-2", title: "Jit 2" },
      { ...topic, topic_id: "topic-jit-3", title: "Jit 3" },
      { ...topic, topic_id: "topic-jit-4", title: "Jit 4" },
      { ...topic, topic_id: "topic-jit-5", title: "Jit 5" },
    ]);

    const res = await app.server.inject({
      method: "POST",
      url: `/api/channels/${testChannelId}/topics/${topic.topic_id}/confirm`,
      payload: {
        topic_id: topic.topic_id,
        auto_start_pipeline: false,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();

    // Sourced via JIT fallback
    expect(body.curated_source).toBe("jit_only");
    expect(body.quiz.questions).toHaveLength(3);
    expect(body.director_plan.beats[0].layout_id).toBe("mystery_reveal");
    expect(body.director_plan.beats[0].archetype).toBe("mystery_reveal");
    expect(body.director_plan.beats[0].asset_intents).toContain("answer_reveal");
  });
});
