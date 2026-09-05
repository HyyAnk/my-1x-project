import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { RepositoryService } from "../src/repository/service.js";
import type { BankQuestion, BankTranslationContent } from "@studio/shared";

describe("QuestionBankRepository & Channel Cooldown Engine", () => {
  let tempDir: string;
  let repo: RepositoryService;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "qb-test-"));
    const { existsSync } = await import("node:fs");
    let curr = process.cwd();
    while (curr !== path.dirname(curr)) {
      if (existsSync(path.join(curr, "pnpm-workspace.yaml"))) break;
      curr = path.dirname(curr);
    }
    repo = new RepositoryService(curr, tempDir);
    await seedQuestionBankFixtures(repo);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it("reads taxonomy with 9 domains synced from knowledge base", async () => {
    const taxonomy = await repo.readQuestionBankTaxonomy();
    expect(taxonomy.domains.length).toBeGreaterThanOrEqual(9);
    const nature = taxonomy.domains.find((d) => d.id === "nature_animals");
    expect(nature).toBeDefined();
    expect(nature?.title).toContain("Nature & Animals");
  });

  it("reads and recalculates index", async () => {
    const index = await repo.readQuestionBankIndex();
    expect(index.target_total).toBe(20000);
    expect(index.current_total).toBeGreaterThanOrEqual(10);

    const recalculated = await repo.recalculateQuestionBankIndex();
    expect(recalculated.target_total).toBe(20000);
    expect(recalculated.current_total).toBeGreaterThanOrEqual(10);
    expect(recalculated.by_archetype.verdict_fact_myth).toBeGreaterThanOrEqual(5);
    expect(recalculated.by_archetype.speed_blitz).toBeGreaterThanOrEqual(5);
  });

  it("calculates 20,000 combo matrix coverage through repository", async () => {
    const coverage = await repo.getQuestionBankMatrixCoverage();
    expect(coverage.total_combos).toBe(20000);
    expect(coverage.covered_combos).toBeGreaterThanOrEqual(0);
    expect(Object.keys(coverage.by_domain).length).toBe(14);
    expect(Object.keys(coverage.by_archetype).length).toBe(8);
  });

  it("queries questions with filters and pagination", async () => {
    // 1. All questions
    const all = await repo.queryQuestionBankQuestions();
    expect(all.total).toBeGreaterThanOrEqual(10);
    expect(all.questions.length).toBeGreaterThanOrEqual(10);

    // 2. Filter by archetype
    const vfm = await repo.queryQuestionBankQuestions({ archetypeId: "verdict_fact_myth" });
    expect(vfm.total).toBeGreaterThanOrEqual(5);
    expect(vfm.questions.every((q) => q.archetype_id === "verdict_fact_myth")).toBe(true);

    // 3. Search keyword
    const search = await repo.queryQuestionBankQuestions({ search: "octopus" });
    expect(search.total).toBeGreaterThanOrEqual(1);
    expect(search.questions[0].question.toLowerCase()).toContain("octopus");

    // 4. Pagination
    const page1 = await repo.queryQuestionBankQuestions({ limit: 2, offset: 0 });
    expect(page1.questions.length).toBe(2);
  });

  it("accurately calculates 30-day Cooldown for specific channel without affecting other channels", async () => {
    // Mock readQuestionHistory for channel_a to simulate rendered questions
    const originalReadQuestionHistory = repo.readQuestionHistory;
    const nowIso = new Date().toISOString();

    repo.readQuestionHistory = async function (channelId: string) {
      if (channelId === "channel_a") {
        return [
          {
            question_id: "VFM-NAT-OCN-0001",
            question_text: "Blue whales are the largest animals ever known to have lived on Earth, larger than any dinosaur. Fact or Myth?",
            normalized_question:
              "blue whales are the largest animals ever known to have lived on earth larger than any dinosaur fact or myth",
            choices: ["Fact", "Myth"],
            correct_answer: "Fact",
            episode_id: "ep-001",
            episode_title: "Episode 1: Ocean Giants",
            channel_id: "channel_a",
            rendered_at: nowIso,
          },
        ];
      }
      return [];
    };

    try {
      // Query for channel_a: VFM-NAT-OCN-0001 must be on cooldown!
      const resultA = await repo.queryQuestionBankQuestions({ channelId: "channel_a" });
      const coolQ = resultA.questions.find((q) => q.id === "VFM-NAT-OCN-0001");
      expect(coolQ).toBeDefined();
      expect(coolQ?.channel_cooldown?.is_cooldown).toBe(true);
      expect(coolQ?.channel_cooldown?.days_remaining).toBeGreaterThanOrEqual(29);
      expect(coolQ?.channel_cooldown?.episode_title).toBe("Episode 1: Ocean Giants");

      // Other questions in channel_a must NOT be on cooldown
      const otherQ = resultA.questions.find((q) => q.id === "VFM-NAT-OCN-0002");
      expect(otherQ?.channel_cooldown?.is_cooldown).toBe(false);

      // Query for channel_b: VFM-NAT-OCN-0001 must NOT be on cooldown!
      const resultB = await repo.queryQuestionBankQuestions({ channelId: "channel_b" });
      const coolQInB = resultB.questions.find((q) => q.id === "VFM-NAT-OCN-0001");
      expect(coolQInB?.channel_cooldown?.is_cooldown).toBe(false);

      // Test readyOnly filter for channel_a: coolQ should be excluded
      const readyOnlyA = await repo.queryQuestionBankQuestions({ channelId: "channel_a", readyOnly: true });
      expect(readyOnlyA.questions.some((q) => q.id === "VFM-NAT-OCN-0001")).toBe(false);

      // Test cooldownOnly filter for channel_a: coolQ should be the only one
      const cooldownOnlyA = await repo.queryQuestionBankQuestions({ channelId: "channel_a", cooldownOnly: true });
      expect(cooldownOnlyA.total).toBe(1);
      expect(cooldownOnlyA.questions[0].id).toBe("VFM-NAT-OCN-0001");
    } finally {
      repo.readQuestionHistory = originalReadQuestionHistory;
    }
  });

  it("supports saving and deleting questions", async () => {
    const testQuestion: BankQuestion = {
      id: "SPB-LOG-TRK-TEST99",
      archetype_id: "speed_blitz",
      domain_id: "logic_puzzles",
      subtopic_id: "tricky_riddles",
      question: "CRUD test question?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Option 1", is_correct: true },
        { id: "B", text: "Option 2", is_correct: false },
        { id: "C", text: "Option 3", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Explanation for CRUD test question",
      age_band: "family",
      difficulty: 1,
      tags: ["test", "crud"],
      status: "approved",
    };

    // 1. Save new question
    await repo.saveQuestionBankQuestion(testQuestion);

    // 2. Query to verify it exists
    const fetched = await repo.getQuestionBankQuestion("SPB-LOG-TRK-TEST99");
    expect(fetched).toBeDefined();
    expect(fetched?.question).toBe("CRUD test question?");

    // 3. Delete question
    const deleted = await repo.deleteQuestionBankQuestion("SPB-LOG-TRK-TEST99");
    expect(deleted).toBe(true);

    // 4. Verify gone
    const fetchedAfter = await repo.getQuestionBankQuestion("SPB-LOG-TRK-TEST99");
    expect(fetchedAfter).toBeNull();
  });

  it("saves and caches multilingual translations atomically in subtopic batch JSON", async () => {
    const questionId = "VFM-NAT-OCN-0001";
    const original = await repo.getQuestionBankQuestion(questionId);
    expect(original).toBeDefined();

    const esTranslation: BankTranslationContent = {
      language: "es",
      question: "¿Es la ballena azul el animal más grande del planeta?",
      choices: [
        { id: "A", text: "VERDADERO" },
        { id: "B", text: "FALSO" },
      ],
      explanation: "La ballena azul puede medir más de 30 metros y pesar 200 toneladas.",
      fun_fact: "El corazón de una ballena azul pesa como un auto compacto.",
      verified: true,
    };

    // 1. Save translation for existing question
    const updated = await repo.saveQuestionBankTranslation(questionId, esTranslation);
    expect(updated).toBeDefined();
    expect(updated?.translations?.es).toBeDefined();
    expect(updated?.translations?.es?.question).toContain("ballena azul");
    expect(updated?.translations?.es?.verified).toBe(true);

    // 2. Fetch via getQuestionBankQuestion to confirm persistence
    const refetched = await repo.getQuestionBankQuestion(questionId);
    expect(refetched?.translations?.es).toBeDefined();
    expect(refetched?.translations?.es?.explanation).toContain("30 metros");

    // 3. Attempting to save translation for non-existent question returns null
    const nonExistent = await repo.saveQuestionBankTranslation("NON-EXISTENT-999", esTranslation);
    expect(nonExistent).toBeNull();
  });

  it("filters questions by hasTranslationFor and supports multilingual keyword search", async () => {
    await repo.saveQuestionBankTranslation("VFM-NAT-OCN-0001", {
      language: "es",
      question: "¿Es la ballena azul el animal más grande del planeta?",
      choices: [
        { id: "A", text: "VERDADERO" },
        { id: "B", text: "FALSO" },
      ],
      explanation: "La ballena azul puede medir más de 30 metros y pesar 200 toneladas.",
      fun_fact: "El corazón de una ballena azul pesa como un auto compacto.",
      verified: true,
    });

    // 1. Query questions that have translation for "es"
    const esQuestions = await repo.queryQuestionBankQuestions({ hasTranslationFor: "es" });
    expect(esQuestions.total).toBeGreaterThanOrEqual(1);
    expect(esQuestions.questions.some((q) => q.id === "VFM-NAT-OCN-0001")).toBe(true);

    // 2. Query questions that have translation for a language with no translations (e.g. "th")
    const thQuestions = await repo.queryQuestionBankQuestions({ hasTranslationFor: "th" });
    expect(thQuestions.total).toBe(0);

    // 3. Search query matching Spanish translation text ("auto compacto")
    const searchResult = await repo.queryQuestionBankQuestions({ search: "auto compacto" });
    expect(searchResult.total).toBeGreaterThanOrEqual(1);
    expect(searchResult.questions[0].id).toBe("VFM-NAT-OCN-0001");

    // Clean up test translation
    const cleanQ = await repo.getQuestionBankQuestion("VFM-NAT-OCN-0001");
    if (cleanQ) {
      cleanQ.translations = {};
      await repo.saveQuestionBankQuestion(cleanQ);
    }
  });

  it("sorts query results newest first by default", async () => {
    const res = await repo.queryQuestionBankQuestions({ limit: 10 });
    expect(res.questions.length).toBeGreaterThan(1);
    for (let i = 0; i < res.questions.length - 1; i++) {
      const timeCurrent = new Date(res.questions[i].updated_at || res.questions[i].created_at || 0).getTime();
      const timeNext = new Date(res.questions[i + 1].updated_at || res.questions[i + 1].created_at || 0).getTime();
      expect(timeCurrent).toBeGreaterThanOrEqual(timeNext);
    }
  });
});

export async function seedQuestionBankFixtures(repo: RepositoryService): Promise<void> {
  const vfmQuestions: BankQuestion[] = [
    {
      id: "VFM-NAT-OCN-0001",
      archetype_id: "verdict_fact_myth",
      domain_id: "nature_animals",
      subtopic_id: "marine_life",
      question: "Blue whales are the largest animals ever known to have lived on Earth, larger than any dinosaur. Fact or Myth?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Fact", is_correct: true },
        { id: "B", text: "Myth", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Blue whales can reach lengths of up to 30 meters and weigh as much as 200 tons.",
      age_band: "family",
      difficulty: 1,
      tags: ["nature", "ocean"],
      status: "approved",
      language: "en",
    },
    {
      id: "VFM-NAT-OCN-0002",
      archetype_id: "verdict_fact_myth",
      domain_id: "nature_animals",
      subtopic_id: "marine_life",
      question: "Sharks are mammals. Fact or Myth?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Fact", is_correct: false },
        { id: "B", text: "Myth", is_correct: true },
      ],
      correct_choice_id: "B",
      explanation: "Sharks are cartilaginous fish, not mammals.",
      age_band: "family",
      difficulty: 1,
      tags: ["nature", "sharks"],
      status: "approved",
      language: "en",
    },
    {
      id: "VFM-NAT-OCN-0003",
      archetype_id: "verdict_fact_myth",
      domain_id: "nature_animals",
      subtopic_id: "marine_life",
      question: "Coral reefs are made of animals, not plants. Fact or Myth?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Fact", is_correct: true },
        { id: "B", text: "Myth", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Corals are colonies of tiny animals called polyps.",
      age_band: "family",
      difficulty: 1,
      tags: ["nature", "coral"],
      status: "approved",
      language: "en",
    },
    {
      id: "VFM-NAT-OCN-0004",
      archetype_id: "verdict_fact_myth",
      domain_id: "nature_animals",
      subtopic_id: "marine_life",
      question: "Goldfish have a memory span of only three seconds. Fact or Myth?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Fact", is_correct: false },
        { id: "B", text: "Myth", is_correct: true },
      ],
      correct_choice_id: "B",
      explanation: "Scientific research shows goldfish can remember things for months.",
      age_band: "family",
      difficulty: 1,
      tags: ["nature", "fish"],
      status: "approved",
      language: "en",
    },
    {
      id: "VFM-NAT-OCN-0005",
      archetype_id: "verdict_fact_myth",
      domain_id: "nature_animals",
      subtopic_id: "marine_life",
      question: "Sea otters hold hands while sleeping so they do not drift apart. Fact or Myth?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Fact", is_correct: true },
        { id: "B", text: "Myth", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Sea otters often hold hands or wrap in kelp while sleeping.",
      age_band: "family",
      difficulty: 1,
      tags: ["nature", "otters"],
      status: "approved",
      language: "en",
    },
  ];

  const spbQuestions: BankQuestion[] = [
    {
      id: "SPB-NAT-OCN-0001",
      archetype_id: "speed_blitz",
      domain_id: "nature_animals",
      subtopic_id: "marine_life",
      question: "How many hearts does an octopus have?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "3", is_correct: true },
        { id: "B", text: "1", is_correct: false },
        { id: "C", text: "2", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "An octopus has three hearts: two pump blood to gills, one to body.",
      age_band: "family",
      difficulty: 1,
      tags: ["nature", "octopus"],
      status: "approved",
      language: "en",
    },
    {
      id: "SPB-NAT-OCN-0002",
      archetype_id: "speed_blitz",
      domain_id: "nature_animals",
      subtopic_id: "nature_wonders",
      question: "Which insect resembles a wooden stick?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Stick insect", is_correct: true },
        { id: "B", text: "Beetle", is_correct: false },
        { id: "C", text: "Ant", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Stick insects use camouflage to look like twigs and sticks.",
      age_band: "family",
      difficulty: 1,
      tags: ["nature", "insects"],
      status: "approved",
      language: "en",
    },
    {
      id: "SPB-NAT-OCN-0003",
      archetype_id: "speed_blitz",
      domain_id: "nature_animals",
      subtopic_id: "marine_life",
      question: "What is the fastest marine creature?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Sailfish", is_correct: true },
        { id: "B", text: "Tuna", is_correct: false },
        { id: "C", text: "Dolphin", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Sailfish can reach speeds exceeding 68 mph.",
      age_band: "family",
      difficulty: 1,
      tags: ["nature", "fish"],
      status: "approved",
      language: "en",
    },
    {
      id: "SPB-NAT-OCN-0004",
      archetype_id: "speed_blitz",
      domain_id: "nature_animals",
      subtopic_id: "marine_life",
      question: "Which sea creature has no brain and no heart?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Jellyfish", is_correct: true },
        { id: "B", text: "Starfish", is_correct: false },
        { id: "C", text: "Crab", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Jellyfish lack a brain, heart, and bones.",
      age_band: "family",
      difficulty: 1,
      tags: ["nature", "jellyfish"],
      status: "approved",
      language: "en",
    },
    {
      id: "SPB-NAT-OCN-0005",
      archetype_id: "speed_blitz",
      domain_id: "nature_animals",
      subtopic_id: "marine_life",
      question: "What is the largest species of shark?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Whale shark", is_correct: true },
        { id: "B", text: "Great white shark", is_correct: false },
        { id: "C", text: "Tiger shark", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Whale sharks can grow over 40 feet long.",
      age_band: "family",
      difficulty: 1,
      tags: ["nature", "shark"],
      status: "approved",
      language: "en",
    },
  ];

  for (const q of [...vfmQuestions, ...spbQuestions]) {
    await repo.saveQuestionBankQuestion(q);
  }
}
