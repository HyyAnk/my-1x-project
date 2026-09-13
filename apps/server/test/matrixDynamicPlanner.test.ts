import { describe, it, expect } from "vitest";
import type { BankQuestion } from "@studio/shared";
import { getDynamicDeficitChunk } from "../src/quiz/bank/matrixCoverageService.js";
import { loadAllKnowledgeEntities } from "../src/quiz/bank/knowledgeBaseLoader.js";
import { MatrixCoverageCache } from "../src/quiz/bank/matrix/matrixCoverageCache.js";

describe("matrixDynamicPlanner (getDynamicDeficitChunk)", () => {
  const entities = loadAllKnowledgeEntities();

  it("dynamically returns the highest-deficit chunk on-demand", () => {
    const questions: BankQuestion[] = [];
    const chunk = getDynamicDeficitChunk(questions, {
      mode: "auto",
      chunkIndex: 0,
      totalChunks: 5,
      chunkSize: 20,
      entities,
    });

    expect(chunk.chunkIndex).toBe(0);
    expect(chunk.totalChunks).toBe(5);
    expect(chunk.chunkSize).toBe(20);
    expect(chunk.candidates.length).toBe(20);
    expect(chunk.domainId).toBeDefined();
    expect(chunk.archetypeId).toBeDefined();

    // Verify all candidates have 0 variants since questions array is empty
    for (const c of chunk.candidates) {
      expect(c.current_variants).toBe(0);
      expect(c.domain_id).toBe(chunk.domainId);
      expect(c.archetype_id).toBe(chunk.archetypeId);
    }
  });

  it("respects excludeEntityIds to prevent concurrent worker collisions", () => {
    const questions: BankQuestion[] = [];
    const chunk1 = getDynamicDeficitChunk(questions, {
      mode: "auto",
      chunkIndex: 0,
      totalChunks: 5,
      chunkSize: 10,
      entities,
    });

    const excludedIds = new Set(chunk1.candidates.map((c) => c.entity_id));
    expect(excludedIds.size).toBe(10);

    const chunk2 = getDynamicDeficitChunk(questions, {
      mode: "auto",
      chunkIndex: 1,
      totalChunks: 5,
      chunkSize: 10,
      entities,
      excludeEntityIds: excludedIds,
    });

    expect(chunk2.candidates.length).toBe(10);
    // Crucial check: none of the candidates in chunk2 should be in chunk1
    for (const c of chunk2.candidates) {
      expect(excludedIds.has(c.entity_id)).toBe(false);
    }
  });

  it("dynamically adapts candidate selection using in-memory MatrixCoverageCache", () => {
    const cache = new MatrixCoverageCache();
    // Warm cache with some mock questions in space_earth speed_blitz
    const mockQuestions: BankQuestion[] = Array.from({ length: 15 }, (_, i) => ({
      id: `q_space_${i}`,
      entity_id: `solar_system_planet_${i}`,
      archetype_id: "speed_blitz",
      domain_id: "space_earth",
      subtopic_id: "astronomy",
      language: "en",
      question: `Question ${i}`,
      format: "multiple_choice",
      choices: [
        { id: "c1", text: "A" },
        { id: "c2", text: "B" },
      ],
      correct_choice_id: "c1",
      explanation: "Test",
      age_band: "family",
      difficulty: 2,
      tags: [],
      status: "approved",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    for (const q of mockQuestions) {
      cache.onQuestionSaved(q);
    }

    const chunk = getDynamicDeficitChunk([], {
      mode: "auto",
      chunkSize: 10,
      coverageCache: cache,
      entities,
    });

    expect(chunk.candidates.length).toBe(10);
    // Should prioritize least-variant or unfilled combinations
    for (const c of chunk.candidates) {
      expect(c.current_variants).toBe(0);
    }
  });

  it("supports manual mode with subtopic and archetype filtering", () => {
    const questions: BankQuestion[] = [];
    const chunk = getDynamicDeficitChunk(questions, {
      mode: "manual",
      chunkIndex: 0,
      totalChunks: 2,
      chunkSize: 15,
      domainId: "nature_animals",
      archetypeId: "deep_trivia",
      entities,
    });

    expect(chunk.candidates.length).toBe(15);
    expect(chunk.domainId).toBe("nature_animals");
    expect(chunk.archetypeId).toBe("deep_trivia");

    for (const c of chunk.candidates) {
      expect(c.domain_id).toBe("nature_animals");
      expect(c.archetype_id).toBe("deep_trivia");
    }
  });
});
