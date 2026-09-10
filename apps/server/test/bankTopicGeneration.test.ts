import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { hashBankQuestionSource, type BankQuestion, type TopicRunResult } from "@studio/shared";
import { allocateSourceBackedTopicSlots } from "../src/context/bankTopicAllocation.js";
import { validateTopicCandidateResponse } from "../src/context/topicCandidateValidator.js";
import { formatSourceBackedTopicPrompt, MAX_SOURCE_CONTEXT_CHARS } from "../src/context/bankTopicPromptBuilder.js";
import { RepositoryService } from "../src/repository.js";
import { getLatestTopicRun } from "../src/repository/topics.js";

function makeQuestion(overrides: Partial<BankQuestion> = {}): BankQuestion {
  const id = overrides.id ?? "q1";
  const format = overrides.format ?? "multiple_choice";
  const defaultChoices =
    format === "true_false" || overrides.archetype_id === "versus_faceoff"
      ? [
          { id: "a", text: "Choice A" },
          { id: "b", text: "Choice B" },
        ]
      : [
          { id: "a", text: "Choice A" },
          { id: "b", text: "Choice B" },
          { id: "c", text: "Choice C" },
        ];

  return {
    id,
    archetype_id: "deep_trivia",
    domain_id: "space_earth",
    subtopic_id: "solar_system",
    language: "en",
    question: `What is the fact about ${id}?`,
    format,
    choices: defaultChoices,
    correct_choice_id: defaultChoices[0].id,
    explanation: `Because ${id} is true.`,
    fun_fact: "Fun fact!",
    age_band: "7-9",
    difficulty: 2,
    tags: ["space"],
    status: "approved",
    created_at: "2026-09-08T00:00:00Z",
    updated_at: "2026-09-08T00:00:00Z",
    ...overrides,
  };
}

describe("Stage 3: Source-Backed Topic Allocation and Generation", () => {
  it("rejects provider responses naming an unallocated slot", () => {
    const allocation = allocateSourceBackedTopicSlots({ questions: [makeQuestion()], scanStatus: "complete_nonempty", channelId: "ch" });
    expect(() =>
      validateTopicCandidateResponse({
        channelId: "ch",
        allocatedSlots: allocation.allocatedSlots,
        rawOutput: [
          { slot_id: "slot_999", title: "Title", premise: "Premise", hook: "Hook", why_it_fits: "Fit", estimated_potential: "High" },
        ],
      }),
    ).toThrow(/slot/i);
  });
  describe("RED: allocateSourceBackedTopicSlots", () => {
    it("does not count the same question twice when inventory projects both policies", () => {
      const questions = Array.from({ length: 4 }, (_, i) => makeQuestion({ id: `unique_${i}` }));
      const result = allocateSourceBackedTopicSlots({
        questions: questions.flatMap((q) => [q, q]),
        scanStatus: "complete_nonempty",
        channelId: "ch",
      });
      expect(result.allocatedSlots.some((slot) => slot.slot === 1)).toBe(false);
      for (const slot of result.allocatedSlots) {
        expect(new Set(slot.sourceBindings.map((binding) => binding.source_question_id)).size).toBe(slot.sourceBindings.length);
      }
    });
    it("does not combine sparse groups or same-named subtopics across domains", () => {
      const questions = Array.from({ length: 8 }, (_, i) =>
        makeQuestion({
          id: `group_${i}`,
          domain_id: i < 4 ? "space" : "animals",
          subtopic_id: "facts",
        }),
      );
      const result = allocateSourceBackedTopicSlots({ questions, scanStatus: "complete_nonempty", channelId: "ch" });
      expect(result.allocatedSlots.some((slot) => slot.slot === 1)).toBe(false);
      expect(result.shortages.find((slot) => slot.slot_id === "slot_1")?.reason_code).toBe("INSUFFICIENT_GROUP_SOURCES");
    });

    it("requires every meaningful keyword token rather than one partial match", () => {
      const questions = Array.from({ length: 8 }, (_, i) => makeQuestion({ id: `space_${i}` }));
      const result = allocateSourceBackedTopicSlots({
        questions,
        scanStatus: "complete_nonempty",
        channelId: "ch",
        topicHint: "space dinosaurs",
      });
      expect(result.allocatedSlots.some((slot) => slot.slot === 1)).toBe(false);
    });

    it("complete fixture yields three coherent Episode allocations and two Reel allocations with no repeated source ID", () => {
      // 8 deep_trivia for slot 1 (Episode)
      const slot1Questions = Array.from({ length: 8 }, (_, i) =>
        makeQuestion({ id: `dt_ep_${i + 1}`, archetype_id: "deep_trivia", subtopic_id: "deep_space" }),
      );
      // 8 mystery_reveal for slot 2 (Episode)
      const slot2Questions = Array.from({ length: 8 }, (_, i) =>
        makeQuestion({
          id: `mr_ep_${i + 1}`,
          archetype_id: "mystery_reveal",
          domain_id: "nature_animals",
          subtopic_id: "safari_animals",
          format: "image_guess",
        }),
      );
      // 8 verdict_true_false for slot 3 (Episode)
      const slot3Questions = Array.from({ length: 8 }, (_, i) =>
        makeQuestion({
          id: `tf_ep_${i + 1}`,
          archetype_id: "verdict_true_false",
          domain_id: "human_body",
          subtopic_id: "human_brain",
          format: "true_false",
        }),
      );
      // 1 versus_faceoff for slot 4 (Short-Reel)
      const slot4Questions = [
        makeQuestion({
          id: "vf_reel_1",
          archetype_id: "versus_faceoff",
          domain_id: "mythology_creatures",
          subtopic_id: "greek_gods",
        }),
      ];
      // 1 deep_trivia for slot 5 (Short-Reel)
      const slot5Questions = [
        makeQuestion({
          id: "dt_reel_1",
          archetype_id: "deep_trivia",
          domain_id: "vehicles_technology",
          subtopic_id: "electric_cars",
        }),
      ];

      const allQuestions = [...slot1Questions, ...slot2Questions, ...slot3Questions, ...slot4Questions, ...slot5Questions];

      const result = allocateSourceBackedTopicSlots({
        questions: allQuestions,
        scanStatus: "complete_nonempty",
        channelId: "channel_1",
      });

      expect(result.scanStatus).toBe("complete_nonempty");
      expect(result.allocatedSlots).toHaveLength(5);
      expect(result.shortages).toHaveLength(0);

      // Verify slots 1, 2, 3 are episodes
      expect(result.allocatedSlots[0].slot).toBe(1);
      expect(result.allocatedSlots[0].contentKind).toBe("episode");
      expect(result.allocatedSlots[0].allocatedQuestions).toHaveLength(8);

      expect(result.allocatedSlots[1].slot).toBe(2);
      expect(result.allocatedSlots[1].contentKind).toBe("episode");
      expect(result.allocatedSlots[1].allocatedQuestions).toHaveLength(8);

      expect(result.allocatedSlots[2].slot).toBe(3);
      expect(result.allocatedSlots[2].contentKind).toBe("episode");
      expect(result.allocatedSlots[2].allocatedQuestions).toHaveLength(8);

      // Verify slots 4, 5 are short reels
      expect(result.allocatedSlots[3].slot).toBe(4);
      expect(result.allocatedSlots[3].contentKind).toBe("short_reel");
      expect(result.allocatedSlots[3].allocatedQuestions).toHaveLength(1);

      expect(result.allocatedSlots[4].slot).toBe(5);
      expect(result.allocatedSlots[4].contentKind).toBe("short_reel");
      expect(result.allocatedSlots[4].allocatedQuestions).toHaveLength(1);

      // Verify no repeated source ID across kinds and slots (globally disjoint)
      const allAllocatedIds = result.allocatedSlots.flatMap((s) => s.allocatedQuestions.map((q) => q.question.id));
      expect(new Set(allAllocatedIds).size).toBe(26); // 8 + 8 + 8 + 1 + 1 = 26
    });

    it("stable Episode slots 1/2/3 and Reel slots 4/5 survive holes; steered allocation has priority", () => {
      // Provide questions for Slot 1 (8), Slot 3 (8), Slot 4 (1), Slot 5 (1), but ZERO for Slot 2 (mystery_reveal)
      const slot1Questions = Array.from({ length: 8 }, (_, i) =>
        makeQuestion({ id: `dt_ep_${i + 1}`, archetype_id: "deep_trivia", domain_id: "space_earth" }),
      );
      const slot3Questions = Array.from({ length: 8 }, (_, i) =>
        makeQuestion({
          id: `tf_ep_${i + 1}`,
          archetype_id: "verdict_true_false",
          domain_id: "human_body",
          format: "true_false",
        }),
      );
      const slot4Questions = [makeQuestion({ id: "vf_reel_1", archetype_id: "versus_faceoff", domain_id: "space_earth" })];
      const slot5Questions = [makeQuestion({ id: "dt_reel_1", archetype_id: "deep_trivia", domain_id: "nature_animals" })];

      const result = allocateSourceBackedTopicSlots({
        questions: [...slot1Questions, ...slot3Questions, ...slot4Questions, ...slot5Questions],
        scanStatus: "complete_nonempty",
        channelId: "channel_1",
        topicHint: "space",
      });

      // Survives hole at slot 2: exactly 4 allocated slots, 1 shortage
      expect(result.allocatedSlots).toHaveLength(4);
      const allocatedSlotNumbers = result.allocatedSlots.map((s) => s.slot);
      expect(allocatedSlotNumbers).toEqual([1, 3, 4, 5]);

      expect(result.shortages).toHaveLength(1);
      expect(result.shortages[0].slot_id).toBe("slot_2");
      expect(result.shortages[0].content_kind).toBe("episode");

      // Steered allocation has priority: slot 1 and slot 4 are steered to space
      expect(result.allocatedSlots.find((s) => s.slot === 1)?.isKeySteered).toBe(true);
      expect(result.allocatedSlots.find((s) => s.slot === 4)?.isKeySteered).toBe(true);
    });

    it("scarce inventory yields honest partial; complete empty makes zero provider connection/call; incomplete/unavailable is a failure, not shortage", () => {
      // 1. Scarce inventory (only 1 short reel question in total bank)
      const scarceResult = allocateSourceBackedTopicSlots({
        questions: [makeQuestion({ id: "single_q", archetype_id: "deep_trivia" })],
        scanStatus: "complete_nonempty",
        channelId: "channel_1",
      });
      expect(scarceResult.allocatedSlots).toHaveLength(1);
      expect(scarceResult.allocatedSlots[0].slot).toBe(5); // deep_trivia reel slot
      expect(scarceResult.shortages).toHaveLength(4);

      // 2. Complete empty (0 questions)
      const emptyResult = allocateSourceBackedTopicSlots({
        questions: [],
        scanStatus: "complete_empty",
        channelId: "channel_1",
      });
      expect(emptyResult.allocatedSlots).toHaveLength(0);
      expect(emptyResult.shortages).toHaveLength(5);
      expect(emptyResult.shortages.every((s) => s.reason_code === "NO_ELIGIBLE_SOURCES")).toBe(true);

      // 3. Incomplete / unavailable scan is a failure (throws)
      expect(() =>
        allocateSourceBackedTopicSlots({
          questions: [],
          scanStatus: "incomplete",
          channelId: "channel_1",
        }),
      ).toThrowError(/INCOMPLETE_SCAN/);

      expect(() =>
        allocateSourceBackedTopicSlots({
          questions: [],
          scanStatus: "unavailable",
          channelId: "channel_1",
        }),
      ).toThrowError(/UNAVAILABLE_SCAN/);
    });

    it("unmatched keyword is shortage, never unrelated low-score fallback", () => {
      // Bank has questions in nature_animals and human_body, but user searched for "crypto quantum"
      const questions = [
        ...Array.from({ length: 8 }, (_, i) => makeQuestion({ id: `dt_${i}`, archetype_id: "deep_trivia", domain_id: "nature_animals" })),
        makeQuestion({ id: "vf_1", archetype_id: "versus_faceoff", domain_id: "nature_animals" }),
      ];

      const result = allocateSourceBackedTopicSlots({
        questions,
        scanStatus: "complete_nonempty",
        channelId: "channel_1",
        topicHint: "quantum computing astrophysics supercomputers",
      });

      // Steered slots (1 and 4) MUST NOT fall back to nature_animals; they must report NO_KEYWORD_MATCH shortage!
      const slot1 = result.allocatedSlots.find((s) => s.slot === 1);
      expect(slot1).toBeUndefined();

      const slot1Shortage = result.shortages.find((s) => s.slot_id === "slot_1");
      expect(slot1Shortage).toBeDefined();
      expect(slot1Shortage?.reason_code).toBe("NO_KEYWORD_MATCH");

      const slot4Shortage = result.shortages.find((s) => s.slot_id === "slot_4");
      expect(slot4Shortage).toBeDefined();
      expect(slot4Shortage?.reason_code).toBe("NO_KEYWORD_MATCH");
    });

    it("reports NO_KEYWORD_MATCH when topicHint consists solely of stopwords", () => {
      const slot1Questions = Array.from({ length: 8 }, (_, i) => makeQuestion({ id: `q_${i + 1}`, archetype_id: "deep_trivia" }));
      const result = allocateSourceBackedTopicSlots({
        questions: slot1Questions,
        scanStatus: "complete_nonempty",
        channelId: "channel_1",
        topicHint: "the and for of in with",
      });
      const slot1Shortage = result.shortages.find((s) => s.slot_id === "slot_1");
      const slot4Shortage = result.shortages.find((s) => s.slot_id === "slot_4");
      expect(slot1Shortage).toBeDefined();
      expect(slot1Shortage?.reason_code).toBe("NO_KEYWORD_MATCH");
      expect(slot4Shortage).toBeDefined();
      expect(slot4Shortage?.reason_code).toBe("NO_KEYWORD_MATCH");
      // But discovery slot 5 (deep_trivia Short-Reel) can still allocate questions
      expect(result.allocatedSlots.some((s) => s.slot === 5)).toBe(true);
    });
  });

  describe("RED: validateTopicCandidateResponse", () => {
    it("provider cannot replace bindings, kind, slot, archetype, or count; duplicated/missing response slots fail", () => {
      const slot1Questions = Array.from({ length: 8 }, (_, i) => makeQuestion({ id: `q_${i + 1}`, archetype_id: "deep_trivia" }));
      const allocation = allocateSourceBackedTopicSlots({
        questions: slot1Questions,
        scanStatus: "complete_nonempty",
        channelId: "channel_1",
      });
      // Slot 1 is allocated
      expect(allocation.allocatedSlots).toHaveLength(1);
      const slot1 = allocation.allocatedSlots[0];

      // Valid response with creative fields only
      const validCreativeResponse = [
        {
          slot_id: slot1.slotId,
          title: "Journey Into The Cosmos",
          premise: "An epic look into space phenomena",
          why_it_fits: "Perfect for deep space lovers",
          hook: "Can you survive the black hole?",
          estimated_potential: "High viral reach",
        },
      ];

      const validated = validateTopicCandidateResponse({
        rawOutput: validCreativeResponse,
        allocatedSlots: allocation.allocatedSlots,
        channelId: "channel_1",
        runId: "test_run_1",
        shortages: allocation.shortages,
      });

      expect(validated.candidates).toHaveLength(1);
      expect(validated.candidates[0].slot_id).toBe(slot1.slotId);
      expect(validated.candidates[0].content_kind).toBe("episode");
      expect(validated.candidates[0].source_bindings).toHaveLength(8);
      expect(validated.candidates[0].source_bindings[0].source_question_id).toBe("q_1");

      // Attempt to tamper with server-owned bindings or kind: ignored/rejected
      const tamperedResponse = [
        {
          slot_id: slot1.slotId,
          content_kind: "short_reel", // Tried to change kind!
          title: "Tampered Title",
          premise: "Tampered premise",
          why_it_fits: "Tampered",
          hook: "Tampered",
          estimated_potential: "High",
          source_bindings: [{ source_question_id: "hacked_id" }], // Tried to inject foreign binding!
        },
      ];

      const tamperedValidated = validateTopicCandidateResponse({
        rawOutput: tamperedResponse,
        allocatedSlots: allocation.allocatedSlots,
        channelId: "channel_1",
        runId: "test_run_2",
        shortages: allocation.shortages,
      });

      // Server preserves original server-owned authority
      expect(tamperedValidated.candidates[0].content_kind).toBe("episode");
      expect(tamperedValidated.candidates[0].source_bindings).toHaveLength(8);
      expect(tamperedValidated.candidates[0].source_bindings[0].source_question_id).toBe("q_1");

      // Missing required slot response fails
      expect(() =>
        validateTopicCandidateResponse({
          rawOutput: [], // Empty response
          allocatedSlots: allocation.allocatedSlots,
          channelId: "channel_1",
          runId: "test_run_3",
          shortages: allocation.shortages,
        }),
      ).toThrowError(/Candidate response count does not match allocated slots/);

      // Duplicated slot response fails
      expect(() =>
        validateTopicCandidateResponse({
          rawOutput: [validCreativeResponse[0], validCreativeResponse[0]],
          allocatedSlots: allocation.allocatedSlots,
          channelId: "channel_1",
          runId: "test_run_4",
          shortages: allocation.shortages,
        }),
      ).toThrowError(/Duplicate candidate response for slot/);
    });

    it("rejects candidate response when candidate item declares an unknown or conflicting slot_id", () => {
      const slot1Questions = Array.from({ length: 8 }, (_, i) => makeQuestion({ id: `q_${i + 1}`, archetype_id: "deep_trivia" }));
      const allocation = allocateSourceBackedTopicSlots({
        questions: slot1Questions,
        scanStatus: "complete_nonempty",
        channelId: "channel_1",
      });

      expect(() =>
        validateTopicCandidateResponse({
          rawOutput: [
            {
              slot_id: "slot_unknown",
              title: "Unknown Slot Candidate",
              premise: "Premise",
              why_it_fits: "Fit",
              hook: "Hook",
              estimated_potential: "High",
            },
          ],
          allocatedSlots: allocation.allocatedSlots,
          channelId: "channel_1",
        }),
      ).toThrowError(/Unknown allocated slot/);
    });
  });

  describe("formatSourceBackedTopicPrompt", () => {
    it("formats full English question, choice, correct-ID and explanation context without truncation", () => {
      const questions = [makeQuestion({ id: "q_prompt_1", archetype_id: "deep_trivia" })];
      const allocation = allocateSourceBackedTopicSlots({
        questions,
        scanStatus: "complete_nonempty",
        channelId: "channel_1",
      });

      const prompt = formatSourceBackedTopicPrompt(allocation, "space");
      expect(prompt.sourceContextText).toContain("PRE-ALLOCATED CANONICAL SOURCE QUESTIONS:");
      expect(prompt.sourceContextText).toContain("q_prompt_1");
      expect(prompt.sourceContextText).toContain("Choice A");
      expect(prompt.sourceContextText).toContain("Correct: [a]");
      expect(prompt.sourceContextText).toContain("Explanation: Because q_prompt_1 is true.");
      expect(prompt.outputContract).toContain("CRITICAL CONTRACT");
    });

    it("throws explicit OVERSIZED_CONTEXT error instead of silently truncating context", () => {
      // Create a slot with an excessively long explanation to simulate oversized context
      const oversizedQuestion = makeQuestion({
        id: "oversized_q",
        archetype_id: "deep_trivia",
        explanation: "X".repeat(MAX_SOURCE_CONTEXT_CHARS + 1000),
      });
      const allocation = allocateSourceBackedTopicSlots({
        questions: [oversizedQuestion],
        scanStatus: "complete_nonempty",
        channelId: "channel_1",
      });

      expect(() => formatSourceBackedTopicPrompt(allocation)).toThrowError(/OVERSIZED_CONTEXT/);
    });
  });

  describe("Repository topic run persistence and source capacity confirmation", () => {
    const tmpRoots: string[] = [];

    afterEach(async () => {
      await Promise.all(tmpRoots.splice(0).map((r) => rm(r, { recursive: true, force: true })));
    });

    async function createTestRepo(): Promise<{ repo: RepositoryService; channelId: string }> {
      const root = await mkdtemp(path.join(os.tmpdir(), "topic-test-repo-"));
      tmpRoots.push(root);
      await mkdir(path.join(root, "templates"), { recursive: true });
      await writeFile(
        path.join(root, "templates", "example_channel_dna.md"),
        "# Channel DNA\n\n## Channel Identity\n\n- Channel name: \n",
        "utf8",
      );
      await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
      const repo = new RepositoryService(root);
      await repo.ensureBootstrap();
      const channel = await repo.createChannel({
        name: "Test Channel",
        description: "Test Channel Description",
        target_audience: "Teens",
        language: "English",
        market: "US",
        dna_mode: "example",
      });
      return { repo, channelId: channel.channel_id };
    }

    it("persists honest partial TopicRunResult and reads it back preserving source bindings", async () => {
      const { repo, channelId } = await createTestRepo();

      const runResult: TopicRunResult = {
        run_id: "run_partial_123",
        target_episode_count: 3,
        target_short_reel_count: 2,
        candidates: [
          {
            topic_id: "topic_ep_1",
            slot_id: "slot_1",
            channel_id: channelId,
            content_kind: "episode",
            title: "Space Mysteries",
            premise: "Exploring dark matter",
            why_it_fits: "Science audience",
            hook: "What lurks in the void?",
            estimated_potential: "Very high",
            generated_at: new Date().toISOString(),
            selected: false,
            origin: "discovery",
            quiz_format: "multiple_choice",
            archetype: "deep_trivia",
            suggested_layout: "media_left_choices_right",
            question_count: 3,
            visual_style: "mixed",
            age_band: "7-9",
            source_bindings: [
              {
                source_question_id: "q_1",
                source_hash_version: 1,
                source_content_hash: "a".repeat(64),
                projection_provenance: {
                  source_variant: "native",
                  resolved_language: "en",
                  translation_key: null,
                  translation_provenance: "native",
                },
              },
              {
                source_question_id: "q_2",
                source_hash_version: 1,
                source_content_hash: "b".repeat(64),
                projection_provenance: {
                  source_variant: "native",
                  resolved_language: "en",
                  translation_key: null,
                  translation_provenance: "native",
                },
              },
              {
                source_question_id: "q_3",
                source_hash_version: 1,
                source_content_hash: "c".repeat(64),
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
        shortages: [
          {
            content_kind: "episode",
            slot_id: "slot_2",
            requested_count: 8,
            available_count: 0,
            reason_code: "NO_ELIGIBLE_SOURCES",
            exclusion_counts: {},
          },
        ],
      };

      await repo.saveTopicRun(channelId, runResult);

      const topics = await repo.listTopics(channelId);
      expect(topics).toHaveLength(1);
      expect(topics[0].topic_id).toBe("topic_ep_1");
      const epCandidate = topics[0] as (typeof runResult.candidates)[0];
      expect(epCandidate.source_bindings).toHaveLength(3);
      expect(epCandidate.source_bindings[0].source_question_id).toBe("q_1");
    });

    it("rejects confirmation of unbound legacy topic candidates", async () => {
      const { repo, channelId } = await createTestRepo();

      // Write a legacy suggestion file directly to topics directory without source_bindings
      const channel = await repo.getChannel(channelId);
      const topicsDir = repo.resolvePath("channels", channel.slug, "topics");
      await mkdir(topicsDir, { recursive: true });
      const legacyRun = {
        generated_at: new Date().toISOString(),
        candidates: [
          {
            topic_id: "legacy_topic_no_bindings",
            channel_id: channelId,
            content_kind: "episode",
            title: "Legacy Topic",
            premise: "Legacy premise",
            why_it_fits: "Legacy fit",
            hook: "Legacy hook",
            estimated_potential: "Medium",
            generated_at: new Date().toISOString(),
            selected: false,
            origin: "discovery",
            quiz_format: "multiple_choice",
            archetype: "deep_trivia",
            suggested_layout: "media_left_choices_right",
            question_count: 8,
            visual_style: "mixed",
            age_band: "7-9",
            // Notice: NO source_bindings!
          },
        ],
      };
      await writeFile(path.join(topicsDir, "suggestion-legacy.json"), JSON.stringify(legacyRun), "utf8");

      // Attempting to confirm must fail with UNBOUND_LEGACY_TOPIC
      await expect(repo.confirmTopic(channelId, "legacy_topic_no_bindings")).rejects.toThrowError(/UNBOUND_LEGACY_TOPIC/);
    });

    it("enforces supported source capacity: rejects question count beyond capacity, succeeds within capacity", async () => {
      const { repo, channelId } = await createTestRepo();

      const questions = Array.from({ length: 5 }, (_, i) =>
        makeQuestion({
          id: `q_src_${i + 1}`,
          format: "multiple_choice",
          status: "approved",
          language: "en",
        }),
      );
      for (const q of questions) {
        await repo.saveQuestionBankQuestion(q);
      }

      const runResult: TopicRunResult = {
        run_id: "run_capacity_test",
        target_episode_count: 3,
        target_short_reel_count: 2,
        candidates: [
          {
            topic_id: "topic_capacity_5",
            slot_id: "slot_1",
            channel_id: channelId,
            content_kind: "episode",
            title: "Five Question Episode",
            premise: "Capacity test",
            why_it_fits: "Fit",
            hook: "Hook",
            estimated_potential: "High",
            generated_at: new Date().toISOString(),
            selected: false,
            origin: "discovery",
            quiz_format: "multiple_choice",
            archetype: "deep_trivia",
            suggested_layout: "media_left_choices_right",
            question_count: 5,
            visual_style: "mixed",
            age_band: "7-9",
            source_bindings: questions.map((q) => ({
              source_question_id: q.id,
              source_hash_version: 1 as const,
              source_content_hash: hashBankQuestionSource(q),
              projection_provenance: {
                source_variant: "native" as const,
                resolved_language: "en" as const,
                translation_key: null,
                translation_provenance: "native" as const,
              },
            })),
          },
        ],
        shortages: [],
      };

      await repo.saveTopicRun(channelId, runResult);

      // 1. Requesting 8 questions when only 5 are supported must be REJECTED (no JIT generation)
      await expect(repo.confirmTopic(channelId, "topic_capacity_5", 8)).rejects.toThrowError(/INSUFFICIENT_SOURCE_CAPACITY/);

      // 2. Requesting 5 questions (exact capacity) must SUCCEED
      const episode = await repo.confirmTopic(channelId, "topic_capacity_5", 5);
      expect(episode).toBeDefined();
      expect(episode.quiz_config.question_count).toBe(5);

      // Verify sources.md was written with the 5 source bindings
      const channel = await repo.getChannel(channelId);
      const sourcesMd = await readFile(repo.resolvePath("channels", channel.slug, "episodes", episode.slug, "sources.md"), "utf8");
      expect(sourcesMd).toContain("q_src_1");
      expect(sourcesMd).toContain("q_src_5");
    });

    it("ensures newer run candidate takes precedence when topic_id appears across multiple runs in listTopics", async () => {
      const { repo, channelId } = await createTestRepo();

      const run1: TopicRunResult = {
        run_id: "run_older",
        target_episode_count: 1,
        target_short_reel_count: 0,
        candidates: [
          {
            topic_id: "topic_duplicate_across_runs",
            slot_id: "slot_1",
            channel_id: channelId,
            content_kind: "episode",
            title: "Older Version Title",
            premise: "Older Premise",
            why_it_fits: "Older Fits",
            hook: "Older Hook",
            estimated_potential: "Medium",
            generated_at: "2026-09-08T10:00:00.000Z",
            selected: false,
            origin: "discovery",
            quiz_format: "multiple_choice",
            archetype: "deep_trivia",
            suggested_layout: "media_left_choices_right",
            question_count: 3,
            visual_style: "mixed",
            age_band: "7-9",
            source_bindings: [
              {
                source_question_id: "q_1",
                source_hash_version: 1,
                source_content_hash: "a".repeat(64),
                projection_provenance: {
                  source_variant: "native",
                  resolved_language: "en",
                  translation_key: null,
                  translation_provenance: "native",
                },
              },
              {
                source_question_id: "q_2",
                source_hash_version: 1,
                source_content_hash: "b".repeat(64),
                projection_provenance: {
                  source_variant: "native",
                  resolved_language: "en",
                  translation_key: null,
                  translation_provenance: "native",
                },
              },
              {
                source_question_id: "q_3",
                source_hash_version: 1,
                source_content_hash: "c".repeat(64),
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

      await repo.saveTopicRun(channelId, run1);
      await new Promise((resolve) => setTimeout(resolve, 20));

      const run2: TopicRunResult = {
        run_id: "run_newer",
        target_episode_count: 1,
        target_short_reel_count: 0,
        candidates: [
          {
            topic_id: "topic_duplicate_across_runs",
            slot_id: "slot_1",
            channel_id: channelId,
            content_kind: "episode",
            title: "Newer Version Title",
            premise: "Newer Premise",
            why_it_fits: "Newer Fits",
            hook: "Newer Hook",
            estimated_potential: "High",
            generated_at: "2026-09-08T11:00:00.000Z",
            selected: false,
            origin: "discovery",
            quiz_format: "multiple_choice",
            archetype: "deep_trivia",
            suggested_layout: "media_left_choices_right",
            question_count: 3,
            visual_style: "mixed",
            age_band: "7-9",
            source_bindings: [
              {
                source_question_id: "q_1",
                source_hash_version: 1,
                source_content_hash: "a".repeat(64),
                projection_provenance: {
                  source_variant: "native",
                  resolved_language: "en",
                  translation_key: null,
                  translation_provenance: "native",
                },
              },
              {
                source_question_id: "q_2",
                source_hash_version: 1,
                source_content_hash: "b".repeat(64),
                projection_provenance: {
                  source_variant: "native",
                  resolved_language: "en",
                  translation_key: null,
                  translation_provenance: "native",
                },
              },
              {
                source_question_id: "q_3",
                source_hash_version: 1,
                source_content_hash: "c".repeat(64),
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

      await repo.saveTopicRun(channelId, run2);

      const topics = await repo.listTopics(channelId);
      expect(topics).toHaveLength(1);
      expect(topics[0].topic_id).toBe("topic_duplicate_across_runs");
      expect(topics[0].title).toBe("Newer Version Title");
      expect(topics[0].run_id).toBe("run_newer");

      const latestRun = await getLatestTopicRun(repo, channelId);
      expect(latestRun).toBeDefined();
      expect(latestRun?.run_id).toBe("run_newer");
      expect(latestRun?.candidates[0].title).toBe("Newer Version Title");
    });

    it("executes full task-to-storage topic suggestion with allocation and retrieval", async () => {
      const { repo, channelId } = await createTestRepo();

      const questions = Array.from({ length: 8 }, (_, i) => makeQuestion({ id: `q_task_${i + 1}`, archetype_id: "deep_trivia" }));
      const allocation = allocateSourceBackedTopicSlots({
        questions,
        scanStatus: "complete_nonempty",
        channelId,
      });

      const mockOutput = JSON.stringify([
        {
          slot_id: "slot_1",
          title: "Galactic Mysteries",
          premise: "Exploring deep space wonders",
          why_it_fits: "Science audience engagement",
          hook: "Can you name the secrets of the galaxy?",
          estimated_potential: "Very High",
        },
      ]);

      const runResult = validateTopicCandidateResponse({
        rawOutput: mockOutput,
        allocatedSlots: allocation.allocatedSlots,
        channelId,
        shortages: allocation.shortages,
      });

      await repo.saveTopicRun(channelId, runResult);

      const listed = await repo.listTopics(channelId);
      expect(listed).toHaveLength(1);
      expect(listed[0].title).toBe("Galactic Mysteries");
      expect(listed[0].run_id).toBe(runResult.run_id);

      const latest = await getLatestTopicRun(repo, channelId);
      expect(latest).toBeDefined();
      expect(latest?.run_id).toBe(runResult.run_id);
      expect(latest?.candidates).toHaveLength(1);
      expect(latest?.shortages.length).toBeGreaterThanOrEqual(1);
    });
  });
});
