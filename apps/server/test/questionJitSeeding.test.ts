import { describe, expect, it, vi } from "vitest";
import {
  BankQuestionSchema,
  bankRequiredChoiceCountForArchetype,
  type BankQuestion,
  type BankQuestionWithCooldown,
  type TopicCandidate,
} from "@studio/shared";
import type { RepositoryService } from "../src/repository.js";
import type { QueryQuestionBankParams } from "../src/repository/quiz/questionBankRepository.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";
import {
  determineMissingDifficulties,
  ensureTopicQuestionsWithJitFallback,
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
    visual_spec: overrides.visual_spec ?? {
      intent: "question_illustration",
      prompt: "Cinematic ocean deep underwater scene",
      aspect_ratio: "16:9",
    },
    age_band: overrides.age_band ?? "family",
    difficulty: overrides.difficulty ?? 2,
    tags: overrides.tags ?? ["ocean_giants", "deep_trivia"],
    status: overrides.status ?? "approved",
    channel_cooldown: overrides.channel_cooldown ?? { is_cooldown: false, days_remaining: 0 },
    ...overrides,
  };
}

function makeTopic(overrides: Partial<TopicCandidate> = {}): TopicCandidate {
  return {
    topic_id: overrides.topic_id ?? "top_ocean_001",
    channel_id: overrides.channel_id ?? "ch_test_001",
    title: overrides.title ?? "Ocean Giants: Secrets of the Deep Sea",
    premise: overrides.premise ?? "Explore the most massive creatures living in ocean trenches.",
    why_it_fits: overrides.why_it_fits ?? "Underwater behemoths captivate viewers across all platforms.",
    hook: overrides.hook ?? "Which massive deep sea creature has eyes as large as basketballs?",
    estimated_potential: overrides.estimated_potential ?? "Very High",
    generated_at: new Date().toISOString(),
    selected: false,
    quiz_format: overrides.quiz_format ?? "multiple_choice",
    question_count: overrides.question_count ?? 3,
    age_band: overrides.age_band ?? "family",
    visual_style: overrides.visual_style ?? "mixed",
    theme_hint: overrides.theme_hint ?? "Deep ocean abyssal creatures",
    archetype: overrides.archetype ?? "deep_trivia",
    suggested_layout: overrides.suggested_layout ?? "media_left_choices_right",
    domain_id: overrides.domain_id ?? "nature_animals",
    subtopic_id: overrides.subtopic_id ?? "ocean_giants",
    ...overrides,
  };
}

function makeLlmClient(questionCount: number, difficulties?: number[]): LLMClient {
  const questions = Array.from({ length: questionCount }, (_, i) => ({
    archetype_id: "deep_trivia",
    domain_id: "nature_animals",
    subtopic_id: "ocean_giants",
    question: `LLM generated ocean question number ${i + 1}?`,
    format: "multiple_choice",
    choices: [
      { id: "A", text: "Colossal Squid", is_correct: true },
      { id: "B", text: "Giant Octopus", is_correct: false },
      { id: "C", text: "Vampire Squid", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "The colossal squid has eyes measuring up to 27 cm across.",
    fun_fact: "Their eyes allow them to detect bioluminescent sperm whales in the dark.",
    visual_spec: {
      intent: "question_illustration",
      prompt: "Gigantic colossal squid with glowing eyes in dark abyss",
      aspect_ratio: "16:9",
    },
    difficulty: difficulties?.[i] ?? i + 1,
    thinking_seconds: 6,
    tags: ["ocean_giants", "deep_trivia"],
  }));
  return {
    connect: vi.fn(async () => undefined),
    generateContent: vi.fn(async () => ({ text: JSON.stringify(questions) })),
  };
}

function createMockRepository(initialQuestions: BankQuestionWithCooldown[] = []) {  let questions = [...initialQuestions];
  const savedQuestions: BankQuestion[] = [];

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

  const saveQuestionBankQuestion = vi.fn(async (q: BankQuestion) => {
    savedQuestions.push(q);
    questions.push({
      ...q,
      channel_cooldown: { is_cooldown: false, days_remaining: 0 },
    });
    return q;
  });

  return {
    queryQuestionBankQuestions,
    saveQuestionBankQuestion,
    savedQuestions,
    getQuestions: () => questions,
    setQuestions: (q: BankQuestionWithCooldown[]) => {
      questions = [...q];
    },
  } as unknown as RepositoryService & {
    queryQuestionBankQuestions: ReturnType<typeof vi.fn>;
    saveQuestionBankQuestion: ReturnType<typeof vi.fn>;
    savedQuestions: BankQuestion[];
    getQuestions: () => BankQuestionWithCooldown[];
    setQuestions: (q: BankQuestionWithCooldown[]) => void;
  };
}

describe("questionJitSeeder", () => {
  describe("determineMissingDifficulties", () => {
    it("returns empty array if target count is already fulfilled", () => {
      const existing = [makeQuestion({ difficulty: 1 }), makeQuestion({ difficulty: 3 }), makeQuestion({ difficulty: 4 })];
      expect(determineMissingDifficulties(existing, 3)).toEqual([]);
    });

    it("returns [1, 3, 4] when 0 questions exist for a 3-act arc", () => {
      expect(determineMissingDifficulties([], 3)).toEqual([1, 3, 4]);
    });

    it("returns [3, 4] when 1 low-difficulty question (slot 1) exists", () => {
      const existing = [makeQuestion({ difficulty: 2 })];
      expect(determineMissingDifficulties(existing, 3)).toEqual([3, 4]);
    });

    it("returns [1, 3] when 1 high-difficulty question (slot 3) exists", () => {
      const existing = [makeQuestion({ difficulty: 5 })];
      expect(determineMissingDifficulties(existing, 3)).toEqual([1, 3]);
    });

    it("returns [1, 4] when 1 mid-difficulty question (slot 2) exists", () => {
      const existing = [makeQuestion({ difficulty: 3 })];
      expect(determineMissingDifficulties(existing, 3)).toEqual([1, 4]);
    });

    it("returns [3] when 2 questions with low and high difficulty exist", () => {
      const existing = [makeQuestion({ difficulty: 1 }), makeQuestion({ difficulty: 4 })];
      expect(determineMissingDifficulties(existing, 3)).toEqual([3]);
    });

    it("returns [4] when 2 questions with low difficulty exist", () => {
      const existing = [makeQuestion({ difficulty: 1 }), makeQuestion({ difficulty: 2 })];
      expect(determineMissingDifficulties(existing, 3)).toEqual([4]);
    });

    it("returns [1] when 2 questions with high difficulty exist", () => {
      const existing = [makeQuestion({ difficulty: 3 }), makeQuestion({ difficulty: 5 })];
      expect(determineMissingDifficulties(existing, 3)).toEqual([1]);
    });

    it("handles arbitrary target counts evenly", () => {
      const diffs = determineMissingDifficulties([], 5);
      expect(diffs).toHaveLength(5);
      expect(diffs[0]).toBe(1);
      expect(diffs[4]).toBe(5);
    });
  });

  describe("ensureTopicQuestionsWithJitFallback", () => {
    it("returns bank_only when Question Bank already has sufficient matching questions", async () => {
      const q1 = makeQuestion({ id: "Q-1", difficulty: 1 });
      const q2 = makeQuestion({ id: "Q-2", difficulty: 3 });
      const q3 = makeQuestion({ id: "Q-3", difficulty: 4 });
      const repo = createMockRepository([q1, q2, q3]);
      const topic = makeTopic();

      const result = await ensureTopicQuestionsWithJitFallback({
        repository: repo,
        channelId: "ch_test_001",
        topic,
      });

      expect(result.source).toBe("bank_only");
      expect(result.existingCount).toBe(3);
      expect(result.jitGeneratedCount).toBe(0);
      expect(result.questions).toHaveLength(3);
      expect(result.retentionArcApplied).toBe(true);
      expect(repo.savedQuestions).toHaveLength(0);
    });

    it("generates 3 questions via LLM and auto-enriches bank when Question Bank has 0 matches", async () => {
      const repo = createMockRepository([]);
      const topic = makeTopic();

      const result = await ensureTopicQuestionsWithJitFallback({
        repository: repo,
        channelId: "ch_test_001",
        topic,
        llmClient: makeLlmClient(3),
      });

      expect(result.source).toBe("jit_only");
      expect(result.existingCount).toBe(0);
      expect(result.jitGeneratedCount).toBe(3);
      expect(result.questions).toHaveLength(3);
      expect(result.retentionArcApplied).toBe(true);

      // Verify all newly generated questions were saved into repository Question Bank
      expect(repo.savedQuestions).toHaveLength(3);
      for (const saved of repo.savedQuestions) {
        expect(() => BankQuestionSchema.parse(saved)).not.toThrow();
        expect(saved.archetype_id).toBe("deep_trivia");
      }

      // Verify difficulty ordering of 3-act retention arc
      expect(result.questions[0].difficulty).toBeLessThanOrEqual(2);
      expect(result.questions[1].difficulty).toBeGreaterThanOrEqual(2);
      expect(result.questions[2].difficulty).toBeGreaterThanOrEqual(3);
    });

    it("generates 2 questions via LLM to complete hybrid arc when Question Bank has 1 match", async () => {
      const existing = makeQuestion({
        id: "Q-EXISTING-1",
        difficulty: 1,
        question: "What is the deepest known living ocean creature?",
      });
      const repo = createMockRepository([existing]);
      const topic = makeTopic();

      const result = await ensureTopicQuestionsWithJitFallback({
        repository: repo,
        channelId: "ch_test_001",
        topic,
        llmClient: makeLlmClient(2, [3, 4]),
      });

      expect(result.source).toBe("hybrid");
      expect(result.existingCount).toBe(1);
      expect(result.jitGeneratedCount).toBe(2);
      expect(result.questions).toHaveLength(3);
      expect(result.retentionArcApplied).toBe(true);

      // Bank enriched with the 2 newly generated questions
      expect(repo.savedQuestions).toHaveLength(2);

      // Verify existing question is included in the final arc
      expect(result.questions.some((q) => q.id === "Q-EXISTING-1")).toBe(true);

      // Verify 3-act progression
      expect(result.questions[0].difficulty).toBeLessThanOrEqual(2);
      expect(result.questions[2].difficulty).toBeGreaterThanOrEqual(3);
    });

    it("fails with a clear error when offline (llmClient is null) and the bank cannot cover the topic", async () => {
      const repo = createMockRepository([]);
      const topic = makeTopic();

      await expect(
        ensureTopicQuestionsWithJitFallback({
          repository: repo,
          channelId: "ch_test_001",
          topic,
          llmClient: null,
        }),
      ).rejects.toMatchObject({ code: "INSUFFICIENT_QUESTIONS" });
      expect(repo.savedQuestions).toHaveLength(0);
    });

    it("fails with a clear error when only cooldown questions exist and no LLM client is available", async () => {
      // All 3 bank questions are in active channel cooldown
      const q1 = makeQuestion({ id: "QC-1", channel_cooldown: { is_cooldown: true, days_remaining: 15 } });
      const q2 = makeQuestion({ id: "QC-2", channel_cooldown: { is_cooldown: true, days_remaining: 20 } });
      const q3 = makeQuestion({ id: "QC-3", channel_cooldown: { is_cooldown: true, days_remaining: 5 } });
      const repo = createMockRepository([q1, q2, q3]);
      const topic = makeTopic();

      await expect(
        ensureTopicQuestionsWithJitFallback({
          repository: repo,
          channelId: "ch_test_001",
          topic,
          forceIncludeCooldown: false,
        }),
      ).rejects.toMatchObject({ code: "INSUFFICIENT_QUESTIONS" });
      expect(repo.savedQuestions).toHaveLength(0);
    });

    it("fails with a clear error when the LLM returns partial output instead of shipping placeholder questions", async () => {
      const repo = createMockRepository([]);
      const topic = makeTopic();

      const mockLlmClient: LLMClient = {
        connect: vi.fn(async () => undefined),
        generateContent: vi.fn(async () => ({
          text: JSON.stringify([
            {
              archetype_id: "deep_trivia",
              domain_id: "nature_animals",
              subtopic_id: "ocean_giants",
              question: "Which abyssal squid possesses the largest known animal eyes?",
              format: "multiple_choice",
              choices: [
                { id: "A", text: "Colossal Squid", is_correct: true },
                { id: "B", text: "Giant Octopus", is_correct: false },
                { id: "C", text: "Vampire Squid", is_correct: false },
              ],
              correct_choice_id: "A",
              explanation: "The colossal squid has eyes measuring up to 27 cm across.",
              fun_fact: "Their eyes allow them to detect bioluminescent sperm whales in the dark.",
              visual_spec: {
                intent: "question_illustration",
                prompt: "Gigantic colossal squid with glowing eyes in dark abyss",
                aspect_ratio: "16:9",
              },
              difficulty: 1,
              thinking_seconds: 6,
              tags: ["ocean_giants", "deep_trivia"],
            },
          ]),
        })),
      };

      await expect(
        ensureTopicQuestionsWithJitFallback({
          repository: repo,
          channelId: "ch_test_001",
          topic,
          llmClient: mockLlmClient,
        }),
      ).rejects.toMatchObject({ code: "INSUFFICIENT_QUESTIONS" });
      // Nothing is banked when the confirm flow cannot reach the target count
      expect(repo.savedQuestions).toHaveLength(0);
    });

    it("fails with a clear error when the LLM client throws an unexpected error", async () => {
      const repo = createMockRepository([]);
      const topic = makeTopic();

      const failingLlmClient: LLMClient = {
        connect: vi.fn(async () => undefined),
        generateContent: vi.fn(async () => {
          throw new Error("Rate limit exceeded 429");
        }),
      };

      await expect(
        ensureTopicQuestionsWithJitFallback({
          repository: repo,
          channelId: "ch_test_001",
          topic,
          llmClient: failingLlmClient,
        }),
      ).rejects.toMatchObject({ code: "INSUFFICIENT_QUESTIONS" });
      expect(repo.savedQuestions).toHaveLength(0);
    });
  });
});
