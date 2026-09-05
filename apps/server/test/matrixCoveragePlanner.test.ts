import { describe, it, expect } from "vitest";
import type { BankQuestion } from "@studio/shared";
import { planBatchChunks } from "../src/quiz/bank/matrixCoverageService.js";
import { loadAllKnowledgeEntities } from "../src/quiz/bank/knowledgeBaseLoader.js";

describe("matrixCoveragePlanner (planBatchChunks)", () => {
  const entities = loadAllKnowledgeEntities();

  it("plans 100 questions into 5 chunks with 0 entity collisions across chunks", () => {
    const questions: BankQuestion[] = [];
    const planned = planBatchChunks(questions, {
      mode: "auto",
      targetCount: 100,
      chunkSize: 20,
      entities,
    });

    expect(planned.length).toBe(5);

    const allEntityIdsAcrossChunks: string[] = [];
    const domainsSeen = new Set<string>();
    const archetypesSeen = new Set<string>();

    for (const chunk of planned) {
      expect(chunk.chunkSize).toBe(20);
      expect(chunk.candidates.length).toBe(20);

      // Verify domain and archetype assignment
      expect(chunk.domainId).toBeDefined();
      expect(chunk.archetypeId).toBeDefined();
      domainsSeen.add(chunk.domainId);
      archetypesSeen.add(chunk.archetypeId);

      // Verify entity uniqueness within chunk
      const chunkEntityIds = chunk.candidates.map((c) => c.entity_id);
      expect(new Set(chunkEntityIds).size).toBe(20);

      allEntityIdsAcrossChunks.push(...chunkEntityIds);
    }

    // Crucial check: 0 duplicate entities across all 5 chunks (100 distinct entities)
    expect(allEntityIdsAcrossChunks.length).toBe(100);
    expect(new Set(allEntityIdsAcrossChunks).size).toBe(100);

    // Balanced round-robin across chunks: should rotate to multiple domains & archetypes
    expect(domainsSeen.size).toBeGreaterThanOrEqual(4);
    expect(archetypesSeen.size).toBeGreaterThanOrEqual(4);
  });

  it("plans 200 questions into 10 chunks cycling all 8 gameplay archetypes", () => {
    const questions: BankQuestion[] = [];
    const planned = planBatchChunks(questions, {
      mode: "auto",
      targetCount: 200,
      chunkSize: 20,
      entities,
    });

    expect(planned.length).toBe(10);

    const archetypesSeen = new Set<string>();
    const allEntityIds: string[] = [];

    for (const chunk of planned) {
      archetypesSeen.add(chunk.archetypeId);
      allEntityIds.push(...chunk.candidates.map((c) => c.entity_id));
    }

    // 10 chunks must cover all 8 gameplay archetypes in the game matrix
    expect(archetypesSeen.size).toBe(8);

    // 200 total distinct entities
    expect(new Set(allEntityIds).size).toBe(200);
  });

  it("rotates archetypes and prevents entity collision when locked to a single domain", () => {
    const questions: BankQuestion[] = [];
    const planned = planBatchChunks(questions, {
      mode: "auto",
      targetCount: 60,
      chunkSize: 20,
      domainId: "space_earth",
      entities,
    });

    expect(planned.length).toBe(3);

    const archetypesSeen = new Set<string>();
    const allEntityIds: string[] = [];

    for (const chunk of planned) {
      expect(chunk.domainId).toBe("space_earth");
      archetypesSeen.add(chunk.archetypeId);
      allEntityIds.push(...chunk.candidates.map((c) => c.entity_id));
    }

    // Archetypes rotate across consecutive chunks in the same domain
    expect(archetypesSeen.size).toBe(3);

    // 60 distinct entities from space_earth
    expect(new Set(allEntityIds).size).toBe(60);
  });

  it("handles non-multiples of chunkSize correctly (e.g. 45 questions -> 20, 20, 5)", () => {
    const questions: BankQuestion[] = [];
    const planned = planBatchChunks(questions, {
      mode: "auto",
      targetCount: 45,
      chunkSize: 20,
      entities,
    });

    expect(planned.length).toBe(3);
    expect(planned[0].chunkSize).toBe(20);
    expect(planned[0].candidates.length).toBe(20);

    expect(planned[1].chunkSize).toBe(20);
    expect(planned[1].candidates.length).toBe(20);

    expect(planned[2].chunkSize).toBe(5);
    expect(planned[2].candidates.length).toBe(5);

    const allEntityIds = planned.flatMap((p) => p.candidates.map((c) => c.entity_id));
    expect(allEntityIds.length).toBe(45);
    expect(new Set(allEntityIds).size).toBe(45);
  });

  it("supports manual mode chunk planning", () => {
    const questions: BankQuestion[] = [];
    const planned = planBatchChunks(questions, {
      mode: "manual",
      targetCount: 30,
      chunkSize: 15,
      domainId: "nature_animals",
      archetypeId: "deep_trivia",
      entities,
    });

    expect(planned.length).toBe(2);
    expect(planned[0].candidates.length).toBe(15);
    expect(planned[1].candidates.length).toBe(15);

    for (const chunk of planned) {
      expect(chunk.domainId).toBe("nature_animals");
      expect(chunk.archetypeId).toBe("deep_trivia");
    }

    const allEntityIds = planned.flatMap((p) => p.candidates.map((c) => c.entity_id));
    expect(new Set(allEntityIds).size).toBe(30);
  });
});
