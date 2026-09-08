import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  BankQuestionSchema,
  EpisodeTopicCandidateSchema,
  ShortReelTopicCandidateSchema,
  type BankQuestion,
  type Channel,
  type EpisodeTopicCandidate,
  type ShortReelTopicCandidate,
} from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import { parseTopicCandidates } from "../src/tasks/parsers.js";
import { selectShortReelQuestion } from "../src/shortReel/questionSelection.js";
import { confirmShortReelTopic } from "../src/shortReel/topicConfirmation.js";
import { createEpisodeFromTopicWithBank } from "../src/quiz/bank/questionBankToQuizBridge.js";
import { createStubQuizLlmClient } from "./helpers/stubQuizLlmClient.js";
import { planTopicSuggestionMatrix, type TopicMatrixPlan } from "../src/context/topicMatrixPlanner.js";
import type { TaskManager } from "../src/tasks.js";

const roots: string[] = [];

function assignPlanMetadata(rawOutput: string, plan: TopicMatrixPlan): string {
  const parsed = JSON.parse(rawOutput) as { candidates: Array<Record<string, unknown>> };
  parsed.candidates = parsed.candidates.map((candidate, index) => ({
    ...candidate,
    topic_id: `topic-${index + 1}`,
    content_kind: plan.slots[index].contentKind,
    archetype: plan.slots[index].archetype,
    domain_id: plan.slots[index].domainId,
  }));
  return JSON.stringify(parsed);
}

async function createTestRepository(): Promise<{ repo: RepositoryService; channel: Channel }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "short-reel-tp-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n\n- Channel name: Test\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
  const repo = new RepositoryService(root);
  await repo.ensureBootstrap();
  const channel = await repo.createChannel({
    name: "Short Reel Channel",
    description: "Channel for short reel testing",
    target_audience: "General",
    language: "en",
    market: "US",
    dna_mode: "example",
  });
  return { repo, channel };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true }).catch(() => {})));
});

describe("Phase 03: Mixed Topics And Bank Selection", () => {
  /**
   * TP-01: Mixed 3 Episode / 2 Short-Reel distribution from generator output.
   */
  it("TP-01: parses exactly 3 Episode and 2 Short-Reel candidates with validated discriminated schemas", () => {
    const rawOutput = JSON.stringify({
      candidates: [
        {
          title: "Deep Sea Giants",
          premise: "Exploring colossal creatures of the abyss",
          why_it_fits: "High viral potential",
          hook: "What lives 8,000 meters under the ocean?",
          estimated_potential: "High",
          archetype: "deep_trivia",
          domain_id: "nature_animals",
        },
        {
          title: "Shadow Creatures",
          premise: "Identify animals by their silhouettes",
          why_it_fits: "Visual curiosity",
          hook: "Can you guess this creature from its shadow?",
          estimated_potential: "Viral",
          archetype: "mystery_reveal",
          domain_id: "nature_animals",
        },
        {
          title: "Space Facts Or Fiction",
          premise: "Debunking common galaxy myths",
          why_it_fits: "Educational debunking",
          hook: "Is space completely silent?",
          estimated_potential: "High",
          archetype: "verdict_true_false",
          domain_id: "space_earth",
        },
        {
          title: "Lion vs Tiger Faceoff",
          premise: "Comparing strength and hunting style",
          why_it_fits: "Classic battle",
          hook: "Who would win in an apex encounter?",
          estimated_potential: "Viral",
          archetype: "versus_faceoff",
          domain_id: "nature_animals",
        },
        {
          title: "Speed of Light Trivia",
          premise: "Mind-bending speed trivia",
          why_it_fits: "Quick bite curiosity",
          hook: "How fast does photon travel across the solar system?",
          estimated_potential: "High",
          archetype: "deep_trivia",
          domain_id: "space_earth",
        },
      ],
    });

    const plan = planTopicSuggestionMatrix({});
    const candidates = parseTopicCandidates(assignPlanMetadata(rawOutput, plan), "ch_test_123", plan);

    expect(candidates).toHaveLength(5);

    // Distribution: exactly 3 Episode, 2 Short-Reel
    const episodeCandidates = candidates.filter((c) => c.content_kind === "episode");
    const shortReelCandidates = candidates.filter((c) => c.content_kind === "short_reel");

    expect(episodeCandidates).toHaveLength(3);
    expect(shortReelCandidates).toHaveLength(2);

    // Slots 1-3 (indices 0..2) are Episode
    expect(candidates[0].content_kind).toBe("episode");
    expect(candidates[1].content_kind).toBe("episode");
    expect(candidates[2].content_kind).toBe("episode");

    // Slots 4-5 (indices 3..4) are Short-Reel
    expect(candidates[3].content_kind).toBe("short_reel");
    expect(candidates[4].content_kind).toBe("short_reel");

    // Validate Episode schemas
    for (const ep of episodeCandidates) {
      const parsedEp = EpisodeTopicCandidateSchema.safeParse(ep);
      expect(parsedEp.success).toBe(true);
      if (parsedEp.success) {
        expect(parsedEp.data.content_kind).toBe("episode");
        expect(parsedEp.data.visual_style).toBeDefined();
        expect(parsedEp.data.quiz_format).toBeDefined();
        expect(parsedEp.data.age_band).toBeDefined();
      }
    }

    // Validate Short-Reel schemas
    for (const reel of shortReelCandidates) {
      const parsedReel = ShortReelTopicCandidateSchema.safeParse(reel);
      expect(parsedReel.success).toBe(true);
      if (parsedReel.success) {
        expect(parsedReel.data.content_kind).toBe("short_reel");
        expect(parsedReel.data.aspect_ratio).toBe("9:16");
        expect(parsedReel.data.question_count).toBe(1);
        expect(["versus_faceoff", "deep_trivia"]).toContain(parsedReel.data.archetype);
      }
    }
  });

  /**
   * TP-02: Slots 1 and 4 keyword-directed when hint present; discovery when no hint.
   */
  it("TP-02: steers Slot 1 (Episode) and Slot 4 (Short-Reel) when hint is provided, otherwise all discovery", () => {
    const rawOutput = JSON.stringify({
      candidates: [
        { title: "Topic 1", premise: "P1", why_it_fits: "W1", hook: "H1", archetype: "deep_trivia", estimated_potential: "High" },
        { title: "Topic 2", premise: "P2", why_it_fits: "W2", hook: "H2", archetype: "mystery_reveal", estimated_potential: "High" },
        { title: "Topic 3", premise: "P3", why_it_fits: "W3", hook: "H3", archetype: "verdict_true_false", estimated_potential: "High" },
        { title: "Topic 4", premise: "P4", why_it_fits: "W4", hook: "H4", archetype: "versus_faceoff", estimated_potential: "High" },
        { title: "Topic 5", premise: "P5", why_it_fits: "W5", hook: "H5", archetype: "deep_trivia", estimated_potential: "High" },
      ],
    });

    // 1. With topicHint provided
    const hintPlan = planTopicSuggestionMatrix({ topicHint: "Quantum Computing" });
    const withHint = parseTopicCandidates(assignPlanMetadata(rawOutput, hintPlan), "ch_test_123", hintPlan);
    expect(withHint).toHaveLength(5);

    // Slot 1 (Episode, index 0): keyword-steered
    expect(withHint[0].origin).toBe("keyword");
    expect(withHint[0].theme_hint).toBe("Quantum Computing");

    // Slot 2 & 3 (Episode, indices 1, 2): discovery
    expect(withHint[1].origin).toBe("discovery");
    expect(withHint[1].theme_hint).toBeUndefined();
    expect(withHint[2].origin).toBe("discovery");
    expect(withHint[2].theme_hint).toBeUndefined();

    // Slot 4 (Short-Reel, index 3): keyword-steered
    expect(withHint[3].origin).toBe("keyword");
    expect(withHint[3].theme_hint).toBe("Quantum Computing");

    // Slot 5 (Short-Reel, index 4): discovery
    expect(withHint[4].origin).toBe("discovery");
    expect(withHint[4].theme_hint).toBeUndefined();

    // 2. Without topicHint provided
    const discoveryPlan = planTopicSuggestionMatrix({});
    const withoutHint = parseTopicCandidates(assignPlanMetadata(rawOutput, discoveryPlan), "ch_test_123", discoveryPlan);
    expect(withoutHint).toHaveLength(5);
    for (const c of withoutHint) {
      expect(c.origin).toBe("discovery");
      expect(c.theme_hint).toBeUndefined();
    }
  });

  /**
   * TP-03: Content_kind routing without title heuristic effect.
   */
  it("TP-03: routes content_kind without title heuristic effect", async () => {
    const { repo, channel } = await createTestRepository();

    // Candidate A: Episode whose title includes "shorts"
    const episodeCandidate: EpisodeTopicCandidate = {
      topic_id: "topic_ep_shorts_title",
      channel_id: channel.channel_id,
      content_kind: "episode",
      origin: "discovery",
      title: "Science Shorts Quiz",
      premise: "Quick facts about physics",
      why_it_fits: "Fast overview",
      hook: "Did you know that lightning strikes 8 million times a day?",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 3,
      quiz_format: "multiple_choice",
      age_band: "family",
      visual_style: "flat_vector",
      archetype: "deep_trivia",
    };

    // Candidate B: Short-Reel whose title does NOT include "shorts"
    const reelCandidate: ShortReelTopicCandidate = {
      topic_id: "topic_reel_normal_title",
      channel_id: channel.channel_id,
      content_kind: "short_reel",
      origin: "discovery",
      title: "Ancient Rome vs Greece",
      premise: "Comparing warfare and culture",
      why_it_fits: "High curiosity",
      hook: "Which empire conquered more territory in 100 years?",
      estimated_potential: "Viral",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 1,
      aspect_ratio: "9:16",
      archetype: "versus_faceoff",
    };

    const dummyEp1: EpisodeTopicCandidate = { ...episodeCandidate, topic_id: "dummy_ep_1", title: "Dummy Ep 1" };
    const dummyEp2: EpisodeTopicCandidate = { ...episodeCandidate, topic_id: "dummy_ep_2", title: "Dummy Ep 2" };
    const dummyReel: ShortReelTopicCandidate = { ...reelCandidate, topic_id: "dummy_reel_1", title: "Dummy Reel 1" };

    await repo.saveTopicRun(channel.channel_id, [episodeCandidate, dummyEp1, dummyEp2, reelCandidate, dummyReel]);

    // Seed bank with approved question for Short-Reel
    const bankQuestion: BankQuestion = BankQuestionSchema.parse({
      id: "bank-versus-rome-01",
      archetype_id: "versus_faceoff",
      domain_id: "history",
      subtopic_id: "empires",
      language: "en",
      question: "Which empire was larger at its peak: Rome or Greece?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Rome", is_correct: true },
        { id: "B", text: "Greece", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "The Roman Empire encompassed over 5 million square kilometers.",
      status: "approved",
      age_band: "family",
      difficulty: 2,
      thinking_seconds: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await repo.saveQuestionBankQuestion(bankQuestion);

    // 1. Confirm Episode candidate whose title includes "shorts"
    const epResult = await createEpisodeFromTopicWithBank({
      repository: repo,
      tasks: { submit: () => null } as unknown as TaskManager,
      channelId: channel.channel_id,
      input: { topic_id: episodeCandidate.topic_id, auto_start_pipeline: false },
      llmClient: createStubQuizLlmClient(),
    });

    // Verify Episode stays 16:9 landscape, NOT forced into 9:16 portrait by the old "shorts" title heuristic
    expect(epResult.episode.quiz_config.render_aspect_ratio).toBe("16:9");

    // 2. Confirm Short-Reel candidate whose title does NOT include "shorts"
    const reelResult = await confirmShortReelTopic({
      repository: repo,
      channelId: channel.channel_id,
      topicId: reelCandidate.topic_id,
    });

    expect(reelResult.content_kind).toBe("short_reel");
    expect(reelResult.short_reel.aspect_ratio).toBe("9:16");
    expect(reelResult.short_reel.topic_id).toBe(reelCandidate.topic_id);
  });

  /**
   * TP-04: Bounded pagination queries past page 1 to locate eligible question.
   */
  it("TP-04: traverses past page 1 within bounded pagination to find eligible question", async () => {
    const eligibleQuestion: BankQuestion = BankQuestionSchema.parse({
      id: "bank-versus-eligible-page2",
      archetype_id: "versus_faceoff",
      domain_id: "animals",
      subtopic_id: "apex",
      language: "en",
      question: "Who is faster over 100 meters: Cheetah or Greyhound?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Cheetah", is_correct: true },
        { id: "B", text: "Greyhound", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Cheetahs reach up to 110 km/h.",
      status: "approved",
      age_band: "family",
      difficulty: 1,
      thinking_seconds: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Ineligible questions on page 1 (wrong archetype or not approved)
    const ineligible1: BankQuestion = {
      ...eligibleQuestion,
      id: "bank-ineligible-1",
      archetype_id: "deep_trivia",
    };
    const ineligible2: BankQuestion = {
      ...eligibleQuestion,
      id: "bank-ineligible-2",
      status: "draft",
    };

    let queriedPages = 0;
    const mockRepo = {
      queryQuestionBankQuestions: (params: { offset?: number; limit?: number }) => {
        queriedPages++;
        const offset = params.offset ?? 0;
        if (offset === 0) {
          return {
            questions: [
              { ...ineligible1, on_cooldown: false },
              { ...ineligible2, on_cooldown: false },
            ],
            total: 3,
          };
        }
        if (offset >= 2) {
          return {
            questions: [{ ...eligibleQuestion, on_cooldown: false }],
            total: 3,
          };
        }
        return { questions: [], total: 3 };
      },
    };

    const topic: ShortReelTopicCandidate = {
      topic_id: "t_reel_paginated",
      channel_id: "ch_1",
      content_kind: "short_reel",
      origin: "discovery",
      title: "Cheetah vs Greyhound",
      premise: "Speed showdown",
      why_it_fits: "Speed test",
      hook: "Who wins?",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 1,
      aspect_ratio: "9:16",
      archetype: "versus_faceoff",
    };

    const snapshot = await selectShortReelQuestion({
      topic,
      repository: mockRepo,
      pageSize: 2,
      maxPages: 5,
    });

    expect(queriedPages).toBeGreaterThanOrEqual(2);
    expect(snapshot.question_id).toBe("bank-versus-eligible-page2");
    expect(snapshot.translation_provenance).toBe("source");
  });

  /**
   * TP-05: Empty bank, archived question, unverified English translation return BANK_EMPTY without mutating bank.
   */
  it("TP-05: returns BANK_EMPTY for empty bank, archived questions, or unverified translations without mutating bank", async () => {
    const { repo, channel } = await createTestRepository();

    const topic: ShortReelTopicCandidate = {
      topic_id: "t_reel_empty",
      channel_id: channel.channel_id,
      content_kind: "short_reel",
      origin: "discovery",
      title: "Deep Ocean Legends",
      premise: "Unknown depths",
      why_it_fits: "High interest",
      hook: "What lurks below?",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 1,
      aspect_ratio: "9:16",
      archetype: "deep_trivia",
    };

    // 1. Empty bank returns BANK_EMPTY
    await expect(selectShortReelQuestion({ topic, repository: repo })).rejects.toMatchObject({
      code: "BANK_EMPTY",
    });

    // 2. Archived question returns BANK_EMPTY
    const archivedQuestion: BankQuestion = BankQuestionSchema.parse({
      id: "bank-q-archived",
      archetype_id: "deep_trivia",
      domain_id: "ocean",
      subtopic_id: "depths",
      language: "en",
      question: "How deep is the Mariana Trench?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "11,000m", is_correct: true },
        { id: "B", text: "5,000m", is_correct: false },
        { id: "C", text: "1,000m", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Around 11,000 meters deep.",
      status: "archived",
      age_band: "family",
      difficulty: 3,
      thinking_seconds: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await repo.saveQuestionBankQuestion(archivedQuestion);

    await expect(selectShortReelQuestion({ topic, repository: repo })).rejects.toMatchObject({
      code: "BANK_EMPTY",
    });

    // 3. Spanish question with UNVERIFIED English translation returns BANK_EMPTY
    const spanishWithUnverifiedEn: BankQuestion = BankQuestionSchema.parse({
      id: "bank-q-spanish-unverified",
      archetype_id: "deep_trivia",
      domain_id: "ocean",
      subtopic_id: "depths",
      language: "es",
      question: "¿Qué tan profunda es la fosa de las Marianas?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "11,000m", is_correct: true },
        { id: "B", text: "5,000m", is_correct: false },
        { id: "C", text: "1,000m", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Aproximadamente 11,000 metros.",
      status: "approved",
      age_band: "family",
      difficulty: 3,
      thinking_seconds: 5,
      translations: {
        en: {
          language: "en",
          question: "How deep is the Mariana Trench?",
          choices: [
            { id: "A", text: "11,000m" },
            { id: "B", text: "5,000m" },
            { id: "C", text: "1,000m" },
          ],
          explanation: "About 11,000 meters deep.",
          verified: false, // NOT VERIFIED
        },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await repo.saveQuestionBankQuestion(spanishWithUnverifiedEn);

    await expect(selectShortReelQuestion({ topic, repository: repo })).rejects.toMatchObject({
      code: "BANK_EMPTY",
    });

    // 4. Verify question bank questions are completely unmutated
    const bankResult = await repo.queryQuestionBankQuestions({ pageSize: 50 });
    expect(bankResult.total).toBe(2);
    const storedArchived = bankResult.questions.find((q) => q.id === "bank-q-archived");
    expect(storedArchived?.status).toBe("archived");
    const storedSpanish = bankResult.questions.find((q) => q.id === "bank-q-spanish-unverified");
    expect(storedSpanish?.translations?.en?.verified).toBe(false);
  });

  /**
   * TP-06: Idempotent repeat confirmation returns existing reel and reconciles topic projection.
   */
  it("TP-06: idempotent repeat confirmation returns existing reel without creating duplicate records or mutations", async () => {
    const { repo, channel } = await createTestRepository();

    const topic: ShortReelTopicCandidate = {
      topic_id: "topic_reel_idempotent_test",
      channel_id: channel.channel_id,
      content_kind: "short_reel",
      origin: "keyword",
      theme_hint: "Solar Flare",
      title: "Sun vs Moon Power",
      premise: "Solar power comparison",
      why_it_fits: "High interest topic",
      hook: "Can a solar flare knock out world satellites?",
      estimated_potential: "Viral",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 1,
      aspect_ratio: "9:16",
      archetype: "versus_faceoff",
    };

    const dummyEp1: EpisodeTopicCandidate = {
      topic_id: "dummy_ep_tp06_1",
      channel_id: channel.channel_id,
      content_kind: "episode",
      origin: "discovery",
      title: "Dummy Ep 1",
      premise: "P1",
      why_it_fits: "F1",
      hook: "H1",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 3,
      quiz_format: "multiple_choice",
      age_band: "family",
      visual_style: "flat_vector",
      archetype: "deep_trivia",
    };
    const dummyEp2: EpisodeTopicCandidate = { ...dummyEp1, topic_id: "dummy_ep_tp06_2", title: "Dummy Ep 2" };
    const dummyEp3: EpisodeTopicCandidate = { ...dummyEp1, topic_id: "dummy_ep_tp06_3", title: "Dummy Ep 3" };
    const dummyReel: ShortReelTopicCandidate = { ...topic, topic_id: "dummy_reel_tp06_2", title: "Dummy Reel 2" };

    await repo.saveTopicRun(channel.channel_id, [dummyEp1, dummyEp2, dummyEp3, topic, dummyReel]);

    // Seed approved English bank question
    const eligibleQuestion: BankQuestion = BankQuestionSchema.parse({
      id: "bank-versus-solar-001",
      archetype_id: "versus_faceoff",
      domain_id: "space_earth",
      subtopic_id: "solar_flares",
      language: "en",
      question: "Which releases more energy: a solar flare or volcanic eruption?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Solar flare", is_correct: true },
        { id: "B", text: "Volcanic eruption", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "A solar flare releases millions of times more energy.",
      status: "approved",
      age_band: "family",
      difficulty: 2,
      thinking_seconds: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await repo.saveQuestionBankQuestion(eligibleQuestion);

    // First confirmation
    const firstConfirm = await confirmShortReelTopic({
      repository: repo,
      channelId: channel.channel_id,
      topicId: topic.topic_id,
      requestId: "req-first-confirm",
    });

    expect(firstConfirm.content_kind).toBe("short_reel");
    const initialReel = firstConfirm.short_reel;
    expect(initialReel.topic_id).toBe(topic.topic_id);
    expect(initialReel.revision).toBe(1);

    // Topic projection must be marked selected
    const topicsAfterFirst = await repo.listTopics(channel.channel_id);
    const selectedTopic = topicsAfterFirst.find((t) => t.topic_id === topic.topic_id);
    expect(selectedTopic?.selected).toBe(true);

    // Second confirmation with same channel + topic
    const secondConfirm = await confirmShortReelTopic({
      repository: repo,
      channelId: channel.channel_id,
      topicId: topic.topic_id,
      requestId: "req-second-confirm",
    });

    expect(secondConfirm.content_kind).toBe("short_reel");
    expect(secondConfirm.short_reel.reel_id).toBe(initialReel.reel_id);
    expect(secondConfirm.short_reel.revision).toBe(initialReel.revision);
    expect(secondConfirm.short_reel.last_mutation?.command_hash).toBe(initialReel.last_mutation?.command_hash);

    // Exactly one Short-Reel record exists in storage
    const allReels = await repo.listShortReels(channel.channel_id);
    expect(allReels).toHaveLength(1);
    expect(allReels[0].reel_id).toBe(initialReel.reel_id);

    // Topic selected state preserved
    const topicsAfterSecond = await repo.listTopics(channel.channel_id);
    expect(topicsAfterSecond.find((t) => t.topic_id === topic.topic_id)?.selected).toBe(true);
  });
});
