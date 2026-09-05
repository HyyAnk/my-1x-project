import { describe, expect, it } from "vitest";
import type { BankQuestion } from "@studio/shared";
import {
  clearKnowledgeBaseCache,
  getAllKnowledgeDomains,
  getEntitiesByDomain,
  getEntitiesByDomainAndSubtopic,
  getEntityById,
  getKnowledgeBaseStats,
  loadAllKnowledgeEntities,
} from "../src/quiz/bank/knowledgeBaseLoader.js";
import {
  ALL_MATRIX_ARCHETYPES,
  buildMatrixCoverageMap,
  calculateMatrixCoverageStats,
  selectAutoCandidates,
  selectManualCandidates,
} from "../src/quiz/bank/matrixCoverageService.js";

describe("Knowledge Base Loader", () => {
  it("loads exactly 2,500 entities across 14 domains", () => {
    clearKnowledgeBaseCache();
    const entities = loadAllKnowledgeEntities();
    expect(entities.length).toBe(2500);

    const domains = getAllKnowledgeDomains();
    expect(domains.length).toBe(14);
  });

  it("provides fast O(1) lookup by entity ID", () => {
    const lion = getEntityById("ENT-ANI-001");
    expect(lion).toBeDefined();
    expect(lion?.name).toBe("Lion");
    expect(lion?.domain_id).toBe("nature_animals");
    expect(lion?.subtopic_id).toBe("mammals");
    expect(lion?.core_traits.length).toBeGreaterThan(0);
    expect(lion?.facts_and_myths.length).toBeGreaterThan(0);
  });

  it("filters entities by domain and subtopic", () => {
    const marineLife = getEntitiesByDomainAndSubtopic("nature_animals", "marine_life");
    expect(marineLife.length).toBeGreaterThan(0);
    for (const e of marineLife) {
      expect(e.domain_id).toBe("nature_animals");
      expect(e.subtopic_id).toBe("marine_life");
    }

    const natureAnimals = getEntitiesByDomain("nature_animals");
    expect(natureAnimals.length).toBe(350);
  });

  it("calculates knowledge base domain statistics correctly", () => {
    const stats = getKnowledgeBaseStats();
    expect(stats.totalEntities).toBe(2500);
    expect(Object.keys(stats.domainCounts).length).toBe(14);
    expect(stats.domainCounts.nature_animals).toBe(350);
    expect(stats.domainCounts.vehicles_technology).toBe(300);
    expect(stats.domainCounts.pop_culture_classics).toBe(300);
    expect(stats.domainCounts.food_gastronomy).toBe(250);
    expect(stats.domainCounts.space_earth).toBe(250);
    expect(stats.domainCounts.daily_objects).toBe(150);
    expect(stats.domainCounts.careers_occupations).toBe(150);
    expect(stats.domainCounts.human_body).toBe(150);
    expect(stats.domainCounts.mythology_creatures).toBe(150);
    expect(stats.domainCounts.countries_nations).toBe(100);
    expect(stats.domainCounts.places_facilities).toBe(100);
    expect(stats.domainCounts.sports_games).toBe(100);
    expect(stats.domainCounts.music_instruments_gear).toBe(80);
    expect(stats.domainCounts.school_learning).toBe(70);
  });
});

describe("Matrix Coverage Service", () => {
  const mockSampleQuestions: BankQuestion[] = [
    {
      id: "VFM-ANI-0001",
      archetype_id: "verdict_fact_myth",
      domain_id: "nature_animals",
      subtopic_id: "marine_life",
      entity_id: "ENT-ANI-001",
      format: "true_false",
      question: "Blue whales are bigger than any known dinosaur. Fact or Myth?",
      choices: [
        { id: "A", text: "Fact", is_correct: true },
        { id: "B", text: "Myth", is_correct: false },
      ],
      explanation: "The blue whale is the largest animal ever known to have lived.",
      thinking_seconds: 5,
      visual_spec: {
        intent: "question_illustration",
        prompt: "A massive blue whale swimming in crystal clear deep ocean waters.",
      },
      difficulty: 1,
      tags: ["nature", "animals", "ocean"],
      status: "approved",
      quality_score: 95,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "DTR-ANI-0001",
      archetype_id: "deep_trivia",
      domain_id: "nature_animals",
      subtopic_id: "marine_life",
      entity_id: "ENT-ANI-001",
      format: "multiple_choice",
      question: "Approximately how much can an adult blue whale's tongue weigh?",
      choices: [
        { id: "A", text: "About the weight of an elephant", is_correct: true },
        { id: "B", text: "About 50 kilograms", is_correct: false },
        { id: "C", text: "About 500 kilograms", is_correct: false },
        { id: "D", text: "About 10 tons", is_correct: false },
      ],
      explanation: "A blue whale's tongue alone can weigh as much as an entire adult elephant.",
      thinking_seconds: 6,
      visual_spec: {
        intent: "question_illustration",
        prompt: "Cinematic close-up of a majestic blue whale.",
      },
      difficulty: 2,
      tags: ["whale", "biology"],
      status: "approved",
      quality_score: 90,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "LEGACY-0001",
      archetype_id: "speed_blitz",
      domain_id: "nature_animals",
      subtopic_id: "mammals",
      // Notice: No entity_id (backward compatibility test for legacy questions)
      format: "multiple_choice",
      question: "Which mammal can truly fly?",
      choices: [
        { id: "A", text: "Bat", is_correct: true },
        { id: "B", text: "Flying Squirrel", is_correct: false },
        { id: "C", text: "Sugar Glider", is_correct: false },
      ],
      explanation: "Bats are the only mammals capable of true, sustained flight.",
      thinking_seconds: 4,
      visual_spec: { intent: "none" },
      difficulty: 1,
      tags: ["animals"],
      status: "approved",
      quality_score: 92,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it("builds matrix coverage map correctly ignoring legacy questions without entity_id", () => {
    const map = buildMatrixCoverageMap(mockSampleQuestions);
    expect(map.get("verdict_fact_myth:ENT-ANI-001")).toBe(1);
    expect(map.get("deep_trivia:ENT-ANI-001")).toBe(1);
    expect(map.get("speed_blitz:ENT-ANI-001")).toBeUndefined();
    expect(map.size).toBe(2);
  });

  it("calculates matrix coverage statistics across all 20,000 combos", () => {
    const stats = calculateMatrixCoverageStats(mockSampleQuestions);

    expect(stats.total_combos).toBe(20000); // 2,500 entities * 8 archetypes
    expect(stats.covered_combos).toBe(2);
    expect(stats.total_variants).toBe(2);
    expect(stats.coverage_percent).toBeCloseTo((2 / 20000) * 100, 1);

    // Check domain breakdown
    expect(stats.by_domain.nature_animals).toBeDefined();
    expect(stats.by_domain.nature_animals.total_entities).toBe(350);
    expect(stats.by_domain.nature_animals.total_combos).toBe(350 * 8); // 2,800
    expect(stats.by_domain.nature_animals.covered_combos).toBe(2);

    // Check archetype breakdown
    expect(stats.by_archetype.verdict_fact_myth.covered_combos).toBe(1);
    expect(stats.by_archetype.deep_trivia.covered_combos).toBe(1);
    expect(stats.by_archetype.versus_faceoff.covered_combos).toBe(0);
    expect(stats.by_archetype.versus_faceoff.total_combos).toBe(2500);
  });

  it("selectAutoCandidates selects empty combos (0 variants) first", () => {
    const candidates = selectAutoCandidates(mockSampleQuestions, {
      count: 5,
      domain_id: "nature_animals",
    });

    expect(candidates.length).toBe(5);
    for (const c of candidates) {
      expect(c.current_variants).toBe(0);
      expect(c.domain_id).toBe("nature_animals");
      // ENT-ANI-001 + verdict_fact_myth should NOT be selected because it already has 1 variant
      if (c.entity_id === "ENT-ANI-001") {
        expect(c.archetype_id).not.toBe("verdict_fact_myth");
        expect(c.archetype_id).not.toBe("deep_trivia");
      }
    }
  });

  it("selectManualCandidates uses Least-Variant-First prioritization", () => {
    const candidates = selectManualCandidates(mockSampleQuestions, {
      count: 4,
      domain_id: "nature_animals",
      subtopic_id: "marine_life",
      archetype_ids: ["verdict_fact_myth", "deep_trivia"],
    });

    expect(candidates.length).toBe(4);
    // Combos with 0 variants must precede combos with 1 variant
    const variantCounts = candidates.map((c) => c.current_variants);
    for (let i = 0; i < variantCounts.length - 1; i++) {
      expect(variantCounts[i]).toBeLessThanOrEqual(variantCounts[i + 1]);
    }
  });

  it("enforces batch cohesion with exactly 1 domain, 1 archetype, and 20 distinct entities", () => {
    const batch = selectAutoCandidates([], { count: 20 });
    expect(batch.length).toBe(20);

    const firstDomain = batch[0].domain_id;
    const firstArchetype = batch[0].archetype_id;

    // All 20 items share the same domain and archetype
    for (const c of batch) {
      expect(c.domain_id).toBe(firstDomain);
      expect(c.archetype_id).toBe(firstArchetype);
      expect(c.current_variants).toBe(0);
    }

    // All 20 entity IDs must be distinct
    const entityIds = new Set(batch.map((c) => c.entity_id));
    expect(entityIds.size).toBe(20);
  });

  it("rotates domain and archetype across consecutive batches in balanced round-robin", () => {
    const simulatedBank: BankQuestion[] = [];

    // Batch 1: Select 20 candidates
    const batch1 = selectAutoCandidates(simulatedBank, { count: 20 });
    expect(batch1.length).toBe(20);
    const domain1 = batch1[0].domain_id;
    const arch1 = batch1[0].archetype_id;

    // Simulate saving batch 1
    for (const c of batch1) {
      simulatedBank.push({
        id: `MOCK-${c.archetype_id}-${c.entity_id}`,
        archetype_id: c.archetype_id,
        domain_id: c.domain_id,
        subtopic_id: c.subtopic_id,
        entity_id: c.entity_id,
        format: "multiple_choice",
        question: `Question for ${c.entity_name}`,
        choices: [
          { id: "A", text: "Correct", is_correct: true },
          { id: "B", text: "Wrong", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Test explanation",
        status: "approved",
        age_band: "family",
        difficulty: 2,
        tags: ["test"],
      });
    }

    // Batch 2: Should rotate to a DIFFERENT domain AND a DIFFERENT archetype
    const batch2 = selectAutoCandidates(simulatedBank, { count: 20 });
    expect(batch2.length).toBe(20);
    const domain2 = batch2[0].domain_id;
    const arch2 = batch2[0].archetype_id;

    expect(domain2).not.toBe(domain1);
    expect(arch2).not.toBe(arch1);

    // Simulate saving batch 2
    for (const c of batch2) {
      simulatedBank.push({
        id: `MOCK-${c.archetype_id}-${c.entity_id}`,
        archetype_id: c.archetype_id,
        domain_id: c.domain_id,
        subtopic_id: c.subtopic_id,
        entity_id: c.entity_id,
        format: "multiple_choice",
        question: `Question for ${c.entity_name}`,
        choices: [
          { id: "A", text: "Correct", is_correct: true },
          { id: "B", text: "Wrong", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Test explanation",
        status: "approved",
        age_band: "family",
        difficulty: 2,
        tags: ["test"],
      });
    }

    // Batch 3: Should rotate again
    const batch3 = selectAutoCandidates(simulatedBank, { count: 20 });
    expect(batch3.length).toBe(20);
    const domain3 = batch3[0].domain_id;
    const arch3 = batch3[0].archetype_id;

    expect([domain1, domain2]).not.toContain(domain3);
    expect([arch1, arch2]).not.toContain(arch3);
  });

  it("backfills same-domain least-variant entities when unfilled count is fewer than targetCount", () => {
    // Mock entities for a small test domain with 3 entities
    const mockEntities = [
      {
        id: "TEST-E1",
        domain_id: "test_domain",
        subtopic_id: "test_sub",
        name: "Entity One",
        language: "en" as const,
        visual_anchor: "Anchor 1",
        core_traits: ["Trait 1"],
        facts_and_myths: [],
      },
      {
        id: "TEST-E2",
        domain_id: "test_domain",
        subtopic_id: "test_sub",
        name: "Entity Two",
        language: "en" as const,
        visual_anchor: "Anchor 2",
        core_traits: ["Trait 2"],
        facts_and_myths: [],
      },
      {
        id: "TEST-E3",
        domain_id: "test_domain",
        subtopic_id: "test_sub",
        name: "Entity Three",
        language: "en" as const,
        visual_anchor: "Anchor 3",
        core_traits: ["Trait 3"],
        facts_and_myths: [],
      },
    ];

    // E1 and E2 already have 1 variant in speed_blitz; E3 has 0 variants
    const mockQuestions: BankQuestion[] = [
      {
        id: "MOCK-1",
        archetype_id: "speed_blitz",
        domain_id: "test_domain",
        subtopic_id: "test_sub",
        entity_id: "TEST-E1",
        format: "multiple_choice",
        question: "Q1",
        choices: [{ id: "A", text: "A", is_correct: true }],
        correct_choice_id: "A",
        explanation: "Exp",
        status: "approved",
        age_band: "family",
        difficulty: 2,
        tags: [],
      },
      {
        id: "MOCK-2",
        archetype_id: "speed_blitz",
        domain_id: "test_domain",
        subtopic_id: "test_sub",
        entity_id: "TEST-E2",
        format: "multiple_choice",
        question: "Q2",
        choices: [{ id: "A", text: "A", is_correct: true }],
        correct_choice_id: "A",
        explanation: "Exp",
        status: "approved",
        age_band: "family",
        difficulty: 2,
        tags: [],
      },
    ];

    // Request 3 candidates for test_domain with speed_blitz
    const candidates = selectAutoCandidates(mockQuestions, {
      count: 3,
      domain_id: "test_domain",
      archetype_ids: ["speed_blitz"],
      entities: mockEntities,
    });

    expect(candidates.length).toBe(3);
    // E3 must be first because current_variants == 0
    expect(candidates[0].entity_id).toBe("TEST-E3");
    expect(candidates[0].current_variants).toBe(0);

    // Remaining slots backfilled from E1 and E2 with variant == 1
    expect(candidates[1].current_variants).toBe(1);
    expect(candidates[2].current_variants).toBe(1);

    // All 3 entities in the batch must be distinct
    const entityIds = new Set(candidates.map((c) => c.entity_id));
    expect(entityIds.size).toBe(3);
  });
});
