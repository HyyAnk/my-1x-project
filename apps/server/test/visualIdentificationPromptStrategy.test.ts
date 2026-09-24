import { describe, it, expect } from "vitest";
import { buildBatchGenerationPrompt, buildReverseGenerationPrompt, type TargetEntityForGeneration } from "../src/quiz/bank/batchGeneratorPrompt.js";
import { resolvePromptStrategy, visualIdentificationPromptStrategy } from "../src/quiz/bank/prompts/strategies/promptStrategyRegistry.js";

describe("Visual Identification Tailored Prompt Strategy - Family Edutainment & Mobile Brevity", () => {
  it("resolves visualIdentificationPromptStrategy correctly from the registry", () => {
    const strategy = resolvePromptStrategy("visual_identification");
    expect(strategy).toBe(visualIdentificationPromptStrategy);
    expect(strategy.archetypeId).toBe("visual_identification");
  });

  it("buildBatchGenerationPrompt enforces Family Edutainment Mandate and mobile brevity", () => {
    const prompt = buildBatchGenerationPrompt({
      archetypeId: "visual_identification",
      domainId: "nature_animals",
      subtopicId: "insects",
      count: 3,
      language: "en",
      difficulty: 2,
    });

    expect(prompt).toContain("=== FAMILY-FRIENDLY VISUAL IDENTIFICATION MANDATE (NO ACADEMIC JARGON / NO OBSCURE SUBSPECIES) ===");
    expect(prompt).toContain("FORBIDDEN - ACADEMIC / SCIENTIST DISCIPLINE CALLOUTS");
    expect(prompt).toContain("What do entomologists call");
    expect(prompt).toContain("FORBIDDEN - OBSCURE SUBSPECIES & LATIN TAXONOMY BATTLES");
    expect(prompt).toContain("Atlas Moth vs Luna Moth vs Domestic Silk Moth");
    expect(prompt).toContain("HIGH-RECOGNITION HOUSEHOLD ENTITIES");
    expect(prompt).toContain("STRICT MOBILE QUESTION BREVITY (STRICTLY 60–80 CHARACTERS)");
    expect(prompt).toContain("Strictly 60 to 80 characters (never exceed 80 chars). Must fit in 2 lines on mobile vertical screens.");
  });

  it("buildReverseGenerationPrompt injects Family Edutainment Mandate into reverse matrix", () => {
    const mockTarget: TargetEntityForGeneration = {
      entity_id: "ENT-ANI-088",
      name: "Praying Mantis",
      domain_id: "nature_animals",
      subtopic_id: "insects",
      visual_anchor: "A vivid green praying mantis perched on a dewy branch in stalking stance",
      core_traits: ["Carnivorous insect", "Camouflage", "Folded front legs"],
      distractor_pool: ["Grasshopper", "Katydid", "Dragonfly"],
      facts_and_myths: [],
      versus_candidates: ["Grasshopper"],
    };

    const prompt = buildReverseGenerationPrompt({
      archetypeId: "visual_identification",
      targets: [mockTarget],
      language: "en",
      difficulty: 2,
    });

    expect(prompt).toContain("=== FAMILY-FRIENDLY VISUAL IDENTIFICATION MANDATE (NO ACADEMIC JARGON / NO OBSCURE SUBSPECIES) ===");
    expect(prompt).toContain("NEVER pit obscure, near-identical insect subspecies against each other");
    expect(prompt).toContain("Strictly 60 to 80 characters (never exceed 80 chars) to fit 2 lines on mobile screens");
  });
});
