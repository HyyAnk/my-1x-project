import { describe, expect, it } from "vitest";
import {
  resolvePromptStrategy,
  verdictPromptStrategy,
} from "../src/quiz/bank/prompts/strategies/promptStrategyRegistry.js";
import { sanitizeBankQuestionText } from "../src/quiz/bank/prompts/bankQuestionSanitizer.js";
import { parseBatchGenerationOutput } from "../src/quiz/bank/prompts/batchPromptOutputParser.js";
import type { TargetEntityForGeneration } from "../src/quiz/bank/prompts/reverseMatrixPromptBuilder.js";

describe("Verdict Prompt Strategy (Yes / No Architecture)", () => {
  describe("Strategy Resolution & Registration", () => {
    it("resolves verdictPromptStrategy for verdict_yes_no archetype", () => {
      const strategy = resolvePromptStrategy("verdict_yes_no");
      expect(strategy).toBe(verdictPromptStrategy);
      expect(strategy.archetypeId).toContain("verdict_yes_no");
    });

    it("also resolves legacy archetype aliases to verdictPromptStrategy", () => {
      expect(resolvePromptStrategy("verdict_true_false" as any)).toBe(verdictPromptStrategy);
      expect(resolvePromptStrategy("verdict_fact_myth" as any)).toBe(verdictPromptStrategy);
    });
  });

  describe("Batch Prompt Generation (buildBatchPrompt)", () => {
    it("generates structured prompt specifying Yes or No binary rules", () => {
      const prompt = verdictPromptStrategy.buildBatchPrompt({
        archetypeId: "verdict_yes_no",
        domainId: "nature_animals",
        subtopicId: "marine_life",
        count: 5,
        language: "en",
        difficulty: 2,
      });

      expect(prompt).toContain('=== SPECIALIZED YES / NO ARCHETYPE DIRECTIVE ===');
      expect(prompt).toContain('Standardized exclusively to "Yes" and "No" binary format');
      expect(prompt).toContain('Formulate a punchy, natural direct question or assertion ending with "... Yes or No?"');
      expect(prompt).toContain('Exactly 2 choices with text strictly "Yes" and "No"');
      expect(prompt).toContain('Enforce a strict ~50/50 distribution across questions');
      expect(prompt).toContain('- Format: "yes_no"');
      expect(prompt).toContain('- Choice Count: 2 ("Yes" and "No")');
      expect(prompt).toContain('"question": "Are blue whales bigger than any dinosaur? Yes or No?"');
      expect(prompt).toContain('"text": "Yes"');
      expect(prompt).toContain('"text": "No"');
    });
  });

  describe("Reverse Matrix Prompt Generation (buildReversePrompt)", () => {
    it("instructs 1-to-1 mapping with Yes/No claim anchoring", () => {
      const mockTargets: TargetEntityForGeneration[] = [
        {
          entity_id: "ENT-NAT-001",
          name: "Blue Whale",
          domain_id: "nature_animals",
          subtopic_id: "marine_life",
          visual_anchor: "A blue whale swimming deep underwater",
          core_traits: ["Largest animal on earth", "Consumes krill"],
          distractor_pool: [],
          facts_and_myths: [
            { verdict: "fact", claim: "Blue whales are larger than any dinosaur.", explanation: "Up to 30m long." },
            { verdict: "myth", claim: "Blue whales are fish.", explanation: "They are mammals." },
          ],
        },
      ];

      const prompt = verdictPromptStrategy.buildReversePrompt({
        archetypeId: "verdict_yes_no",
        targets: mockTargets,
        language: "en",
        difficulty: 2,
      });

      expect(prompt).toContain('=== SPECIALIZED YES / NO ARCHETYPE DIRECTIVE ===');
      expect(prompt).toContain("Map [TRUE] claims from the target entity to 'Yes', and [FALSE] claims to 'No'");
      expect(prompt).toContain("CHOICES: Exactly 2 choices with text strictly 'Yes' and 'No'");
      expect(prompt).toContain("Question statement ending with '... Yes or No?'");
      expect(prompt).toContain('- Format: "yes_no"');
      expect(prompt).toContain('- Choice Count: 2 ("Yes" and "No")');
    });
  });

  describe("Question Text Sanitizer", () => {
    it("converts legacy trailing True or False? to Yes or No?", () => {
      expect(sanitizeBankQuestionText("Coral reefs are animals: True or False?", "verdict_yes_no")).toBe(
        "Coral reefs are animals Yes or No?",
      );
      expect(sanitizeBankQuestionText("Sharks have bones - true or false", "verdict_yes_no")).toBe(
        "Sharks have bones Yes or No?",
      );
    });

    it("cleans colon and hyphen separators before Yes or No?", () => {
      expect(sanitizeBankQuestionText("Can penguins fly: Yes or No?", "verdict_yes_no")).toBe(
        "Can penguins fly Yes or No?",
      );
      expect(sanitizeBankQuestionText("Is light faster than sound - Yes or No?", "verdict_yes_no")).toBe(
        "Is light faster than sound Yes or No?",
      );
    });

    it("deduplicates doubled question marks", () => {
      expect(sanitizeBankQuestionText("Can elephants jump? Yes or No??", "verdict_yes_no")).toBe(
        "Can elephants jump? Yes or No?",
      );
    });
  });

  describe("Batch Prompt Output Parser for verdict_yes_no", () => {
    it("parses valid LLM output with Yes/No choices into verdict_yes_no question", () => {
      const llmJson = JSON.stringify([
        {
          question: "Can ostriches fly? Yes or No?",
          choices: [
            { id: "A", text: "Yes", is_correct: false },
            { id: "B", text: "No", is_correct: true },
          ],
          correct_choice_id: "B",
          explanation: "Ostriches are flightless birds.",
          format: "yes_no",
        },
      ]);

      const parsed = parseBatchGenerationOutput(llmJson, {
        archetypeId: "verdict_yes_no",
        domainId: "nature_animals",
        subtopicId: "birds",
      });

      expect(parsed).toHaveLength(1);
      expect(parsed[0].archetype_id).toBe("verdict_yes_no");
      expect(parsed[0].format).toBe("yes_no");
      expect(parsed[0].choices).toEqual([
        { id: "A", text: "Yes", is_correct: false },
        { id: "B", text: "No", is_correct: true },
      ]);
      expect(parsed[0].correct_choice_id).toBe("B");
    });

    it("transparently upgrades legacy True/False LLM output to Yes/No", () => {
      const legacyLlmJson = JSON.stringify([
        {
          question: "Sharks are mammals. True or False?",
          choices: [
            { id: "A", text: "True", is_correct: false },
            { id: "B", text: "False", is_correct: true },
          ],
          correct_choice_id: "B",
          explanation: "Sharks are cartilaginous fish.",
          format: "true_false",
        },
      ]);

      const parsed = parseBatchGenerationOutput(legacyLlmJson, {
        archetypeId: "verdict_yes_no",
        domainId: "nature_animals",
        subtopicId: "marine_life",
      });

      expect(parsed).toHaveLength(1);
      expect(parsed[0].archetype_id).toBe("verdict_yes_no");
      expect(parsed[0].format).toBe("yes_no");
      expect(parsed[0].question).toBe("Sharks are mammals. Yes or No?");
      expect(parsed[0].choices[0].text).toBe("Yes");
      expect(parsed[0].choices[1].text).toBe("No");
    });
  });
});
