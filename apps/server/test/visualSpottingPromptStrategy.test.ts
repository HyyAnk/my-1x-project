import { describe, it, expect } from "vitest";
import { buildBatchGenerationPrompt, buildReverseGenerationPrompt, type TargetEntityForGeneration } from "../src/quiz/bank/batchGeneratorPrompt.js";
import { resolvePromptStrategy, visualSpottingPromptStrategy } from "../src/quiz/bank/prompts/strategies/promptStrategyRegistry.js";

describe("Visual Spotting Tailored Prompt Strategy - Edutainment Contrast Rules", () => {
  it("resolves visualSpottingPromptStrategy correctly from the registry", () => {
    const strategy = resolvePromptStrategy("visual_spotting");
    expect(strategy).toBe(visualSpottingPromptStrategy);
    expect(strategy.archetypeId).toBe("visual_spotting");
  });

  it("buildBatchGenerationPrompt injects Macroscopic Edutainment Contrast Mandate for visual_spotting", () => {
    const prompt = buildBatchGenerationPrompt({
      archetypeId: "visual_spotting",
      domainId: "nature_animals",
      subtopicId: "mammals",
      count: 3,
      language: "en",
      difficulty: 2,
    });

    expect(prompt).toContain("=== MACROSCOPIC EDUTAINMENT CONTRAST MANDATE (CASUAL & FAMILY AUDIENCE) ===");
    expect(prompt).toContain("Diet & Nutrition: 2 Carnivores / Predators vs 1 Herbivore / Vegetarian");
    expect(prompt).toContain("Habitat & Climate: 2 Polar / Arctic dwellers vs 1 Desert / Tropical dweller");
    expect(prompt).toContain("Locomotion & Physics: 2 Flying birds vs 1 Flightless bird");
    expect(prompt).toContain("STRICTLY FORBIDDEN (MICRO-SCIENTIFIC & ACADEMIC TRIVIA)");
    expect(prompt).toContain("NEVER base the outlier on microscopic anatomy, claw retractability, dental formulas");
    expect(prompt).toContain("NEVER require a biology, zoology, or history PhD to solve the puzzle");
    expect(prompt).toContain('"format": "odd_one_out"');
  });

  it("buildReverseGenerationPrompt injects Macroscopic Edutainment Contrast Mandate for visual_spotting", () => {
    const mockTarget: TargetEntityForGeneration = {
      entity_id: "ENT-ANI-001",
      name: "Lion",
      domain_id: "nature_animals",
      subtopic_id: "mammals",
      visual_anchor: "Majestic male lion roaring on the savannah",
      core_traits: ["Apex predator", "Prides", "Savannah"],
      distractor_pool: ["Tiger", "Cheetah", "Leopard"],
      facts_and_myths: [],
      versus_candidates: ["Tiger"],
    };

    const prompt = buildReverseGenerationPrompt({
      archetypeId: "visual_spotting",
      targets: [mockTarget],
      language: "en",
      difficulty: 2,
    });

    expect(prompt).toContain("=== MACROSCOPIC EDUTAINMENT CONTRAST MANDATE (CASUAL & FAMILY AUDIENCE) ===");
    expect(prompt).toContain("=== SPECIALIZED VISUAL SPOTTING OUTLIER DIRECTIVE ===");
    expect(prompt).toContain("STRICTLY FORBIDDEN (MICRO-SCIENTIFIC & ACADEMIC TRIVIA)");
    expect(prompt).toContain("Draw 2 plausible matching choices sharing a clear common trait so the target is the obvious macroscopic anomaly");
  });
});
