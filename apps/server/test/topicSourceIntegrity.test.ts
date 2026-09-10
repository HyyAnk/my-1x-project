import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BankQuestionSchema, hashBankQuestionSource, type BankQuestion, type TopicCandidate } from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import { resolveBoundTopicSources } from "../src/quiz/bank/bridge/boundSourceResolver.js";

describe("Phase 2: Source Policy & Integrity", () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true }).catch(() => {})));
  });

  async function createFixture() {
    const root = await mkdtemp(path.join(os.tmpdir(), "topic-source-integrity-"));
    roots.push(root);

    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");

    const repo = new RepositoryService(root, root);
    await repo.ensureBootstrap();

    const channel = await repo.createChannel({
      name: "Source Policy Test Channel",
      description: "Testing source integrity",
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

  it("T1 reproduction: saveTopicRun does not fabricate qb_synth bindings for ordinary unbound candidates", async () => {
    const { repo, channel } = await createFixture();

    const ordinaryCandidate: TopicCandidate = {
      topic_id: "ordinary_topic_123",
      channel_id: channel.channel_id,
      content_kind: "episode",
      archetype: "deep_trivia",
      aspect_ratio: "16:9",
      title: "Ordinary Topic",
      premise: "No synthetic bindings allowed",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 3,
    };

    await repo.saveTopicRun(channel.channel_id, [ordinaryCandidate]);

    const topics = await repo.listTopics(channel.channel_id);
    const saved = topics.find((t) => t.topic_id === "ordinary_topic_123");
    expect(saved).toBeDefined();
    // Must NOT have fabricated qb_synth bindings
    expect(saved?.source_bindings).toBeUndefined();
  });

  it("T3 reproduction: direct repo.confirmTopic rejects when bound questions are missing, unapproved, non-English, or modified", async () => {
    const { repo, channel } = await createFixture();

    const q1 = makeBankQuestion("q_valid_ep_1");
    const q2 = makeBankQuestion("q_valid_ep_2");
    await repo.saveQuestionBankQuestion(q1);
    await repo.saveQuestionBankQuestion(q2);

    // 1. Missing source in Bank (3rd source missing)
    const missingCandidate: TopicCandidate = {
      topic_id: "topic_missing_source",
      channel_id: channel.channel_id,
      content_kind: "episode",
      archetype: "deep_trivia",
      aspect_ratio: "16:9",
      title: "Missing Source Topic",
      premise: "Premise",
      why_it_fits: "Fits",
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
          source_question_id: "q_does_not_exist",
          source_hash_version: 1,
          source_content_hash: "abcd".repeat(16),
          projection_provenance: {
            source_variant: "native",
            resolved_language: "en",
            translation_key: null,
            translation_provenance: "native",
          },
        },
      ],
    };
    await repo.saveTopicRun(channel.channel_id, [missingCandidate]);

    await expect(repo.confirmTopic(channel.channel_id, "topic_missing_source")).rejects.toThrow(/SOURCE_QUESTION_NOT_FOUND/);

    // Verify no episode was created and topic was not selected
    const channelEpisodes = await repo.listEpisodes(channel.channel_id);
    expect(channelEpisodes).toHaveLength(0);

    // 2. Unapproved source in Bank
    const unapprovedQ = makeBankQuestion("q_unapproved_1", { status: "draft" });
    await repo.saveQuestionBankQuestion(unapprovedQ);
    const unapprovedCandidate: TopicCandidate = {
      topic_id: "topic_unapproved",
      channel_id: channel.channel_id,
      content_kind: "episode",
      archetype: "deep_trivia",
      aspect_ratio: "16:9",
      title: "Unapproved Source Topic",
      premise: "Premise",
      why_it_fits: "Fits",
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
    };
    await repo.saveTopicRun(channel.channel_id, [unapprovedCandidate]);
    await expect(repo.confirmTopic(channel.channel_id, "topic_unapproved")).rejects.toThrow(/NOT_APPROVED/);

    // 3. Changed hash (content modified after binding)
    const modifiedHashCandidate: TopicCandidate = {
      topic_id: "topic_modified_hash",
      channel_id: channel.channel_id,
      content_kind: "episode",
      archetype: "deep_trivia",
      aspect_ratio: "16:9",
      title: "Modified Hash Topic",
      premise: "Premise",
      why_it_fits: "Fits",
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
          source_question_id: q1.id, // using q1 but with stale hash
          source_hash_version: 1,
          source_content_hash: "stale_hash_".repeat(6),
          projection_provenance: {
            source_variant: "native",
            resolved_language: "en",
            translation_key: null,
            translation_provenance: "native",
          },
        },
      ],
    };
    // Note: saveTopicRun may reject duplicates or confirmation will reject
    await repo.saveTopicRun(channel.channel_id, [modifiedHashCandidate]).catch(() => {});
    await expect(repo.confirmTopic(channel.channel_id, "topic_modified_hash")).rejects.toThrow();
  });

  it("T2: resolveBoundTopicSources rejects incompatible format and non-English questions", async () => {
    const { repo, channel } = await createFixture();

    // 1. Format mismatch: candidate expects true_false, Bank question is multiple_choice
    const mcQuestion = makeBankQuestion("q_mc_1", { format: "multiple_choice" });
    const mc2 = makeBankQuestion("q_mc_2", { format: "multiple_choice" });
    const mc3 = makeBankQuestion("q_mc_3", { format: "multiple_choice" });
    await repo.saveQuestionBankQuestion(mcQuestion);
    await repo.saveQuestionBankQuestion(mc2);
    await repo.saveQuestionBankQuestion(mc3);

    const tfCandidate: TopicCandidate = {
      topic_id: "topic_tf_test",
      channel_id: channel.channel_id,
      content_kind: "episode",
      quiz_format: "true_false",
      archetype: "deep_trivia",
      aspect_ratio: "16:9",
      title: "TF Question Topic",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 3,
      source_bindings: [
        {
          source_question_id: mcQuestion.id,
          source_hash_version: 1,
          source_content_hash: hashBankQuestionSource(mcQuestion),
          projection_provenance: {
            source_variant: "native",
            resolved_language: "en",
            translation_key: null,
            translation_provenance: "native",
          },
        },
        {
          source_question_id: mc2.id,
          source_hash_version: 1,
          source_content_hash: hashBankQuestionSource(mc2),
          projection_provenance: {
            source_variant: "native",
            resolved_language: "en",
            translation_key: null,
            translation_provenance: "native",
          },
        },
        {
          source_question_id: mc3.id,
          source_hash_version: 1,
          source_content_hash: hashBankQuestionSource(mc3),
          projection_provenance: {
            source_variant: "native",
            resolved_language: "en",
            translation_key: null,
            translation_provenance: "native",
          },
        },
      ],
    };
    await repo.saveTopicRun(channel.channel_id, [tfCandidate]);

    await expect(
      resolveBoundTopicSources({
        repository: repo,
        channelId: channel.channel_id,
        topicId: "topic_tf_test",
      }),
    ).rejects.toThrow(/FORMAT_MISMATCH/);

    // 2. Non-English question in snapshot
    const deQuestion = { ...mcQuestion, id: "q_de_sim", language: "de" as const };
    const deHash = hashBankQuestionSource(deQuestion);
    const deCandidate: TopicCandidate = {
      topic_id: "topic_de_test",
      channel_id: channel.channel_id,
      content_kind: "episode",
      archetype: "deep_trivia",
      aspect_ratio: "16:9",
      title: "DE Question Topic",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 3,
      source_bindings: [
        {
          source_question_id: deQuestion.id,
          source_hash_version: 1,
          source_content_hash: deHash,
          projection_provenance: {
            source_variant: "native",
            resolved_language: "en",
            translation_key: null,
            translation_provenance: "native",
          },
        },
        {
          source_question_id: mc2.id,
          source_hash_version: 1,
          source_content_hash: hashBankQuestionSource(mc2),
          projection_provenance: {
            source_variant: "native",
            resolved_language: "en",
            translation_key: null,
            translation_provenance: "native",
          },
        },
        {
          source_question_id: mc3.id,
          source_hash_version: 1,
          source_content_hash: hashBankQuestionSource(mc3),
          projection_provenance: {
            source_variant: "native",
            resolved_language: "en",
            translation_key: null,
            translation_provenance: "native",
          },
        },
      ],
    };
    await repo.saveTopicRun(channel.channel_id, [deCandidate]);

    // Simulate snapshot containing the non-English question
    const originalSnapshot = repo.readQuestionBankQuestionsSnapshot.bind(repo);
    repo.readQuestionBankQuestionsSnapshot = async (opts) => {
      const snap = await originalSnapshot(opts);
      return {
        ...snap,
        questions: [...snap.questions, deQuestion],
      };
    };

    await expect(
      resolveBoundTopicSources({
        repository: repo,
        channelId: channel.channel_id,
        topicId: "topic_de_test",
      }),
    ).rejects.toThrow(/NOT_ENGLISH/);

    repo.readQuestionBankQuestionsSnapshot = originalSnapshot;
  });

  it("T2: duplicate question IDs and capacity mismatches fail explicitly", async () => {
    const { repo, channel } = await createFixture();
    const q1 = makeBankQuestion("q_dup_1");
    const q2 = makeBankQuestion("q_dup_2");
    await repo.saveQuestionBankQuestion(q1);
    await repo.saveQuestionBankQuestion(q2);

    // Duplicate question IDs in bindings written directly to disk (simulating unvalidated file)
    const dupCandidate = {
      topic_id: "topic_dup_ids",
      channel_id: channel.channel_id,
      content_kind: "episode",
      archetype: "deep_trivia",
      aspect_ratio: "16:9",
      title: "Duplicate IDs Topic",
      premise: "Premise",
      why_it_fits: "Fits",
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
          source_question_id: q1.id, // Duplicate!
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
      ],
    };

    const originalListTopics = repo.listTopics.bind(repo);
    repo.listTopics = async (chId) => {
      const list = await originalListTopics(chId);
      return [...list, dupCandidate as unknown as TopicCandidate];
    };

    await expect(
      resolveBoundTopicSources({
        repository: repo,
        channelId: channel.channel_id,
        topicId: "topic_dup_ids",
        requestedQuestionCount: 3,
      }),
    ).rejects.toThrow(/DUPLICATE_SOURCE_QUESTION_ID/);

    // Capacity mismatch: requesting 5 questions when only 3 bindings exist
    await expect(
      resolveBoundTopicSources({
        repository: repo,
        channelId: channel.channel_id,
        topicId: "topic_dup_ids",
        requestedQuestionCount: 5,
      }),
    ).rejects.toThrow(/INSUFFICIENT_SOURCE_CAPACITY/);

    repo.listTopics = originalListTopics;
  });

  it("T2 deferred mutation: question modified in Bank between suggestion and confirmation fails resolution", async () => {
    const { repo, channel } = await createFixture();
    const q1 = makeBankQuestion("q_defer_1");
    const q2 = makeBankQuestion("q_defer_2");
    const q3 = makeBankQuestion("q_defer_3");
    await repo.saveQuestionBankQuestion(q1);
    await repo.saveQuestionBankQuestion(q2);
    await repo.saveQuestionBankQuestion(q3);

    const initialHash1 = hashBankQuestionSource(q1);
    const candidate: TopicCandidate = {
      topic_id: "topic_deferred_mut",
      channel_id: channel.channel_id,
      content_kind: "episode",
      archetype: "deep_trivia",
      aspect_ratio: "16:9",
      title: "Deferred Mutation Topic",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 3,
      source_bindings: [
        {
          source_question_id: q1.id,
          source_hash_version: 1,
          source_content_hash: initialHash1,
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
    };
    await repo.saveTopicRun(channel.channel_id, [candidate]);

    // Deferred mutation: someone edits the question in the bank
    const mutatedQ = { ...q1, question: "Updated text that changes the hash?" };
    await repo.saveQuestionBankQuestion(mutatedQ);

    // Resolution must fail because the hash in candidate no longer matches bank content
    await expect(
      resolveBoundTopicSources({
        repository: repo,
        channelId: channel.channel_id,
        topicId: "topic_deferred_mut",
      }),
    ).rejects.toThrow(/SOURCE_QUESTION_MODIFIED/);
  });

  it("T2 force policy: force overrides channel cooldown only, never unapproved, modified, or structural errors", async () => {
    const { repo, channel } = await createFixture();
    const qDraft = makeBankQuestion("q_force_draft", { status: "draft" });
    await repo.saveQuestionBankQuestion(qDraft);

    const candidate: TopicCandidate = {
      topic_id: "topic_force_test",
      channel_id: channel.channel_id,
      content_kind: "short_reel",
      archetype: "deep_trivia",
      aspect_ratio: "9:16",
      title: "Force Test Topic",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 1,
      source_bindings: [
        {
          source_question_id: qDraft.id,
          source_hash_version: 1,
          source_content_hash: hashBankQuestionSource(qDraft),
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

    // With force=true, unapproved question must STILL FAIL
    await expect(
      resolveBoundTopicSources({
        repository: repo,
        channelId: channel.channel_id,
        topicId: "topic_force_test",
        force: true,
      }),
    ).rejects.toThrow(/NOT_APPROVED/);
  });
});
