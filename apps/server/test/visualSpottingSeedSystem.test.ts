import { describe, it, expect } from "vitest";
import {
  allocateVisualSpottingSeeds,
  formatVisualSpottingSeedsBlock,
  VISUAL_SPOTTING_CONTRAST_DIMENSIONS,
  VISUAL_SPOTTING_HOOK_TEMPLATES,
} from "../src/quiz/bank/prompts/strategies/visualSpottingSeedCatalog.js";
import {
  buildBatchGenerationPrompt,
  buildReverseGenerationPrompt,
  sanitizeBankQuestionText,
  type TargetEntityForGeneration,
} from "../src/quiz/bank/batchGeneratorPrompt.js";

describe("Visual Spotting Diversity Seed System", () => {
  describe("Seed Catalog & Templates", () => {
    it("provides a rich variety of contrast dimensions across multiple categories", () => {
      expect(VISUAL_SPOTTING_CONTRAST_DIMENSIONS.length).toBeGreaterThanOrEqual(10);
      const categories = new Set(VISUAL_SPOTTING_CONTRAST_DIMENSIONS.map((d) => d.category));
      expect(categories.has("diet_nutrition")).toBe(true);
      expect(categories.has("biome_habitat")).toBe(true);
      expect(categories.has("locomotion_physics")).toBe(true);
      expect(categories.has("anatomy_hallmark")).toBe(true);
    });

    it("ensures zero hook templates use formulaic 'odd one out' phrasing", () => {
      expect(VISUAL_SPOTTING_HOOK_TEMPLATES.length).toBeGreaterThanOrEqual(6);
      for (const hook of VISUAL_SPOTTING_HOOK_TEMPLATES) {
        expect(hook.templateFormat.toLowerCase()).not.toContain("odd one out");
        expect(hook.sampleQuestion.toLowerCase()).not.toContain("odd one out");
        expect(hook.forbiddenKeywords).toContain("odd one out");
      }
    });
  });

  describe("allocateVisualSpottingSeeds", () => {
    it("allocates exactly N item seeds with non-repetitive alternating hook styles", () => {
      const seeds = allocateVisualSpottingSeeds(5, "nature_animals");
      expect(seeds).toHaveLength(5);

      for (let i = 0; i < seeds.length; i++) {
        expect(seeds[i].itemIndex).toBe(i + 1);
        expect(seeds[i].contrastDimension).toBeDefined();
        expect(seeds[i].hookTemplate).toBeDefined();
      }

      // Adjacent seeds must rotate hook styles
      expect(seeds[0].hookTemplate.id).not.toBe(seeds[1].hookTemplate.id);
      expect(seeds[1].hookTemplate.id).not.toBe(seeds[2].hookTemplate.id);
    });

    it("formats seeds into a structured prompt block with explicit anti-repetition mandates", () => {
      const seeds = allocateVisualSpottingSeeds(3, "nature_animals");
      const block = formatVisualSpottingSeedsBlock(seeds);

      expect(block).toContain("=== MANDATORY ITEM-BY-ITEM DIVERSITY BLUEPRINTS (NO \"ODD ONE OUT\" REPETITION) ===");
      expect(block).toContain("Question #1:");
      expect(block).toContain("Question #2:");
      expect(block).toContain("Question #3:");
      expect(block).toContain("CRITICAL PROHIBITION: The phrase 'odd one out' is STRICTLY FORBIDDEN");
    });
  });

  describe("Prompt Strategy Integration", () => {
    it("buildBatchGenerationPrompt injects diversity blueprints for visual_spotting", () => {
      const prompt = buildBatchGenerationPrompt({
        archetypeId: "visual_spotting",
        domainId: "nature_animals",
        subtopicId: "predators",
        count: 4,
        language: "en",
        difficulty: 3,
      });

      expect(prompt).toContain("=== MANDATORY ITEM-BY-ITEM DIVERSITY BLUEPRINTS (NO \"ODD ONE OUT\" REPETITION) ===");
      expect(prompt).toContain("Question #1:");
      expect(prompt).toContain("Question #2:");
      expect(prompt).toContain("Question #3:");
      expect(prompt).toContain("Question #4:");
      expect(prompt).toContain("ZERO \"ODD ONE OUT\" TOLERANCE");
    });

    it("buildReverseGenerationPrompt injects diversity blueprints matching target entities", () => {
      const mockTargets: TargetEntityForGeneration[] = [
        {
          entity_id: "ENT-001",
          name: "Polar Bear",
          domain_id: "nature_animals",
          subtopic_id: "mammals",
          visual_anchor: "Polar bear on ice sheet",
          core_traits: ["Arctic predator", "Thick blubber"],
          facts_and_myths: [],
        },
        {
          entity_id: "ENT-002",
          name: "Camel",
          domain_id: "nature_animals",
          subtopic_id: "mammals",
          visual_anchor: "Dromedary camel in desert dunes",
          core_traits: ["Desert survivor", "Water conservation"],
          facts_and_myths: [],
        },
      ];

      const prompt = buildReverseGenerationPrompt({
        archetypeId: "visual_spotting",
        targets: mockTargets,
        language: "en",
      });

      expect(prompt).toContain("=== MANDATORY ITEM-BY-ITEM DIVERSITY BLUEPRINTS (NO \"ODD ONE OUT\" REPETITION) ===");
      expect(prompt).toContain("Question #1:");
      expect(prompt).toContain("Question #2:");
      expect(prompt).toContain("ZERO \"ODD ONE OUT\" TOLERANCE");
    });
  });

  describe("Sanitizer Fallback Rewriting", () => {
    it("rewrites trailing 'is the odd one out' to 'is the outlier' for visual_spotting", () => {
      const dirtyQ1 = "Which predator is the odd one out?";
      expect(sanitizeBankQuestionText(dirtyQ1, "visual_spotting")).toBe("Which predator is the outlier?");

      const dirtyQ2 = "Which of these three creatures is the odd one out?";
      expect(sanitizeBankQuestionText(dirtyQ2, "visual_spotting")).toBe("Which of these three creatures is the outlier?");
    });

    it("rewrites leading 'Spot the odd one out:' to 'Spot the outlier:'", () => {
      const dirtyQ = "Spot the odd one out: Which bird is flightless?";
      expect(sanitizeBankQuestionText(dirtyQ, "visual_spotting")).toBe("Spot the outlier: Which bird is flightless?");
    });

    it("leaves already clean diversified questions untouched", () => {
      const cleanQ = "Two thrive in subzero blizzards, but which one prowls scorching dunes?";
      expect(sanitizeBankQuestionText(cleanQ, "visual_spotting")).toBe(cleanQ);
    });
  });
});
