import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BankQuestionSchema, hashBankQuestionSource, type BankQuestion, type TopicRunResult } from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import { resolveBoundTopicSources } from "../src/quiz/bank/bridge/boundSourceResolver.js";
import { convertBankQuestionToQuizQuestionLossless } from "../src/quiz/bank/bridge/bankQuestionConverter.js";
import {
  computeConfirmationOptionsFingerprint,
  getTopicConfirmationReceipt,
  saveTopicConfirmationReceipt,
} from "../src/repository/topicConfirmationReceipts.js";
import { confirmShortReelTopic } from "../src/shortReel/topicConfirmation.js";
import {
  createEpisodeFromTopicWithBank,
  createEpisodeFromQuestionBank,
} from "../src/quiz/bank/questionBankToQuizBridge.js";
import { loadProductLocalizationArtifact } from "../src/quiz/bank/localization/productLocalization.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../..");

describe("Stage 4: Bound Topic Confirmation and Replay", () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true }).catch(() => {})));
  });

  async function createFixture() {
    const root = await mkdtemp(path.join(os.tmpdir(), "stage4-confirm-test-"));
    roots.push(root);

    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");

    const repo = new RepositoryService(projectRoot, root);
    await repo.ensureBootstrap();

    const channel = await repo.createChannel({
      name: "Test Confirmation Channel",
      description: "Channel for Stage 4 testing",
      target_audience: "Kids",
      language: "en",
      market: "US",
      dna_mode: "example",
    });

    return { repo, channel, root };
  }

  function makeBankQuestion(id: string, overrides: Partial<BankQuestion> = {}): BankQuestion {
    return BankQuestionSchema.parse({
      id,
      format: "multiple_choice",
      archetype_id: "deep_trivia",
      domain_id: "science",
      subtopic_id: "space",
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

  it("converts bound sources losslessly without remapping choice IDs or truncating text", () => {
    const question = makeBankQuestion("q_lossless_1");
    const converted = convertBankQuestionToQuizQuestionLossless(question);
    expect(converted.choices.map((choice) => choice.id)).toEqual(["c1", "c2", "c3"]);
    expect(converted.correct_choice_id).toBe("c1");
    expect(converted.choices.map((choice) => choice.text)).toEqual(["Option A", "Option B", "Option C"]);
  });

  it("rejects bound sources with incompatible choice counts", () => {
    const question = {
      ...makeBankQuestion("q_lossless_invalid"),
      choices: [{ id: "c1", text: "Only", is_correct: true }],
    } as BankQuestion;
    expect(() => convertBankQuestionToQuizQuestionLossless(question)).toThrow(/BOUND_SOURCE_INCOMPATIBLE/);
  });

  async function seedBankQuestions(repo: RepositoryService, questions: BankQuestion[]) {
    for (const q of questions) {
      await repo.saveQuestionBankQuestion(q);
    }
  }

  describe("Bound Source Resolution and Integrity Guards", () => {
    it("rejects confirmation if a bound source question was deleted after suggestion", async () => {
      const { repo, channel } = await createFixture();
      const q1 = makeBankQuestion("q_del_1");
      await seedBankQuestions(repo, [q1]);

      const hash = hashBankQuestionSource(q1);
      const runResult: TopicRunResult = {
        run_id: "run_del_test",
        target_episode_count: 0,
        target_short_reel_count: 1,
        candidates: [
          {
            slot_id: "slot_4",
            topic_id: "topic_del_test",
            channel_id: channel.channel_id,
            content_kind: "short_reel",
            archetype: "deep_trivia",
            aspect_ratio: "9:16",
            title: "Space Trivia",
            premise: "A fun space quiz",
            why_it_fits: "Fits science",
            hook: "Look up!",
            estimated_potential: "High",
            generated_at: new Date().toISOString(),
            selected: false,
            question_count: 1,
            source_bindings: [
              {
                source_question_id: "q_non_existent",
                source_hash_version: 1,
                source_content_hash: hash,
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
        shortages: [],
      };
      await repo.saveTopicRun(channel.channel_id, runResult);

      await expect(
        resolveBoundTopicSources({
          repository: repo,
          channelId: channel.channel_id,
          topicId: "topic_del_test",
        }),
      ).rejects.toThrow(/SOURCE_QUESTION_NOT_FOUND/);
    });

    it("rejects confirmation if a bound source question was modified after suggestion (hash mismatch)", async () => {
      const { repo, channel } = await createFixture();
      const q1 = makeBankQuestion("q_mod_1");
      await seedBankQuestions(repo, [q1]);

      // Provide a hash that does NOT match q1's current content
      const staleHash = "0".repeat(64);
      const runResult: TopicRunResult = {
        run_id: "run_mod_test",
        target_episode_count: 0,
        target_short_reel_count: 1,
        candidates: [
          {
            slot_id: "slot_4",
            topic_id: "topic_mod_test",
            channel_id: channel.channel_id,
            content_kind: "short_reel",
            archetype: "deep_trivia",
            aspect_ratio: "9:16",
            title: "Modified Space Trivia",
            premise: "A fun space quiz",
            why_it_fits: "Fits science",
            hook: "Look up!",
            estimated_potential: "High",
            generated_at: new Date().toISOString(),
            selected: false,
            question_count: 1,
            source_bindings: [
              {
                source_question_id: q1.id,
                source_hash_version: 1,
                source_content_hash: staleHash,
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
        shortages: [],
      };
      await repo.saveTopicRun(channel.channel_id, runResult);

      await expect(
        resolveBoundTopicSources({
          repository: repo,
          channelId: channel.channel_id,
          topicId: "topic_mod_test",
        }),
      ).rejects.toThrow(/SOURCE_QUESTION_MODIFIED/);
    });

    it("rejects confirmation if a bound source question was unapproved after suggestion", async () => {
      const { repo, channel } = await createFixture();
      const q1 = makeBankQuestion("q_unapp_1", { status: "draft" });
      await seedBankQuestions(repo, [q1]);

      const hash = hashBankQuestionSource(q1);
      const runResult: TopicRunResult = {
        run_id: "run_unapp_test",
        target_episode_count: 0,
        target_short_reel_count: 1,
        candidates: [
          {
            slot_id: "slot_4",
            topic_id: "topic_unapp_test",
            channel_id: channel.channel_id,
            content_kind: "short_reel",
            archetype: "deep_trivia",
            aspect_ratio: "9:16",
            title: "Unapproved Space Trivia",
            premise: "A fun space quiz",
            why_it_fits: "Fits science",
            hook: "Look up!",
            estimated_potential: "High",
            generated_at: new Date().toISOString(),
            selected: false,
            question_count: 1,
            source_bindings: [
              {
                source_question_id: q1.id,
                source_hash_version: 1,
                source_content_hash: hash,
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
        shortages: [],
      };
      await repo.saveTopicRun(channel.channel_id, runResult);

      await expect(
        resolveBoundTopicSources({
          repository: repo,
          channelId: channel.channel_id,
          topicId: "topic_unapp_test",
        }),
      ).rejects.toThrow(/SOURCE_QUESTION_NOT_APPROVED/);
    });

    it("rejects confirmation of unbound legacy topics and forged client bindings", async () => {
      const { repo, channel } = await createFixture();

      // Legacy topic with no bindings
      const topicsDir = repo.resolvePath("channels", channel.slug, "topics");
      await mkdir(topicsDir, { recursive: true });
      await writeFile(
        path.join(topicsDir, "suggestion-legacy.json"),
        JSON.stringify({
          generated_at: new Date().toISOString(),
          candidates: [
            {
              topic_id: "legacy_unbound_topic",
              channel_id: channel.channel_id,
              content_kind: "episode",
              title: "Legacy Topic",
              premise: "Legacy premise",
              why_it_fits: "Legacy fit",
              hook: "Legacy hook",
              estimated_potential: "Medium",
              generated_at: new Date().toISOString(),
              selected: false,
            },
          ],
        }),
        "utf8",
      );

      // Attempting to confirm with forged client bindings in input must still reject
      await expect(
        resolveBoundTopicSources({
          repository: repo,
          channelId: channel.channel_id,
          topicId: "legacy_unbound_topic",
          clientBindings: [{ source_question_id: "forged_q" }],
        }),
      ).rejects.toThrow(/UNBOUND_LEGACY_TOPIC/);
    });

    it("rejects cross-channel confirmation requests", async () => {
      const { repo } = await createFixture();
      await expect(
        resolveBoundTopicSources({
          repository: repo,
          channelId: "other_channel_id",
          topicId: "any_topic_id",
        }),
      ).rejects.toThrow();
    });
  });

  describe("Topic Confirmation Receipts and Durable Replay", () => {
    it("computes deterministic options fingerprints and handles same-options replay", () => {
      const fp1 = computeConfirmationOptionsFingerprint({
        question_count: 5,
        visual_style: "pixar_3d",
        render_aspect_ratio: "16:9",
        target_language: "en",
      });
      const fp2 = computeConfirmationOptionsFingerprint({
        target_language: "en",
        render_aspect_ratio: "16:9",
        visual_style: "pixar_3d",
        question_count: 5,
      });
      expect(fp1).toBe(fp2);

      const fpDiff = computeConfirmationOptionsFingerprint({
        question_count: 8,
        visual_style: "pixar_3d",
        render_aspect_ratio: "16:9",
        target_language: "en",
      });
      expect(fp1).not.toBe(fpDiff);
    });

    it("treats omitted visual style as the effective mixed default", () => {
      expect(
        computeConfirmationOptionsFingerprint({ question_count: 3, render_aspect_ratio: "16:9", target_language: "en" }),
      ).toBe(
        computeConfirmationOptionsFingerprint({
          question_count: 3,
          visual_style: "mixed",
          render_aspect_ratio: "16:9",
          target_language: "en",
        }),
      );
    });

    it("saves and retrieves topic confirmation receipts", async () => {
      const { repo, channel } = await createFixture();
      const receipt = {
        receipt_id: "rec_001",
        channel_id: channel.channel_id,
        topic_id: "topic_rec_001",
        content_kind: "episode" as const,
        product_id: "ep_rec_001",
        confirmed_at: new Date().toISOString(),
        request_id: "req_001",
        options_fingerprint: "0".repeat(64),
        options: { question_count: 3 },
        source_question_ids: ["q_1", "q_2", "q_3"],
        source_content_hashes: ["0".repeat(64), "1".repeat(64), "2".repeat(64)],
      };

      await saveTopicConfirmationReceipt(repo, channel.channel_id, receipt);
      const loaded = await getTopicConfirmationReceipt(repo, channel.channel_id, "topic_rec_001");
      expect(loaded).toBeDefined();
      expect(loaded?.receipt_id).toBe("rec_001");
      expect(loaded?.options_fingerprint).toBe("0".repeat(64));
    });

    it("fails closed when receipt file is corrupted or unreadable and does not treat it as absent", async () => {
      const { repo, channel } = await createFixture();
      const receiptsDir = repo.resolvePath("channels", channel.slug, "receipts");
      await mkdir(receiptsDir, { recursive: true });
      await writeFile(path.join(receiptsDir, "confirm-corrupt_topic.json"), "{ invalid json syntax", "utf8");

      await expect(getTopicConfirmationReceipt(repo, channel.channel_id, "corrupt_topic")).rejects.toThrow(
        /RECEIPT_CORRUPTED/,
      );
    });
  });

  describe("End-to-End Episode Confirmation with Bound Sources and Receipts", () => {
    it("creates an episode from bound sources, writes receipt, and replays on same options", async () => {
      const { repo, channel } = await createFixture();
      const q1 = makeBankQuestion("q_bound_1");
      const q2 = makeBankQuestion("q_bound_2");
      const q3 = makeBankQuestion("q_bound_3");
      await seedBankQuestions(repo, [q1, q2, q3]);

      const runResult: TopicRunResult = {
        run_id: "run_e2e_confirm",
        target_episode_count: 1,
        target_short_reel_count: 0,
        candidates: [
          {
            slot_id: "slot_1",
            topic_id: "topic_e2e_1",
            channel_id: channel.channel_id,
            content_kind: "episode",
            title: "Cosmic Mysteries",
            premise: "Discover outer space",
            why_it_fits: "Engaging science topic",
            hook: "What lurks beyond the stars?",
            estimated_potential: "High",
            generated_at: new Date().toISOString(),
            selected: false,
            question_count: 3,
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
        ],
        shortages: [],
      };
      await repo.saveTopicRun(channel.channel_id, runResult);

      // Confirm topic into episode
      const result1 = await createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: {
          topic_id: "topic_e2e_1",
          question_count: 3,
          visual_style: "pixar_3d",
          auto_start_pipeline: false,
        },
      });
      expect(result1.episode).toBeDefined();
      expect(result1.episode.topic.title).toBe("Cosmic Mysteries");
      expect(result1.quiz.questions).toHaveLength(3);

      // Verify sources.md was written
      const sourcesMd = await repo.loadEpisodeFile(channel.channel_id, result1.episode.episode_id, "sources.md");
      expect(sourcesMd).toContain("q_bound_1");

      // Verify receipt was saved
      const receipt = await getTopicConfirmationReceipt(repo, channel.channel_id, "topic_e2e_1");
      expect(receipt).toBeDefined();
      expect(receipt?.product_id).toBe(result1.episode.episode_id);

      // Re-confirming with SAME options should replay cleanly
      const result2 = await createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: {
          topic_id: "topic_e2e_1",
          question_count: 3,
          visual_style: "pixar_3d",
          auto_start_pipeline: false,
        },
      });
      expect(result2.episode.episode_id).toBe(result1.episode.episode_id);

      // Re-confirming with CHANGED options must return CONFIRMATION_OPTIONS_CONFLICT
      await expect(
        createEpisodeFromTopicWithBank({
          repository: repo,
          channelId: channel.channel_id,
          input: {
            topic_id: "topic_e2e_1",
            question_count: 2, // Changed from 3 to 2
            visual_style: "flat_vector", // Changed style
            auto_start_pipeline: false,
          },
        }),
      ).rejects.toThrow(/CONFIRMATION_OPTIONS_CONFLICT/);
    });
  });

  describe("Short-Reel Confirmation with Bound Source", () => {
    it("confirms a Short-Reel candidate using bound source without archetype reselection", async () => {
      const { repo, channel } = await createFixture();
      const qReel = makeBankQuestion("q_reel_bound_1", {
        archetype_id: "versus_faceoff",
        choices: [
          { id: "c1", text: "Lion", is_correct: true },
          { id: "c2", text: "Tiger", is_correct: false },
        ],
      });
      await seedBankQuestions(repo, [qReel]);

      const runResult: TopicRunResult = {
        run_id: "run_reel_confirm",
        target_episode_count: 0,
        target_short_reel_count: 1,
        candidates: [
          {
            slot_id: "slot_4",
            topic_id: "topic_reel_1",
            channel_id: channel.channel_id,
            content_kind: "short_reel",
            title: "Lion vs Tiger",
            premise: "Epic face-off",
            why_it_fits: "High engagement",
            hook: "Who wins?",
            estimated_potential: "High",
            generated_at: new Date().toISOString(),
            selected: false,
            archetype: "versus_faceoff",
            aspect_ratio: "9:16",
            question_count: 1,
            source_bindings: [
              {
                source_question_id: qReel.id,
                source_hash_version: 1,
                source_content_hash: hashBankQuestionSource(qReel),
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
        shortages: [],
      };
      await repo.saveTopicRun(channel.channel_id, runResult);

      const confirmResult = await confirmShortReelTopic({
        repository: repo,
        channelId: channel.channel_id,
        topicId: "topic_reel_1",
        requestId: "req_reel_001",
      });

      expect(confirmResult.content_kind).toBe("short_reel");
      expect(confirmResult.short_reel.topic.title).toBe("Lion vs Tiger");
      expect(confirmResult.short_reel.source.question_text).toBe("Question text for q_reel_bound_1");

      // Same request replays
      const replayResult = await confirmShortReelTopic({
        repository: repo,
        channelId: channel.channel_id,
        topicId: "topic_reel_1",
        requestId: "req_reel_001",
      });
      expect(replayResult.short_reel.reel_id).toBe(confirmResult.short_reel.reel_id);
    });
  });

  describe("Question Bank Immutability and Zero Writeback", () => {
    it("asserts Question Bank batches and index remain byte-identical across product generation", async () => {
      const { repo, channel } = await createFixture();
      const q1 = makeBankQuestion("q_imm_1");
      const q2 = makeBankQuestion("q_imm_2");
      const q3 = makeBankQuestion("q_imm_3");
      await seedBankQuestions(repo, [q1, q2, q3]);

      // Snapshot byte contents of Question Bank files before product confirmation
      const indexPath = repo.getQuestionBankPath("index.json");
      const batchPath = repo.getQuestionBankPath("deep_trivia", "science", "space.json");
      const indexBytesBefore = await readFile(indexPath);
      const batchBytesBefore = await readFile(batchPath);

      const runResult: TopicRunResult = {
        run_id: "run_imm_test",
        target_episode_count: 1,
        target_short_reel_count: 0,
        candidates: [
          {
            slot_id: "slot_1",
            topic_id: "topic_imm_1",
            channel_id: channel.channel_id,
            content_kind: "episode",
            title: "Galactic Voyage",
            premise: "A deep dive into galaxies",
            why_it_fits: "Fits science",
            hook: "How big is our galaxy?",
            estimated_potential: "High",
            generated_at: new Date().toISOString(),
            selected: false,
            question_count: 3,
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
        ],
        shortages: [],
      };
      await repo.saveTopicRun(channel.channel_id, runResult);

      // Confirm topic into episode
      await createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: {
          topic_id: "topic_imm_1",
          question_count: 3,
          visual_style: "pixar_3d",
          auto_start_pipeline: false,
        },
      });

      // Snapshot byte contents after product confirmation
      const indexBytesAfter = await readFile(indexPath);
      const batchBytesAfter = await readFile(batchPath);

      // Must be 100% byte-identical
      expect(Buffer.compare(indexBytesBefore, indexBytesAfter)).toBe(0);
      expect(Buffer.compare(batchBytesBefore, batchBytesAfter)).toBe(0);
    });
  });

  describe("Non-English Product Localization and Zero Discoverable Records on Failure", () => {
    it("localizes quiz questions to target language with provider double, preserves English topic, and matches persisted quiz", async () => {
      const { repo, channel } = await createFixture();
      const q1 = makeBankQuestion("q_de_1");
      const q2 = makeBankQuestion("q_de_2");
      const q3 = makeBankQuestion("q_de_3");
      await seedBankQuestions(repo, [q1, q2, q3]);

      const runResult: TopicRunResult = {
        run_id: "run_de_loc",
        target_episode_count: 1,
        target_short_reel_count: 0,
        candidates: [
          {
            slot_id: "slot_1",
            topic_id: "topic_de_loc",
            channel_id: channel.channel_id,
            content_kind: "episode",
            title: "English Topic Title",
            premise: "English topic premise about cosmos",
            why_it_fits: "Science fit",
            hook: "English topic hook",
            estimated_potential: "High",
            generated_at: new Date().toISOString(),
            selected: false,
            question_count: 3,
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
        ],
        shortages: [],
      };
      await repo.saveTopicRun(channel.channel_id, runResult);

      const stubLlmClient: LLMClient = {
        connect: async () => {},
        generateContent: async () => ({
          text: JSON.stringify({
            [`${q1.id}_question`]: "Welche Frage 1?",
            [`${q1.id}_explanation`]: "Erklärung 1 auf Deutsch.",
            [`${q1.id}_choice_c1`]: "Option A auf Deutsch",
            [`${q1.id}_choice_c2`]: "Option B auf Deutsch",
            [`${q1.id}_choice_c3`]: "Option C auf Deutsch",
            [`${q2.id}_question`]: "Welche Frage 2?",
            [`${q2.id}_explanation`]: "Erklärung 2 auf Deutsch.",
            [`${q2.id}_choice_c1`]: "Zweite Option A auf Deutsch",
            [`${q2.id}_choice_c2`]: "Zweite Option B auf Deutsch",
            [`${q2.id}_choice_c3`]: "Zweite Option C auf Deutsch",
            [`${q3.id}_question`]: "Welche Frage 3?",
            [`${q3.id}_explanation`]: "Erklärung 3 auf Deutsch.",
            [`${q3.id}_choice_c1`]: "Dritte Option A auf Deutsch",
            [`${q3.id}_choice_c2`]: "Dritte Option B auf Deutsch",
            [`${q3.id}_choice_c3`]: "Dritte Option C auf Deutsch",
            product_video_description: "Deutsche Beschreibung für das Video",
            product_thumbnail_text: "DEUTSCHER TITEL",
          }),
        }),
      };

      const result = await createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        llmClient: stubLlmClient,
        input: {
          topic_id: "topic_de_loc",
          question_count: 3,
          target_language: "de",
          visual_style: "pixar_3d",
          auto_start_pipeline: false,
        },
      });

      expect(result.episode).toBeDefined();
      expect(result.episode.topic.title).toBe("English Topic Title");
      expect(result.episode.topic.premise).toBe("English topic premise about cosmos");

      expect(result.quiz.language).toBe("de");
      expect(result.quiz.questions).toHaveLength(3);
      expect(result.quiz.questions[0].question).toBe("Welche Frage 1?");
      expect(result.quiz.questions[0].choices.map((c) => c.text)).toEqual([
        "Option A auf Deutsch",
        "Option B auf Deutsch",
        "Option C auf Deutsch",
      ]);
      expect(result.quiz.questions[0].choices.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);

      // Returned quiz must match persisted quiz exactly
      const persistedQuiz = await repo.readQuiz(channel.channel_id, result.episode.episode_id);
      expect(persistedQuiz).toBeDefined();
      expect(persistedQuiz?.language).toBe("de");
      expect(persistedQuiz?.questions[0].question).toBe(result.quiz.questions[0].question);
      expect(persistedQuiz?.questions[0].choices).toEqual(result.quiz.questions[0].choices);

      // Verify product localization artifact was saved
      const locArtifact = await loadProductLocalizationArtifact(repo, channel.channel_id, result.episode.slug);
      expect(locArtifact).toBeDefined();
      expect(locArtifact?.target_language).toBe("de");
      expect(locArtifact?.status).toBe("applied");
      expect(locArtifact?.video_description).toBe("Deutsche Beschreibung für das Video");
      expect(locArtifact?.thumbnail_text).toBe("DEUTSCHER TITEL");
    });

    it("leaves zero discoverable episodes if localization fails during topic confirmation", async () => {
      const { repo, channel } = await createFixture();
      const q1 = makeBankQuestion("q_fail_loc_1");
      const q2 = makeBankQuestion("q_fail_loc_2");
      const q3 = makeBankQuestion("q_fail_loc_3");
      await seedBankQuestions(repo, [q1, q2, q3]);

      const runResult: TopicRunResult = {
        run_id: "run_fail_loc",
        target_episode_count: 1,
        target_short_reel_count: 0,
        candidates: [
          {
            slot_id: "slot_1",
            topic_id: "topic_fail_loc",
            channel_id: channel.channel_id,
            content_kind: "episode",
            title: "Will Fail Localization",
            premise: "Premise",
            why_it_fits: "Fit",
            hook: "Hook",
            estimated_potential: "High",
            generated_at: new Date().toISOString(),
            selected: false,
            question_count: 3,
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
        ],
        shortages: [],
      };
      await repo.saveTopicRun(channel.channel_id, runResult);

      // Attempt non-English confirmation without an LLM translation provider
      await expect(
        createEpisodeFromTopicWithBank({
          repository: repo,
          channelId: channel.channel_id,
          llmClient: null, // No provider configured!
          input: {
            topic_id: "topic_fail_loc",
            question_count: 3,
            target_language: "de",
            auto_start_pipeline: false,
          },
        }),
      ).rejects.toThrow(/TRANSLATION_PROVIDER_MISSING/);

      // Must leave ZERO discoverable episodes
      const episodes = await repo.listEpisodes(channel.channel_id);
      expect(episodes).toHaveLength(0);
    });

    it("leaves zero discoverable episodes if localization fails during single-question creation", async () => {
      const { repo, channel } = await createFixture();
      const q1 = makeBankQuestion("q_fail_single_1");
      await seedBankQuestions(repo, [q1]);

      // Attempt non-English single-question creation without an LLM translation provider
      await expect(
        createEpisodeFromQuestionBank({
          repository: repo,
          channelId: channel.channel_id,
          llmClient: null,
          input: {
            question_id: q1.id,
            target_language: "fr",
            auto_start_pipeline: false,
          },
        }),
      ).rejects.toThrow(/TRANSLATION_PROVIDER_MISSING/);

      // Must leave ZERO discoverable episodes
      const episodes = await repo.listEpisodes(channel.channel_id);
      expect(episodes).toHaveLength(0);
    });
  });

  describe("Concurrent Confirmation Serialization", () => {
    it("serializes concurrent confirmations for the same topic candidate and replays cleanly", async () => {
      const { repo, channel } = await createFixture();
      const q1 = makeBankQuestion("q_conc_1");
      const q2 = makeBankQuestion("q_conc_2");
      const q3 = makeBankQuestion("q_conc_3");
      await seedBankQuestions(repo, [q1, q2, q3]);

      const runResult: TopicRunResult = {
        run_id: "run_conc_test",
        target_episode_count: 1,
        target_short_reel_count: 0,
        candidates: [
          {
            slot_id: "slot_1",
            topic_id: "topic_conc_1",
            channel_id: channel.channel_id,
            content_kind: "episode",
            title: "Concurrent Topic",
            premise: "Premise",
            why_it_fits: "Fit",
            hook: "Hook",
            estimated_potential: "High",
            generated_at: new Date().toISOString(),
            selected: false,
            question_count: 3,
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
        ],
        shortages: [],
      };
      await repo.saveTopicRun(channel.channel_id, runResult);

      // Launch two confirmation calls concurrently for the exact same topic
      const [res1, res2] = await Promise.all([
        createEpisodeFromTopicWithBank({
          repository: repo,
          channelId: channel.channel_id,
          input: {
            topic_id: "topic_conc_1",
            question_count: 3,
            visual_style: "pixar_3d",
            auto_start_pipeline: false,
          },
        }),
        createEpisodeFromTopicWithBank({
          repository: repo,
          channelId: channel.channel_id,
          input: {
            topic_id: "topic_conc_1",
            question_count: 3,
            visual_style: "pixar_3d",
            auto_start_pipeline: false,
          },
        }),
      ]);

      // Both must return the same episode ID
      expect(res1.episode.episode_id).toBe(res2.episode.episode_id);

      // Exactly ONE episode directory exists
      const episodes = await repo.listEpisodes(channel.channel_id);
      expect(episodes).toHaveLength(1);
    });
  });

  it("reuses the reserved Episode identity when completion receipt persistence fails", async () => {
    const { repo, channel } = await createFixture();
    const questions = [makeBankQuestion("q_receipt_retry_1"), makeBankQuestion("q_receipt_retry_2"), makeBankQuestion("q_receipt_retry_3")];
    await seedBankQuestions(repo, questions);
    await repo.saveTopicRun(channel.channel_id, [
      {
        topic_id: "topic_receipt_retry",
        channel_id: channel.channel_id,
        content_kind: "episode",
        origin: "discovery",
        title: "Receipt Retry Topic",
        premise: "Premise",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 3,
        source_bindings: questions.map((question) => ({
          source_question_id: question.id,
          source_hash_version: 1 as const,
          source_content_hash: hashBankQuestionSource(question),
          projection_provenance: {
            source_variant: "native" as const,
            resolved_language: "en" as const,
            translation_key: null,
            translation_provenance: "native" as const,
          },
        })),
      },
    ]);
    const originalWrite = repo.writeJsonAtomic.bind(repo);
    let receiptWrites = 0;
    const writeSpy = vi.spyOn(repo, "writeJsonAtomic").mockImplementation(async (file, value) => {
      if (file.includes(`${path.sep}receipts${path.sep}`) && ++receiptWrites === 2) throw new Error("completion receipt failure");
      return originalWrite(file, value);
    });

    await expect(
      createEpisodeFromTopicWithBank({ repository: repo, channelId: channel.channel_id, input: { topic_id: "topic_receipt_retry", auto_start_pipeline: false } }),
    ).rejects.toThrow("completion receipt failure");
    writeSpy.mockRestore();
    const firstReceipt = await getTopicConfirmationReceipt(repo, channel.channel_id, "topic_receipt_retry");
    expect(firstReceipt?.status).toBe("preparing");
    const firstEpisodes = await repo.listEpisodes(channel.channel_id);
    expect(firstEpisodes).toHaveLength(1);

    const retry = await createEpisodeFromTopicWithBank({
      repository: repo,
      channelId: channel.channel_id,
      input: { topic_id: "topic_receipt_retry", auto_start_pipeline: false },
    });
    expect(retry.episode.episode_id).toBe(firstEpisodes[0].episode_id);
    expect(await repo.listEpisodes(channel.channel_id)).toHaveLength(1);
    expect((await getTopicConfirmationReceipt(repo, channel.channel_id, "topic_receipt_retry"))?.status).toBe("completed");
  });

  describe("Unbound Topic Rejection", () => {
    it("strictly rejects unbound topic confirmation in createEpisodeFromTopicWithBank and repo.confirmTopic", async () => {
      const { repo, channel } = await createFixture();

      const unboundCandidate = {
        topic_id: "unbound_cand_1",
        channel_id: channel.channel_id,
        content_kind: "episode" as const,
        title: "Unbound Candidate",
        premise: "No bindings",
        why_it_fits: "None",
        hook: "Hook",
        estimated_potential: "Low",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 3,
        // Notice: NO source_bindings!
      };

      const topicsDir = repo.resolvePath("channels", channel.slug, "topics");
      await mkdir(topicsDir, { recursive: true });
      await writeFile(
        path.join(topicsDir, "unbound_run.json"),
        JSON.stringify({
          generated_at: new Date().toISOString(),
          candidates: [unboundCandidate],
        }),
        "utf8",
      );

      // createEpisodeFromTopicWithBank must reject
      await expect(
        createEpisodeFromTopicWithBank({
          repository: repo,
          channelId: channel.channel_id,
          input: {
            topic_id: "unbound_cand_1",
            question_count: 3,
          },
        }),
      ).rejects.toThrow(/UNBOUND_LEGACY_TOPIC/);

      // repo.confirmTopic must reject
      await expect(
        repo.confirmTopic(channel.channel_id, "unbound_cand_1", 3),
      ).rejects.toThrow(/UNBOUND_LEGACY_TOPIC/);
    });
  });
});
