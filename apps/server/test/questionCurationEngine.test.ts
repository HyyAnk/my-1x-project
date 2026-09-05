import { describe, expect, it, vi } from "vitest";
import { bankRequiredChoiceCountForArchetype, type BankQuestionWithCooldown, type TopicCandidate } from "@studio/shared";
import type { RepositoryService } from "../src/repository.js";
import type { QueryQuestionBankParams } from "../src/repository/quiz/questionBankRepository.js";
import {
  assembleRetentionArc,
  calculateRelevanceScore,
  calculateVisualScore,
  curateQuestionsForTopic,
  isValidBankQuestion,
  resolveTargetArchetype,
  tokenizeText,
} from "../src/quiz/bank/questionCurationEngine.js";

function makeQuestion(overrides: Partial<BankQuestionWithCooldown> = {}): BankQuestionWithCooldown {
  const archetypeId = overrides.archetype_id ?? "deep_trivia";
  const requiredChoices = bankRequiredChoiceCountForArchetype(archetypeId);
  const choices =
    overrides.choices ??
    Array.from({ length: requiredChoices }, (_, i) => ({
      id: String.fromCharCode(65 + i),
      text: `Choice ${String.fromCharCode(65 + i)}`,
      is_correct: i === 0,
    }));

  return {
    id: overrides.id ?? `Q-${Math.random().toString(36).substring(2, 9)}`,
    archetype_id: archetypeId,
    domain_id: overrides.domain_id ?? "nature_animals",
    subtopic_id: overrides.subtopic_id ?? "ocean_giants",
    question: overrides.question ?? "Default test question text?",
    format: overrides.format ?? "multiple_choice",
    choices,
    correct_choice_id: overrides.correct_choice_id ?? "A",
    explanation: overrides.explanation ?? "Default educational explanation.",
    fun_fact: overrides.fun_fact ?? "",
    visual_spec: overrides.visual_spec,
    age_band: overrides.age_band ?? "family",
    difficulty: overrides.difficulty ?? 2,
    tags: overrides.tags ?? [],
    status: overrides.status ?? "approved",
    channel_cooldown: overrides.channel_cooldown ?? { is_cooldown: false, days_remaining: 0 },
    ...overrides,
  };
}

function makeTopic(overrides: Partial<TopicCandidate> = {}): TopicCandidate {
  return {
    topic_id: overrides.topic_id ?? "top_test_001",
    channel_id: overrides.channel_id ?? "ch_test_001",
    title: overrides.title ?? "Ocean Giants: Secrets of the Deep Sea",
    premise: overrides.premise ?? "Explore the most massive creatures living in ocean trenches.",
    why_it_fits: overrides.why_it_fits ?? "Fascinating underwater giants captivate family audiences.",
    hook: overrides.hook ?? "Which massive deep sea creature has eyes as large as basketballs?",
    estimated_potential: overrides.estimated_potential ?? "Very High",
    generated_at: new Date().toISOString(),
    selected: false,
    quiz_format: overrides.quiz_format ?? "multiple_choice",
    question_count: overrides.question_count ?? 3,
    age_band: overrides.age_band ?? "family",
    visual_style: overrides.visual_style ?? "mixed",
    theme_hint: overrides.theme_hint,
    archetype: overrides.archetype ?? "deep_trivia",
    suggested_layout: overrides.suggested_layout ?? "media_left_choices_right",
    domain_id: overrides.domain_id ?? "nature_animals",
    subtopic_id: overrides.subtopic_id,
    ...overrides,
  };
}

function createMockRepository(initialQuestions: BankQuestionWithCooldown[] = []) {
  let questions = [...initialQuestions];

  const queryQuestionBankQuestions = vi.fn(async (params?: QueryQuestionBankParams) => {
    let filtered = [...questions];
    if (params?.archetypeId) {
      filtered = filtered.filter((q) => q.archetype_id === params.archetypeId);
    }
    if (params?.domainId) {
      filtered = filtered.filter((q) => q.domain_id === params.domainId);
    }
    return {
      questions: filtered,
      total: filtered.length,
    };
  });

  return {
    queryQuestionBankQuestions,
    setQuestions: (q: BankQuestionWithCooldown[]) => {
      questions = [...q];
    },
  } as unknown as RepositoryService & {
    queryQuestionBankQuestions: ReturnType<typeof vi.fn>;
    setQuestions: (q: BankQuestionWithCooldown[]) => void;
  };
}

describe("questionCurationEngine", () => {
  describe("resolveTargetArchetype", () => {
    it("resolves from topic.archetype when present", () => {
      const topic = makeTopic({ archetype: "mystery_reveal" });
      expect(resolveTargetArchetype(topic)).toBe("mystery_reveal");
    });

    it("falls back to suggested_layout when archetype is absent", () => {
      const topic = makeTopic({ archetype: undefined, suggested_layout: "clue_deduction" });
      expect(resolveTargetArchetype(topic)).toBe("clue_deduction");
    });

    it("falls back to quiz_format when both archetype and layout are absent", () => {
      const topicTrueFalse = makeTopic({ archetype: undefined, suggested_layout: undefined, quiz_format: "true_false" });
      expect(resolveTargetArchetype(topicTrueFalse)).toBe("verdict_true_false");

      const topicOdd = makeTopic({ archetype: undefined, suggested_layout: undefined, quiz_format: "odd_one_out" });
      expect(resolveTargetArchetype(topicOdd)).toBe("visual_spotting");
    });
  });

  describe("scoring & filtering helpers", () => {
    it("tokenizes and removes common stop words", () => {
      const tokens = tokenizeText("What is the largest whale in the deep blue ocean?");
      expect(tokens).toContain("largest");
      expect(tokens).toContain("whale");
      expect(tokens).toContain("deep");
      expect(tokens).toContain("blue");
      expect(tokens).toContain("ocean");
      expect(tokens).not.toContain("what");
      expect(tokens).not.toContain("is");
      expect(tokens).not.toContain("the");
    });

    it("calculates visual score bonus correctly", () => {
      const qNoVisual = makeQuestion({ visual_spec: undefined });
      expect(calculateVisualScore(qNoVisual)).toBe(0);

      const qShortPrompt = makeQuestion({
        visual_spec: { prompt: "A whale", intent: "none", aspect_ratio: "16:9" },
      });
      expect(calculateVisualScore(qShortPrompt)).toBe(5);

      const qDescriptivePrompt = makeQuestion({
        visual_spec: {
          prompt: "Cinematic 3D render of a colossal squid glowing in the midnight trench",
          intent: "question_illustration",
          aspect_ratio: "16:9",
        },
      });
      expect(calculateVisualScore(qDescriptivePrompt)).toBe(12);
    });

    it("calculates relevance score based on keyword overlap with topic", () => {
      const topic = makeTopic({
        title: "Deep Sea Giants",
        premise: "Colossal squid and blue whales",
        hook: "Which ocean monster has glowing eyes?",
      });

      const qRelevant = makeQuestion({
        question: "How long can a colossal squid grow in deep ocean water?",
        tags: ["squid", "ocean", "giants"],
      });

      const qIrrelevant = makeQuestion({
        subtopic_id: "european_capitals",
        explanation: "Paris is the capital and largest city of France.",
        question: "What is the capital city of France?",
        tags: ["geography", "europe"],
      });

      const scoreRel = calculateRelevanceScore(qRelevant, topic);
      const scoreIrrel = calculateRelevanceScore(qIrrelevant, topic);
      expect(scoreRel).toBeGreaterThan(scoreIrrel);
      expect(scoreIrrel).toBe(0);
    });

    it("filters questions based on approval and validation status", () => {
      const approved = makeQuestion({ status: "approved" });
      const validatedDraft = makeQuestion({ status: "draft" });
      (validatedDraft as unknown as { validation: { semantic_status: string } }).validation = {
        semantic_status: "validated",
      };
      const archived = makeQuestion({ status: "archived" });
      const rejected = makeQuestion({ status: "rejected" });

      expect(isValidBankQuestion(approved)).toBe(true);
      expect(isValidBankQuestion(validatedDraft)).toBe(true);
      expect(isValidBankQuestion(archived)).toBe(false);
      expect(isValidBankQuestion(rejected)).toBe(false);
    });
  });

  describe("curateQuestionsForTopic", () => {
    it("filters candidates by archetype and domain", async () => {
      const qMatch = makeQuestion({
        id: "Q-MATCH-1",
        archetype_id: "deep_trivia",
        domain_id: "nature_animals",
        question: "How massive is the blue whale?",
      });
      const qWrongDomain = makeQuestion({
        id: "Q-WRONG-DOM",
        archetype_id: "deep_trivia",
        domain_id: "space_earth",
        question: "How massive is Jupiter?",
      });
      const qWrongArchetype = makeQuestion({
        id: "Q-WRONG-ARCH",
        archetype_id: "verdict_true_false",
        domain_id: "nature_animals",
        question: "Are blue whales mammals?",
      });

      const repo = createMockRepository([qMatch, qWrongDomain, qWrongArchetype]);
      const topic = makeTopic({
        archetype: "deep_trivia",
        domain_id: "nature_animals",
        question_count: 1,
      });

      const result = await curateQuestionsForTopic({
        repository: repo,
        channelId: "ch_test_001",
        topic,
        questionCount: 1,
      });

      expect(repo.queryQuestionBankQuestions).toHaveBeenCalledWith(
        expect.objectContaining({
          archetypeId: "deep_trivia",
          domainId: "nature_animals",
        }),
      );
      expect(result.selectedQuestions).toHaveLength(1);
      expect(result.selectedQuestions[0].id).toBe("Q-MATCH-1");
      expect(result.missingCount).toBe(0);
    });

    it("filters out questions within the 30-day channel cooldown by default", async () => {
      const qCooldown1 = makeQuestion({
        id: "Q-COOL-1",
        channel_cooldown: { is_cooldown: true, days_remaining: 24 },
      });
      const qCooldown2 = makeQuestion({
        id: "Q-COOL-2",
        channel_cooldown: { is_cooldown: true, days_remaining: 10 },
      });
      const qReady1 = makeQuestion({
        id: "Q-READY-1",
        channel_cooldown: { is_cooldown: false, days_remaining: 0 },
      });
      const qReady2 = makeQuestion({
        id: "Q-READY-2",
        channel_cooldown: { is_cooldown: false, days_remaining: 0 },
      });
      const qReady3 = makeQuestion({
        id: "Q-READY-3",
        channel_cooldown: { is_cooldown: false, days_remaining: 0 },
      });

      const repo = createMockRepository([qCooldown1, qCooldown2, qReady1, qReady2, qReady3]);
      const topic = makeTopic({ question_count: 3 });

      const resultDefault = await curateQuestionsForTopic({
        repository: repo,
        channelId: "ch_test_001",
        topic,
        questionCount: 3,
      });

      expect(resultDefault.totalCandidatesFound).toBe(5);
      expect(resultDefault.cooldownFilteredCount).toBe(2);
      expect(resultDefault.selectedQuestions).toHaveLength(3);
      const selectedIds = resultDefault.selectedQuestions.map((q) => q.id);
      expect(selectedIds).not.toContain("Q-COOL-1");
      expect(selectedIds).not.toContain("Q-COOL-2");
      expect(selectedIds).toEqual(expect.arrayContaining(["Q-READY-1", "Q-READY-2", "Q-READY-3"]));
    });

    it("preserves cooldown questions when forceIncludeCooldown is true", async () => {
      const qCooldown = makeQuestion({
        id: "Q-COOL-1",
        channel_cooldown: { is_cooldown: true, days_remaining: 15 },
      });
      const qReady1 = makeQuestion({ id: "Q-READY-1" });
      const qReady2 = makeQuestion({ id: "Q-READY-2" });

      const repo = createMockRepository([qCooldown, qReady1, qReady2]);
      const topic = makeTopic({ question_count: 3 });

      const result = await curateQuestionsForTopic({
        repository: repo,
        channelId: "ch_test_001",
        topic,
        questionCount: 3,
        forceIncludeCooldown: true,
      });

      expect(result.cooldownFilteredCount).toBe(0);
      expect(result.totalCandidatesFound).toBe(3);
      expect(result.selectedQuestions).toHaveLength(3);
      expect(result.selectedQuestions.some((q) => q.id === "Q-COOL-1")).toBe(true);
    });

    it("sequences questions into a 3-act retention arc (difficulty 1-2 -> 3 -> 4-5)", async () => {
      const qHook = makeQuestion({
        id: "Q-HOOK",
        difficulty: 1,
        visual_spec: {
          prompt: "Vivid colorful giant manta ray gliding through sunlit clear tropical reef water",
          intent: "question_illustration",
          aspect_ratio: "16:9",
        },
        question: "What is the primary diet of giant manta rays?",
      });

      const qChallenge = makeQuestion({
        id: "Q-CHALLENGE",
        difficulty: 3,
        question: "How do sperm whales stun giant squid in the dark depths?",
        explanation: "They produce powerful acoustic clicks exceeding 230 decibels.",
      });

      const qClimax = makeQuestion({
        id: "Q-CLIMAX",
        difficulty: 5,
        fun_fact: "The colossal squid's eyes can detect the bioluminescence of disturbed plankton 120 meters away.",
        question: "Which feature distinguishes colossal squid hooks from giant squid suckers?",
      });

      const qExtra = makeQuestion({
        id: "Q-EXTRA",
        difficulty: 2,
        question: "Do blue whales have teeth?",
      });

      const repo = createMockRepository([qChallenge, qExtra, qClimax, qHook]);
      const topic = makeTopic({ question_count: 3 });

      const result = await curateQuestionsForTopic({
        repository: repo,
        channelId: "ch_test_001",
        topic,
        questionCount: 3,
      });

      expect(result.retentionArcApplied).toBe(true);
      expect(result.selectedQuestions).toHaveLength(3);

      const [slot1, slot2, slot3] = result.selectedQuestions;

      // Slot 1 (The Hook): Difficulty 1 or 2 with high visual engagement
      expect(slot1.difficulty).toBeLessThanOrEqual(2);
      expect(slot1.id).toBe("Q-HOOK");

      // Slot 2 (The Challenge): Difficulty 2 or 3
      expect([2, 3]).toContain(slot2.difficulty);

      // Slot 3 (The Climax / Twist): Difficulty 3-5 or fun_fact
      expect(slot3.difficulty).toBeGreaterThanOrEqual(3);
      expect(slot3.id).toBe("Q-CLIMAX");
    });

    it("calculates missingCount when candidate pool is smaller than requested questionCount", async () => {
      const qOnlyOne = makeQuestion({
        id: "Q-SOLO",
        difficulty: 2,
        question: "What is the fastest marine animal?",
      });

      const repo = createMockRepository([qOnlyOne]);
      const topic = makeTopic({ question_count: 3 });

      const result = await curateQuestionsForTopic({
        repository: repo,
        channelId: "ch_test_001",
        topic,
        questionCount: 3,
      });

      expect(result.totalCandidatesFound).toBe(1);
      expect(result.selectedQuestions).toHaveLength(1);
      expect(result.selectedQuestions[0].id).toBe("Q-SOLO");
      expect(result.missingCount).toBe(2);
      expect(result.retentionArcApplied).toBe(false);
    });

    it("returns zero selected questions and full missingCount when candidate pool is empty", async () => {
      const repo = createMockRepository([]);
      const topic = makeTopic({ question_count: 3 });

      const result = await curateQuestionsForTopic({
        repository: repo,
        channelId: "ch_test_001",
        topic,
        questionCount: 3,
      });

      expect(result.totalCandidatesFound).toBe(0);
      expect(result.selectedQuestions).toHaveLength(0);
      expect(result.missingCount).toBe(3);
      expect(result.retentionArcApplied).toBe(false);
    });

    it("falls back to querying all domains when topic.domain_id is not specified", async () => {
      const qNature = makeQuestion({
        id: "Q-NATURE",
        domain_id: "nature_animals",
        question: "How deep can the sperm whale dive?",
        tags: ["ocean", "deep", "whale"],
      });
      const qSpace = makeQuestion({
        id: "Q-SPACE",
        domain_id: "space_earth",
        question: "How large is the Olympus Mons volcano on Mars?",
        tags: ["mars", "volcano"],
      });

      const repo = createMockRepository([qNature, qSpace]);
      const topicWithoutDomain = makeTopic({
        domain_id: undefined,
        title: "Extreme Ocean Giants",
        premise: "Whales in deep water trenches",
        question_count: 1,
      });

      const result = await curateQuestionsForTopic({
        repository: repo,
        channelId: "ch_test_001",
        topic: topicWithoutDomain,
        questionCount: 1,
      });

      expect(repo.queryQuestionBankQuestions).toHaveBeenCalledWith(
        expect.objectContaining({
          domainId: undefined,
        }),
      );
      expect(result.selectedQuestions).toHaveLength(1);
      expect(result.selectedQuestions[0].id).toBe("Q-NATURE");
    });

    it("handles custom questionCount (e.g. count = 4) with ascending difficulty curve", async () => {
      const q1 = makeQuestion({ id: "Q-1", difficulty: 1 });
      const q2 = makeQuestion({ id: "Q-2", difficulty: 2 });
      const q3 = makeQuestion({ id: "Q-3", difficulty: 3 });
      const q4 = makeQuestion({ id: "Q-4", difficulty: 4 });
      const q5 = makeQuestion({ id: "Q-5", difficulty: 5 });

      const repo = createMockRepository([q4, q1, q5, q3, q2]);
      const topic = makeTopic({ question_count: 4 });

      const result = await curateQuestionsForTopic({
        repository: repo,
        channelId: "ch_test_001",
        topic,
        questionCount: 4,
      });

      expect(result.selectedQuestions).toHaveLength(4);
      expect(result.missingCount).toBe(0);
      expect(result.retentionArcApplied).toBe(true);

      const difficulties = result.selectedQuestions.map((q) => q.difficulty);
      for (let i = 0; i < difficulties.length - 1; i++) {
        expect(difficulties[i]).toBeLessThanOrEqual(difficulties[i + 1]);
      }
    });

    it("passes targetLanguage parameter to question bank query", async () => {
      const repo = createMockRepository([]);
      const topic = makeTopic();

      await curateQuestionsForTopic({
        repository: repo,
        channelId: "ch_test_001",
        topic,
        targetLanguage: "es",
      });

      expect(repo.queryQuestionBankQuestions).toHaveBeenCalledWith(
        expect.objectContaining({
          hasTranslationFor: "es",
        }),
      );
    });
  });
});
