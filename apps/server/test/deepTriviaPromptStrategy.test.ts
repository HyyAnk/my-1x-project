import { describe, it, expect } from "vitest";
import { buildBatchGenerationPrompt, buildReverseGenerationPrompt, type TargetEntityForGeneration } from "../src/quiz/bank/batchGeneratorPrompt.js";
import { resolvePromptStrategy, deepTriviaPromptStrategy } from "../src/quiz/bank/prompts/strategies/promptStrategyRegistry.js";

describe("Deep Trivia Tailored Prompt Strategy - Mobile Brevity & Edutainment Mandate", () => {
  it("resolves deepTriviaPromptStrategy correctly from the registry", () => {
    const strategy = resolvePromptStrategy("deep_trivia");
    expect(strategy).toBe(deepTriviaPromptStrategy);
    expect(strategy.archetypeId).toBe("deep_trivia");
  });

  it("buildBatchGenerationPrompt enforces Mind-Blowing Edutainment Mandate and strict mobile length", () => {
    const prompt = buildBatchGenerationPrompt({
      archetypeId: "deep_trivia",
      domainId: "careers_occupations",
      subtopicId: "crafts_trades",
      count: 3,
      language: "en",
      difficulty: 2,
    });

    expect(prompt).toContain("=== MIND-BLOWING EDUTAINMENT TRIVIA MANDATE (NO DRY DEFINITIONS / NO CLOSE SIBLINGS) ===");
    expect(prompt).toContain("FORBIDDEN - DRY JOB-DESCRIPTIONS & VOCABULARY DRILLS");
    expect(prompt).toContain("Using insulated tools, who wires circuit breaker panels?");
    expect(prompt).toContain("FORBIDDEN - PEDANTIC SIBLING DISTRACTOR TRAPS");
    expect(prompt).toContain("FORBIDDEN - GORY OR OBSCURE BEHAVIORAL MECHANICS");
    expect(prompt).toContain("STRICT MOBILE QUESTION BREVITY (STRICTLY 60–80 CHARACTERS)");
    expect(prompt).toContain("Strictly 60 to 80 characters (never exceed 80 chars). Must fit in 2 lines on mobile vertical screens.");
  });

  it("buildReverseGenerationPrompt injects Mind-Blowing Edutainment Mandate into reverse matrix", () => {
    const mockTarget: TargetEntityForGeneration = {
      entity_id: "ENT-ANI-106",
      name: "Leopard Seal",
      domain_id: "nature_animals",
      subtopic_id: "mammals",
      visual_anchor: "A serpentine leopard seal patrolling beneath an Antarctic ice shelf",
      core_traits: ["Apex predator", "Antarctica", "Spotted fur"],
      distractor_pool: ["Southern Elephant Seal", "Walrus"],
      facts_and_myths: [],
      versus_candidates: ["Walrus"],
    };

    const prompt = buildReverseGenerationPrompt({
      archetypeId: "deep_trivia",
      targets: [mockTarget],
      language: "en",
      difficulty: 2,
    });

    expect(prompt).toContain("=== MIND-BLOWING EDUTAINMENT TRIVIA MANDATE (NO DRY DEFINITIONS / NO CLOSE SIBLINGS) ===");
    expect(prompt).toContain("NEVER Leopard Seal vs Walrus vs Elephant Seal on obscure predatory mechanics");
    expect(prompt).toContain("Strictly 60 to 80 characters (never exceed 80 chars) to fit 2 lines on mobile screens");
  });
});
