import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hashBankQuestionSource, type BankQuestion } from "@studio/shared";
import { resolveBoundTopicSources } from "../src/quiz/bank/bridge/boundSourceResolver.js";
import { convertBankQuestionToQuizQuestionLossless } from "../src/quiz/bank/bridge/bankQuestionConverter.js";
import {
  computeConfirmationOptionsFingerprint,
  getTopicConfirmationReceipt,
  saveTopicConfirmationReceipt,
} from "../src/repository/topicConfirmationReceipts.js";
import { confirmShortReelTopic } from "../src/shortReel/topicConfirmation.js";
import { createEpisodeFromTopicWithBank, createEpisodeFromQuestionBank } from "../src/quiz/bank/questionBankToQuizBridge.js";
import { loadProductLocalizationArtifact } from "../src/quiz/bank/localization/productLocalization.js";
import {
  createConfirmationTestFixture,
  createBoundCandidate,
  createSourceBinding,
  createTopicRunResult,
  createMockReceipt,
  createGermanLocalizationStubLlm,
  createUnboundCandidate,
  makeBankQuestion,
  seedBankQuestions,
} from "./fixtures/topicConfirmationFixtures.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../..");

describe("Stage 4: Bound Topic Confirmation and Replay", () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true }).catch(() => {})));
  });

  async function createFixture() {
    return createConfirmationTestFixture(roots, projectRoot);
  }

  it("converts bound sources losslessly without remapping choice IDs or truncating text", () => {
    const question = makeBankQuestion("q_lossless_1");
    const converted = convertBankQuestionToQuizQuestionLossless(question);
    expect(converted.choices.map((choice) => choice.id)).toEqual(["c1", "c2", "c3"]);
    expect(converted.correct_choice_id).toBe("c1");
    expect(converted.choices.map((choice) => choice.text)).toEqual(["Option A", "Option B", "Option C"]);
  });

  it("converts bound sources with uppercase choice IDs (A, B, C) losslessly without regex errors", () => {
    const question = makeBankQuestion("q_lossless_uppercase", {
      choices: [
        { id: "A", text: "Alpha", is_correct: true },
        { id: "B", text: "Beta", is_correct: false },
        { id: "C", text: "Gamma", is_correct: false },
      ],
      correct_choice_id: "A",
    });
    const converted = convertBankQuestionToQuizQuestionLossless(question);
    expect(converted.choices.map((choice) => choice.id)).toEqual(["A", "B", "C"]);
    expect(converted.correct_choice_id).toBe("A");
  });

  it("rejects bound sources with incompatible choice counts", () => {
    const question = {
      ...makeBankQuestion("q_lossless_invalid"),
      choices: [{ id: "c1", text: "Only", is_correct: true }],
    } as BankQuestion;
    expect(() => convertBankQuestionToQuizQuestionLossless(question)).toThrow(/BOUND_SOURCE_INCOMPATIBLE/);
  });

  describe("Bound Source Resolution and Integrity Guards", () => {
    it("rejects confirmation if a bound source question was deleted after suggestion", async () => {
      const { repo, channel } = await createFixture();
      const q1 = makeBankQuestion("q_del_1");
      await seedBankQuestions(repo, [q1]);

      const hash = hashBankQuestionSource(q1);
      const candidate = createBoundCandidate({
        channelId: channel.channel_id,
        topicId: "topic_del_test",
        contentKind: "short_reel",
        title: "Space Trivia",
        premise: "A fun space quiz",
        whyItFits: "Fits science",
        hook: "Look up!",
        questionCount: 1,
        sourceBindings: [createSourceBinding("q_non_existent", hash)],
      });
      await repo.saveTopicRun(channel.channel_id, createTopicRunResult("run_del_test", [candidate]));

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
      const candidate = createBoundCandidate({
        channelId: channel.channel_id,
        topicId: "topic_mod_test",
        contentKind: "short_reel",
        title: "Modified Space Trivia",
        premise: "A fun space quiz",
        whyItFits: "Fits science",
        hook: "Look up!",
        questionCount: 1,
        sourceBindings: [createSourceBinding(q1.id, staleHash)],
      });
      await repo.saveTopicRun(channel.channel_id, createTopicRunResult("run_mod_test", [candidate]));

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

      const candidate = createBoundCandidate({
        channelId: channel.channel_id,
        topicId: "topic_unapp_test",
        contentKind: "short_reel",
        title: "Unapproved Space Trivia",
        premise: "A fun space quiz",
        whyItFits: "Fits science",
        hook: "Look up!",
        questions: [q1],
      });
      await repo.saveTopicRun(channel.channel_id, createTopicRunResult("run_unapp_test", [candidate]));

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
            createUnboundCandidate(channel.channel_id, "legacy_unbound_topic", {
              title: "Legacy Topic",
              premise: "Legacy premise",
              why_it_fits: "Legacy fit",
              hook: "Legacy hook",
              estimated_potential: "Medium",
            }),
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
      expect(computeConfirmationOptionsFingerprint({ question_count: 3, render_aspect_ratio: "16:9", target_language: "en" })).toBe(
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
      const receipt = createMockReceipt(channel.channel_id, "topic_rec_001");

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

      await expect(getTopicConfirmationReceipt(repo, channel.channel_id, "corrupt_topic")).rejects.toThrow(/RECEIPT_CORRUPTED/);
    });
  });

  describe("End-to-End Episode Confirmation with Bound Sources and Receipts", () => {
    it("creates an episode from bound sources, writes receipt, and replays on same options", async () => {
      const { repo, channel } = await createFixture();
      const q1 = makeBankQuestion("q_bound_1");
      const q2 = makeBankQuestion("q_bound_2");
      const q3 = makeBankQuestion("q_bound_3");
      await seedBankQuestions(repo, [q1, q2, q3]);

      const candidate = createBoundCandidate({
        channelId: channel.channel_id,
        topicId: "topic_e2e_1",
        contentKind: "episode",
        title: "Cosmic Mysteries",
        premise: "Discover outer space",
        whyItFits: "Engaging science topic",
        hook: "What lurks beyond the stars?",
        questions: [q1, q2, q3],
      });
      await repo.saveTopicRun(channel.channel_id, createTopicRunResult("run_e2e_confirm", [candidate]));

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

      const candidate = createBoundCandidate({
        channelId: channel.channel_id,
        topicId: "topic_reel_1",
        contentKind: "short_reel",
        title: "Lion vs Tiger",
        premise: "Epic face-off",
        whyItFits: "High engagement",
        hook: "Who wins?",
        archetype: "versus_faceoff",
        questions: [qReel],
      });
      await repo.saveTopicRun(channel.channel_id, createTopicRunResult("run_reel_confirm", [candidate]));

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

      const candidate = createBoundCandidate({
        channelId: channel.channel_id,
        topicId: "topic_imm_1",
        title: "Galactic Voyage",
        premise: "A deep dive into galaxies",
        whyItFits: "Fits science",
        hook: "How big is our galaxy?",
        questions: [q1, q2, q3],
      });
      await repo.saveTopicRun(channel.channel_id, createTopicRunResult("run_imm_test", [candidate]));

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

      const candidate = createBoundCandidate({
        channelId: channel.channel_id,
        topicId: "topic_de_loc",
        title: "English Topic Title",
        premise: "English topic premise about cosmos",
        whyItFits: "Science fit",
        hook: "English topic hook",
        questions: [q1, q2, q3],
      });
      await repo.saveTopicRun(channel.channel_id, createTopicRunResult("run_de_loc", [candidate]));

      const stubLlmClient = createGermanLocalizationStubLlm([q1.id, q2.id, q3.id]);

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

      // Product localization artifact is saved, thumbnail_text is decoupled from topic.title and remains undefined
      const locArtifact = await loadProductLocalizationArtifact(repo, channel.channel_id, result.episode.slug);
      expect(locArtifact).toBeDefined();
      expect(locArtifact?.target_language).toBe("de");
      expect(locArtifact?.status).toBe("applied");
      expect(locArtifact?.video_description).toBe("Deutsche Beschreibung für das Video");
      expect(locArtifact?.thumbnail_text).toBeUndefined();
    });

    it("leaves zero discoverable episodes if localization fails during topic confirmation", async () => {
      const { repo, channel } = await createFixture();
      const q1 = makeBankQuestion("q_fail_loc_1");
      const q2 = makeBankQuestion("q_fail_loc_2");
      const q3 = makeBankQuestion("q_fail_loc_3");
      await seedBankQuestions(repo, [q1, q2, q3]);

      const candidate = createBoundCandidate({
        channelId: channel.channel_id,
        topicId: "topic_fail_loc",
        title: "Will Fail Localization",
        premise: "Premise",
        whyItFits: "Fit",
        hook: "Hook",
        questions: [q1, q2, q3],
      });
      await repo.saveTopicRun(channel.channel_id, createTopicRunResult("run_fail_loc", [candidate]));

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

      const candidate = createBoundCandidate({
        channelId: channel.channel_id,
        topicId: "topic_conc_1",
        title: "Concurrent Topic",
        premise: "Premise",
        whyItFits: "Fit",
        hook: "Hook",
        questions: [q1, q2, q3],
      });
      await repo.saveTopicRun(channel.channel_id, createTopicRunResult("run_conc_test", [candidate]));

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

    const candidate = createBoundCandidate({
      channelId: channel.channel_id,
      topicId: "topic_receipt_retry",
      origin: "discovery",
      title: "Receipt Retry Topic",
      premise: "Premise",
      whyItFits: "Fits",
      hook: "Hook",
      questions,
    });
    await repo.saveTopicRun(channel.channel_id, [candidate]);

    const originalWrite = repo.writeJsonAtomic.bind(repo);
    let receiptWrites = 0;
    const writeSpy = vi.spyOn(repo, "writeJsonAtomic").mockImplementation(async (file, value) => {
      if (file.includes(`${path.sep}receipts${path.sep}`) && ++receiptWrites === 2) throw new Error("completion receipt failure");
      return originalWrite(file, value);
    });

    await expect(
      createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: { topic_id: "topic_receipt_retry", auto_start_pipeline: false },
      }),
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

      const unboundCandidate = createUnboundCandidate(channel.channel_id, "unbound_cand_1", {
        title: "Unbound Candidate",
        premise: "No bindings",
        why_it_fits: "None",
        hook: "Hook",
        estimated_potential: "Low",
      });

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
      await expect(repo.confirmTopic(channel.channel_id, "unbound_cand_1", 3)).rejects.toThrow(/UNBOUND_LEGACY_TOPIC/);
    });
  });
});
