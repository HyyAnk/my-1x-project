import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BankQuestionSchema,
  createEnglishSourceSnapshot,
  hashBankQuestionSource,
  type BankQuestion,
  type EpisodeTopicCandidate,
  type ShortReelTopicCandidate,
} from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import { createEpisodeFromTopicWithBank } from "../src/quiz/bank/questionBankToQuizBridge.js";
import { confirmShortReelTopic } from "../src/shortReel/topicConfirmation.js";
import { getTopicConfirmationReceipt } from "../src/repository/topicConfirmationReceipts.js";

describe("Phase 3: Confirmation Recovery (C1, C2, C3, C4)", () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true }).catch(() => {})));
    vi.restoreAllMocks();
  });

  async function createFixture() {
    const root = await mkdtemp(path.join(os.tmpdir(), "conf-rec-"));
    roots.push(root);

    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");

    const repo = new RepositoryService(root, root);
    await repo.ensureBootstrap();

    const channel = await repo.createChannel({
      name: "Confirmation Recovery Test Channel",
      description: "Testing confirmation recovery",
      target_audience: "General",
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
      age_band: "family",
      question: `Question text for ${id}?`,
      explanation: `Explanation for ${id}.`,
      choices: [
        { id: "c1", text: "Option A", is_correct: true },
        { id: "c2", text: "Option B", is_correct: false },
        { id: "c3", text: "Option C", is_correct: false },
      ],
      correct_choice_id: "c1",
      ...overrides,
    });
  }

  it("C1: Episode confirmation failure during appendQuestionHistory leaves preparing receipt and reconciles on retry", async () => {
    const { repo, channel, root } = await createFixture();

    const questions = [makeBankQuestion("q_c1_1"), makeBankQuestion("q_c1_2"), makeBankQuestion("q_c1_3")];
    for (const q of questions) {
      await repo.saveQuestionBankQuestion(q);
    }

    const candidate: EpisodeTopicCandidate = {
      topic_id: "topic_c1_recovery",
      channel_id: channel.channel_id,
      content_kind: "episode",
      archetype: "deep_trivia",
      quiz_format: "multiple_choice",
      title: "C1 Recovery Episode",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 3,
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
    await repo.saveTopicRun(channel.channel_id, [candidate]);

    // Mock appendQuestionHistory to fail on first attempt
    let hasFailed = false;
    const originalAppend = repo.appendQuestionHistory.bind(repo);
    repo.appendQuestionHistory = async (...args) => {
      if (!hasFailed) {
        hasFailed = true;
        throw new Error("INJECTED_APPEND_QUESTION_HISTORY_FAILURE");
      }
      return originalAppend(...args);
    };

    // First attempt fails
    await expect(
      createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: { topic_id: "topic_c1_recovery", question_count: 3 },
      }),
    ).rejects.toThrow("INJECTED_APPEND_QUESTION_HISTORY_FAILURE");

    // Receipt must NOT be "completed" after failure!
    const receiptAfterFailure = await getTopicConfirmationReceipt(repo, channel.channel_id, "topic_c1_recovery");
    expect(receiptAfterFailure).toBeDefined();
    expect(receiptAfterFailure?.status).toBe("preparing");

    // Reopen repository on the same root
    const reopenedRepo = new RepositoryService(root, root);
    await reopenedRepo.ensureBootstrap();

    // Retry must succeed, reconcile question history and mark receipt completed
    const retryResult = await createEpisodeFromTopicWithBank({
      repository: reopenedRepo,
      channelId: channel.channel_id,
      input: { topic_id: "topic_c1_recovery", question_count: 3 },
    });
    expect(retryResult.episode).toBeDefined();
    expect(retryResult.cooldown_recorded).toBe(true);

    const receiptAfterRetry = await getTopicConfirmationReceipt(reopenedRepo, channel.channel_id, "topic_c1_recovery");
    expect(receiptAfterRetry?.status).toBe("completed");

    // Verify exactly one episode exists
    const episodes = await reopenedRepo.listEpisodes(channel.channel_id);
    expect(episodes).toHaveLength(1);

    // Verify question history contains the 3 questions exactly once
    const history = await reopenedRepo.readQuestionHistory(channel.channel_id);
    expect(history.filter((h) => h.episode_id === retryResult.episode.episode_id)).toHaveLength(3);
  });

  it("C1 artifact validation: completed Episode replay rejects if quiz or director plan is missing or empty", async () => {
    const { repo, channel } = await createFixture();

    const questions = [makeBankQuestion("q_c1_art_1"), makeBankQuestion("q_c1_art_2"), makeBankQuestion("q_c1_art_3")];
    for (const q of questions) {
      await repo.saveQuestionBankQuestion(q);
    }

    const candidate: EpisodeTopicCandidate = {
      topic_id: "topic_c1_artifacts",
      channel_id: channel.channel_id,
      content_kind: "episode",
      archetype: "deep_trivia",
      quiz_format: "multiple_choice",
      title: "C1 Artifacts Episode",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 3,
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
    await repo.saveTopicRun(channel.channel_id, [candidate]);

    // Confirm once successfully
    const result = await createEpisodeFromTopicWithBank({
      repository: repo,
      channelId: channel.channel_id,
      input: { topic_id: "topic_c1_artifacts", question_count: 3 },
    });
    expect(result.episode).toBeDefined();

    // Now corrupt/remove quiz-v2.json
    const quizPath = repo.resolvePath("channels", channel.slug, "episodes", result.episode.slug, "quiz", "quiz-v2.json");
    await rm(quizPath, { force: true });

    // Replay must FAIL with CONFIRMATION_PRODUCT_CORRUPT, never substitute empty dummy quiz
    await expect(
      createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: { topic_id: "topic_c1_artifacts", question_count: 3 },
      }),
    ).rejects.toThrow(/CONFIRMATION_PRODUCT_CORRUPT/);
  });

  it("C2: Short-Reel legacy replay without valid localization rejects rather than marking completed", async () => {
    const { repo, channel } = await createFixture();
    const q1 = makeBankQuestion("q_c2_1");
    await repo.saveQuestionBankQuestion(q1);

    // Create an unreceipted short reel directly
    const reel = await repo.createShortReel(
      channel.channel_id,
      {
        topic_id: "sr_c2_legacy",
        channel_id: channel.channel_id,
        title: "Legacy Reel",
        premise: "Premise",
        hook: "Hook",
        origin: "discovery",
      },
      createEnglishSourceSnapshot(q1, "source"),
      "req-c2-legacy",
    );
    expect(reel).toBeDefined();

    // No receipt was created, and NO localization artifact was created!
    // When confirmShortReelTopic is called, it must NOT return completed reel without localization
    await expect(
      confirmShortReelTopic({
        repository: repo,
        channelId: channel.channel_id,
        topicId: "sr_c2_legacy",
      }),
    ).rejects.toThrow(/CONFIRMATION_PRODUCT_INCOMPLETE/);
  });

  it("C3: Short-Reel preparing retry recovers admitted source without being blocked by its own cooldown", async () => {
    const { repo, channel } = await createFixture();
    const q1 = makeBankQuestion("q_c3_1");
    await repo.saveQuestionBankQuestion(q1);

    const candidate: ShortReelTopicCandidate = {
      topic_id: "sr_c3_cooldown",
      channel_id: channel.channel_id,
      content_kind: "short_reel",
      archetype: "deep_trivia",
      aspect_ratio: "9:16",
      title: "C3 Cooldown Topic",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 1,
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
    };
    await repo.saveTopicRun(channel.channel_id, [candidate]);

    // Simulate failure during completed receipt save (after history was already appended)
    let completedSaveCount = 0;
    // We can inject failure when saving completed receipt
    vi.spyOn(repo, "writeJsonAtomic").mockImplementation(async (filePath, data) => {
      if (typeof filePath === "string" && filePath.includes("confirm-sr_c3_cooldown.json")) {
        const parsed = data as { status?: string };
        if (parsed.status === "completed" && completedSaveCount === 0) {
          completedSaveCount++;
          throw new Error("INJECTED_COMPLETED_RECEIPT_FAILURE");
        }
      }
      return (repo.constructor.prototype as unknown as { writeJsonAtomic: typeof repo.writeJsonAtomic }).writeJsonAtomic.call(
        repo,
        filePath,
        data,
      );
    });

    // First attempt fails when saving completed receipt
    await expect(
      confirmShortReelTopic({
        repository: repo,
        channelId: channel.channel_id,
        topicId: "sr_c3_cooldown",
      }),
    ).rejects.toThrow("INJECTED_COMPLETED_RECEIPT_FAILURE");

    // Preparing receipt exists
    const preparingReceipt = await getTopicConfirmationReceipt(repo, channel.channel_id, "sr_c3_cooldown");
    expect(preparingReceipt?.status).toBe("preparing");

    // And question was appended to history, putting it into cooldown
    const history = await repo.readQuestionHistory(channel.channel_id);
    expect(history.length).toBeGreaterThan(0);

    // Retry MUST succeed without being blocked by SOURCE_QUESTION_IN_COOLDOWN!
    const retryResult = await confirmShortReelTopic({
      repository: repo,
      channelId: channel.channel_id,
      topicId: "sr_c3_cooldown",
    });
    expect(retryResult.content_kind).toBe("short_reel");
    expect(retryResult.short_reel.reel_id).toBe(preparingReceipt?.product_id);

    const completedReceipt = await getTopicConfirmationReceipt(repo, channel.channel_id, "sr_c3_cooldown");
    expect(completedReceipt?.status).toBe("completed");
  });

  it("C4: Episode confirmation establishes effective defaults from candidate before fingerprinting", async () => {
    const { repo, channel } = await createFixture();

    const questions = Array.from({ length: 5 }, (_, i) => makeBankQuestion(`q_c4_${i + 1}`));
    for (const q of questions) {
      await repo.saveQuestionBankQuestion(q);
    }

    const candidate: EpisodeTopicCandidate = {
      topic_id: "topic_c4_defaults",
      channel_id: channel.channel_id,
      content_kind: "episode",
      archetype: "deep_trivia",
      quiz_format: "multiple_choice",
      visual_style: "flat_vector",
      title: "C4 Defaults Episode",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 5,
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
    await repo.saveTopicRun(channel.channel_id, [candidate]);

    // Confirm without passing explicit question_count or visual_style
    const result = await createEpisodeFromTopicWithBank({
      repository: repo,
      channelId: channel.channel_id,
      input: { topic_id: "topic_c4_defaults" },
    });
    expect(result.episode.quiz_config.question_count).toBe(5);

    const receipt = await getTopicConfirmationReceipt(repo, channel.channel_id, "topic_c4_defaults");
    expect(receipt?.options.question_count).toBe(5);
    expect(receipt?.options.visual_style).toBe("flat_vector");

    // Replay with identical explicit options succeeds
    const replay = await createEpisodeFromTopicWithBank({
      repository: repo,
      channelId: channel.channel_id,
      input: { topic_id: "topic_c4_defaults", question_count: 5, visual_style: "flat_vector" },
    });
    expect(replay.episode.episode_id).toBe(result.episode.episode_id);

    // Replay with conflicting options throws CONFIRMATION_OPTIONS_CONFLICT
    await expect(
      createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: { topic_id: "topic_c4_defaults", question_count: 3 },
      }),
    ).rejects.toThrow(/CONFIRMATION_OPTIONS_CONFLICT/);
  });

  it("Task 25: three simultaneous identical requests serialize and return the same product identity", async () => {
    const { repo, channel } = await createFixture();

    const questions = Array.from({ length: 3 }, (_, i) => makeBankQuestion(`q_sim_${i + 1}`));
    for (const q of questions) {
      await repo.saveQuestionBankQuestion(q);
    }

    const candidate: EpisodeTopicCandidate = {
      topic_id: "topic_sim_identical",
      channel_id: channel.channel_id,
      content_kind: "episode",
      archetype: "deep_trivia",
      quiz_format: "multiple_choice",
      title: "Simultaneous Episode",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 3,
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
    await repo.saveTopicRun(channel.channel_id, [candidate]);

    // Launch three identical confirmation calls simultaneously
    const [r1, r2, r3] = await Promise.all([
      createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: { topic_id: "topic_sim_identical", question_count: 3 },
      }),
      createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: { topic_id: "topic_sim_identical", question_count: 3 },
      }),
      createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: { topic_id: "topic_sim_identical", question_count: 3 },
      }),
    ]);

    expect(r1.episode.episode_id).toBe(r2.episode.episode_id);
    expect(r2.episode.episode_id).toBe(r3.episode.episode_id);

    // Exactly one episode exists on disk
    const episodes = await repo.listEpisodes(channel.channel_id);
    expect(episodes).toHaveLength(1);

    // Exactly one receipt exists
    const receipt = await getTopicConfirmationReceipt(repo, channel.channel_id, "topic_sim_identical");
    expect(receipt?.status).toBe("completed");
  });

  it("Task 25: simultaneous conflicting requests result in one success and expected conflict without unhandled rejection", async () => {
    const { repo, channel } = await createFixture();

    const questions = Array.from({ length: 3 }, (_, i) => makeBankQuestion(`q_conflict_${i + 1}`));
    for (const q of questions) {
      await repo.saveQuestionBankQuestion(q);
    }

    const candidate: EpisodeTopicCandidate = {
      topic_id: "topic_sim_conflict",
      channel_id: channel.channel_id,
      content_kind: "episode",
      archetype: "deep_trivia",
      quiz_format: "multiple_choice",
      title: "Conflicting Simultaneous Episode",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 3,
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
    await repo.saveTopicRun(channel.channel_id, [candidate]);

    // Launch two requests with conflicting visual styles simultaneously
    const results = await Promise.allSettled([
      createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: { topic_id: "topic_sim_conflict", question_count: 3, visual_style: "flat_vector" },
      }),
      createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: { topic_id: "topic_sim_conflict", question_count: 3, visual_style: "pixar_3d" },
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    if (rejected[0].status === "rejected") {
      expect(String(rejected[0].reason)).toMatch(/CONFIRMATION_OPTIONS_CONFLICT/);
    }
  });

  it("Task 25: separate repository instances on the same root replay confirmation cleanly", async () => {
    const { repo: repo1, channel, root } = await createFixture();

    const questions = Array.from({ length: 3 }, (_, i) => makeBankQuestion(`q_multi_inst_${i + 1}`));
    for (const q of questions) {
      await repo1.saveQuestionBankQuestion(q);
    }

    const candidate: EpisodeTopicCandidate = {
      topic_id: "topic_multi_inst",
      channel_id: channel.channel_id,
      content_kind: "episode",
      archetype: "deep_trivia",
      quiz_format: "multiple_choice",
      title: "Multi Instance Episode",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 3,
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
    await repo1.saveTopicRun(channel.channel_id, [candidate]);

    // Confirm via repo1
    const result1 = await createEpisodeFromTopicWithBank({
      repository: repo1,
      channelId: channel.channel_id,
      input: { topic_id: "topic_multi_inst", question_count: 3 },
    });
    expect(result1.episode).toBeDefined();

    // Replay via fresh repo2 on the same storage root
    const repo2 = new RepositoryService(root, root);
    await repo2.ensureBootstrap();

    const replayResult = await createEpisodeFromTopicWithBank({
      repository: repo2,
      channelId: channel.channel_id,
      input: { topic_id: "topic_multi_inst", question_count: 3 },
    });

    expect(replayResult.episode.episode_id).toBe(result1.episode.episode_id);
  });
});
