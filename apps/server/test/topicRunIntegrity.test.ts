import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BankQuestionSchema, hashBankQuestionSource, type BankQuestion, type TopicCandidate, type TopicRunResult } from "@studio/shared";
import { buildApp, type StudioApp } from "../src/app.js";
import { getLatestTopicRun, getTopicAvailabilityBatch } from "../src/repository/topics.js";

describe("Phase 5: Topic Run Integrity & Findings U1/U2 Regressions", () => {
  let app: StudioApp;
  let tempStorage: string;
  let testChannelId: string;
  let channelSlug: string;

  const sampleTexts = [
    "What particles make up an atomic nucleus?",
    "How fast does light travel in vacuum?",
    "What is the unit of electric current?",
    "Which element has atomic number one?",
    "What force keeps planets in orbit around the sun?",
    "What is absolute zero temperature in degrees Celsius?",
    "Who formulated the law of universal gravitation?",
    "What wavelength corresponds to deep red light?",
    "What is the charge of an electron?",
    "How many bones are in the adult human body?",
  ];

  function makeQuestion(id: string, overrides: Partial<BankQuestion> = {}): BankQuestion {
    const num = Number.parseInt(id.replace(/\D/g, ""), 10) || 1;
    const text = sampleTexts[(num - 1) % sampleTexts.length];
    return BankQuestionSchema.parse({
      id,
      format: "multiple_choice",
      archetype_id: "deep_trivia",
      domain_id: "science",
      subtopic_id: "physics",
      language: "en",
      status: "approved",
      age_band: "family",
      question: text,
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
    tempStorage = await mkdtemp(path.join(os.tmpdir(), "topic-run-integrity-"));
    await app.repository.setStorageRoot(tempStorage);

    const channel = await app.repository.createChannel({
      name: "Run Integrity Channel",
      description: "Testing topic run and availability integrity",
      target_audience: "Everyone",
      language: "English",
      country: "US",
      market: "US",
      dna_mode: "ai",
    });
    testChannelId = channel.channel_id;
    channelSlug = channel.slug;
  });

  afterAll(async () => {
    await rm(tempStorage, { recursive: true, force: true }).catch(() => {});
  });

  describe("Finding U1: Availability Capacity Policy & Candidate Count Enforcement", () => {
    it("rejects 8-question candidate when only 3 prefix sources are eligible (can_confirm=false)", async () => {
      // Seed 8 approved questions
      const questions: BankQuestion[] = [];
      for (let i = 1; i <= 8; i++) {
        const q = makeQuestion(`u1-q-${i}`, { status: "approved" });
        questions.push(q);
        await app.repository.saveQuestionBankQuestion(q);
      }

      // Put question 4 into channel cooldown (questions 1..3 eligible prefix)
      await app.repository.appendQuestionHistory(testChannelId, "ep-cooldown-4", [questions[3]]);

      const candidate8: TopicCandidate = {
        topic_id: "top-u1-candidate-8",
        channel_id: testChannelId,
        content_kind: "episode",
        quiz_format: "multiple_choice",
        title: "Quantum Physics Deep Dive",
        premise: "Exploring particle physics",
        why_it_fits: "High school science interest",
        hook: "What is quantum superposition?",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 8,
        visual_style: "pixar_3d",
        source_bindings: questions.map((q) => ({
          source_question_id: q.id,
          source_hash_version: 1,
          source_content_hash: hashBankQuestionSource(q),
          projection_provenance: {
            source_variant: "native",
            resolved_language: "en",
            translation_key: null,
            translation_provenance: "native",
          },
        })),
      };

      await app.repository.saveTopicRun(testChannelId, [candidate8]);

      const batch = await getTopicAvailabilityBatch(app.repository, testChannelId);
      const avail = batch.topics.find((t) => t.topic_id === "top-u1-candidate-8");
      expect(avail).toBeDefined();
      // U1 REGRESSION ASSERTION:
      // Candidate requires 8 questions. Only 3 are eligible.
      // Must NOT be available (can_confirm=false), and source_capacity must report 3 descriptive!
      expect(avail?.can_confirm).toBe(false);
      expect(avail?.reason_code).toBe("NO_ELIGIBLE_SOURCES");
      expect(avail?.source_capacity).toBe(3);
    });

    it("evaluates 7 eligible prefix sources as fail, and 8 as pass for 8-question candidate", async () => {
      const historyPath = app.repository.resolvePath("channels", channelSlug, "question_history.json");
      // Clear previous history and put only question 8 in cooldown (1..7 eligible)
      await app.repository.writeJsonAtomic(historyPath, []);
      await app.repository.appendQuestionHistory(testChannelId, "ep-cooldown-8", [makeQuestion("u1-q-8", { status: "approved" })]);

      let batch = await getTopicAvailabilityBatch(app.repository, testChannelId);
      let avail = batch.topics.find((t) => t.topic_id === "top-u1-candidate-8");
      // 7 eligible prefix sources fails for 8-question candidate
      expect(avail?.can_confirm).toBe(false);
      expect(avail?.reason_code).toBe("NO_ELIGIBLE_SOURCES");
      expect(avail?.source_capacity).toBe(7);

      // Now clear history so all 8 are eligible
      await app.repository.writeJsonAtomic(historyPath, []);

      batch = await getTopicAvailabilityBatch(app.repository, testChannelId);
      avail = batch.topics.find((t) => t.topic_id === "top-u1-candidate-8");
      // 8 eligible prefix sources passes for 8-question candidate
      expect(avail?.can_confirm).toBe(true);
      expect(avail?.reason_code).toBe("AVAILABLE");
      expect(avail?.source_capacity).toBe(8);
    });

    it("respects explicit count override in availability options", async () => {
      const historyPath = app.repository.resolvePath("channels", channelSlug, "question_history.json");
      // Put question 8 back in cooldown (7 eligible prefix sources)
      await app.repository.writeJsonAtomic(historyPath, []);
      await app.repository.appendQuestionHistory(testChannelId, "ep-cooldown-8", [makeQuestion("u1-q-8", { status: "approved" })]);

      // Without override, count=8 fails
      let batch = await getTopicAvailabilityBatch(app.repository, testChannelId);
      let avail = batch.topics.find((t) => t.topic_id === "top-u1-candidate-8");
      expect(avail?.can_confirm).toBe(false);
      expect(avail?.source_capacity).toBe(7);

      // With override count=5 (5 eligible prefix sources available, capacity is 7)
      batch = await getTopicAvailabilityBatch(app.repository, testChannelId, {
        overrides: { "top-u1-candidate-8": { question_count: 5 } },
      });
      avail = batch.topics.find((t) => t.topic_id === "top-u1-candidate-8");
      expect(avail?.can_confirm).toBe(true);
      expect(avail?.reason_code).toBe("AVAILABLE");
      expect(avail?.source_capacity).toBe(7);
    });
  });

  describe("Finding U2: Latest Run Fail-Closed on Malformed File", () => {
    it("fails closed with TOPIC_RUN_CORRUPTED when newest topic run is malformed rather than falling back to older run", async () => {
      const channel = await app.repository.getChannel(testChannelId);
      const topicsDir = app.repository.resolvePath("channels", channel.slug, "topics");
      await rm(topicsDir, { recursive: true, force: true });
      await mkdir(topicsDir, { recursive: true });

      // Write valid older run (Run 1 at T=1000)
      const olderRun: TopicRunResult = {
        run_id: "run-older-1000",
        target_episode_count: 1,
        target_short_reel_count: 0,
        shortages: [],
        candidates: [],
      };
      await writeFile(path.join(topicsDir, "suggestion-1000-run-older-1000.json"), JSON.stringify(olderRun), "utf8");

      // Write malformed newer run (Run 2 at T=2000)
      await writeFile(path.join(topicsDir, "suggestion-2000-run-malformed.json"), "{ invalid json syntax ...", "utf8");

      // U2 REGRESSION ASSERTION:
      // Must NOT return olderRun! Must throw TOPIC_RUN_CORRUPTED!
      await expect(getLatestTopicRun(app.repository, testChannelId)).rejects.toThrow(/TOPIC_RUN_CORRUPTED/);
    });

    it("fails closed when newest topic run fails schema validation", async () => {
      const channel = await app.repository.getChannel(testChannelId);
      const topicsDir = app.repository.resolvePath("channels", channel.slug, "topics");

      // Write invalid schema newer run (Run 3 at T=3000)
      await writeFile(path.join(topicsDir, "suggestion-3000-run-bad-schema.json"), JSON.stringify({ not_a_run: true }), "utf8");

      await expect(getLatestTopicRun(app.repository, testChannelId)).rejects.toThrow(/TOPIC_RUN_CORRUPTED/);
    });
  });

  describe("Task 28: Chronological Run Authoritativeness (Three Runs within 1500ms)", () => {
    it("newest run remains authoritative and empty even within 1500ms of older populated runs", async () => {
      // Clean directory
      const channel = await app.repository.getChannel(testChannelId);
      const topicsDir = app.repository.resolvePath("channels", channel.slug, "topics");
      await rm(topicsDir, { recursive: true, force: true });
      await mkdir(topicsDir, { recursive: true });

      const q1 = makeQuestion("t28-q-1");
      await app.repository.saveQuestionBankQuestion(q1);

      // Run 1 at T=1000 (populated)
      const run1: TopicRunResult = {
        run_id: "run-t28-1",
        target_episode_count: 1,
        target_short_reel_count: 0,
        shortages: [],
        candidates: [
          {
            slot_id: "slot-t28-1",
            topic_id: "top-t28-1",
            channel_id: testChannelId,
            content_kind: "episode",
            quiz_format: "multiple_choice",
            title: "Run 1 Topic",
            premise: "Premise 1",
            why_it_fits: "Fit 1",
            hook: "Hook 1",
            estimated_potential: "High",
            generated_at: new Date(1700000001000).toISOString(),
            selected: false,
            question_count: 1,
            visual_style: "pixar_3d",
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
            ],
          },
        ],
      };
      await writeFile(
        path.join(topicsDir, "suggestion-1700000001000-run-t28-1.json"),
        JSON.stringify({ ...run1, generated_at: new Date(1700000001000).toISOString() }),
        "utf8",
      );

      // Run 2 at T=1500 (populated, within 500ms of Run 1)
      const run2: TopicRunResult = {
        run_id: "run-t28-2",
        target_episode_count: 1,
        target_short_reel_count: 0,
        shortages: [],
        candidates: [
          {
            slot_id: "slot-t28-2",
            topic_id: "top-t28-2",
            channel_id: testChannelId,
            content_kind: "episode",
            quiz_format: "multiple_choice",
            title: "Run 2 Topic",
            premise: "Premise 2",
            why_it_fits: "Fit 2",
            hook: "Hook 2",
            estimated_potential: "High",
            generated_at: new Date(1700000001500).toISOString(),
            selected: false,
            question_count: 1,
            visual_style: "pixar_3d",
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
            ],
          },
        ],
      };
      await writeFile(
        path.join(topicsDir, "suggestion-1700000001500-run-t28-2.json"),
        JSON.stringify({ ...run2, generated_at: new Date(1700000001500).toISOString() }),
        "utf8",
      );

      // Run 3 at T=2000 (empty run with shortages, within 1000ms of Run 1 and 500ms of Run 2)
      const run3: TopicRunResult = {
        run_id: "run-t28-3-empty",
        target_episode_count: 1,
        target_short_reel_count: 0,
        shortages: [
          {
            domain_id: "science",
            archetype: "deep_trivia",
            count_needed: 3,
            message: "No eligible questions",
          },
        ],
        candidates: [],
      };
      await writeFile(
        path.join(topicsDir, "suggestion-1700000002000-run-t28-3-empty.json"),
        JSON.stringify({ ...run3, generated_at: new Date(1700000002000).toISOString() }),
        "utf8",
      );

      const latestRun = await getLatestTopicRun(app.repository, testChannelId);

      // STRICT TASK 28 REQUIREMENT:
      // The newest run remains authoritative and empty; no history promoted into latest.
      expect(latestRun).not.toBeNull();
      expect(latestRun?.run_id).toBe("run-t28-3-empty");
      expect(latestRun?.candidates).toHaveLength(0);
      expect(latestRun?.shortages).toHaveLength(1);
    });
  });
});
