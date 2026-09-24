import { describe, it, expect } from "vitest";
import {
  buildBatchGenerationPrompt,
  buildReverseGenerationPrompt,
  type TargetEntityForGeneration,
} from "../src/quiz/bank/batchGeneratorPrompt.js";
import {
  resolvePromptStrategy,
  versusFaceoffPromptStrategy,
} from "../src/quiz/bank/prompts/strategies/promptStrategyRegistry.js";

describe("Versus Faceoff Tailored Prompt Strategy - Competitive Symmetry Rules", () => {
  it("resolves versusFaceoffPromptStrategy correctly from the registry", () => {
    const strategy = resolvePromptStrategy("versus_faceoff");
    expect(strategy).toBe(versusFaceoffPromptStrategy);
    expect(strategy.archetypeId).toBe("versus_faceoff");
  });

  it("buildBatchGenerationPrompt injects Competitive Symmetry and True Showdown Mandates", () => {
    const prompt = buildBatchGenerationPrompt({
      archetypeId: "versus_faceoff",
      domainId: "pop_culture",
      subtopicId: "modern_cinema",
      count: 3,
      language: "en",
      difficulty: 2,
    });

    expect(prompt).toContain("=== GOLDEN VERSUS FACEOFF PARADIGMS (TRUE HEAD-TO-HEAD SHOWDOWNS) ===");
    expect(prompt).toContain("=== FRANCHISE ANCHOR MANDATE (1v1 VERSUS FORMAT) ===");
    expect(prompt).toContain("=== 1v1 COMPETITIVE INTEGRITY & SYMMETRY (MANDATORY) ===");
    expect(prompt).toContain("BOTH CHOICES MUST FIT");
    expect(prompt).toContain("NO ASYMMETRIC TRIVIA");
    expect(prompt).toContain("STRICT PROHIBITION AGAINST 1-ENTITY TRIVIA");
    expect(prompt).toContain('"format": "multiple_choice"');
    expect(prompt).toContain("- Choice Count: 2");
  });

  it("buildReverseGenerationPrompt injects Strict Symmetry and No One-Sided Trivia Directives", () => {
    const mockTarget: TargetEntityForGeneration = {
      entity_id: "ENT-FLM-079",
      name: "Sirius Black",
      domain_id: "modern_cinema_tv",
      subtopic_id: "fantasy_epics",
      visual_anchor: "Atmospheric portrait of Sirius Black outside Azkaban",
      core_traits: ["Escaped Azkaban unaided", "Animagus dog form"],
      distractor_pool: ["Severus Snape", "Remus Lupin"],
      facts_and_myths: [],
      versus_candidates: ["Bellatrix Lestrange", "Severus Snape"],
    };

    const prompt = buildReverseGenerationPrompt({
      archetypeId: "versus_faceoff",
      targets: [mockTarget],
      language: "en",
      difficulty: 2,
    });

    expect(prompt).toContain("=== SPECIALIZED VERSUS FACEOFF COMPARATIVE DIRECTIVE ===");
    expect(prompt).toContain("STRICT COMPETITOR SYMMETRY & SHARED PREMISE (MANDATORY)");
    expect(prompt).toContain("NO ONE-SIDED TRIVIA");
    expect(prompt).toContain("SYMMETRIC RIVAL PAIRING");
    expect(prompt).toContain("COMPARATIVE TRUTH & ACCURACY");
    expect(prompt).toContain("NEVER disguise standard 1-entity trivia as a versus faceoff");
  });
});
