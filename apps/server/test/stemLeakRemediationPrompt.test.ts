import { describe, it, expect } from "vitest";
import type { BankQuestion } from "@studio/shared";
import {
  buildStemLeakRemediationPrompt,
  parseStemLeakRemediationOutput,
  resolveRemediationStrategy,
} from "../src/quiz/bank/remediation/index.js";
import type { AutoQaIssue } from "../src/quiz/bank/autoQa/autoQa.types.js";

const sampleLeakedQuestion: BankQuestion = {
  id: "LEAK-001",
  archetype_id: "deep_trivia",
  domain_id: "entertainment_popculture",
  subtopic_id: "classic_fairytales",
  question: "In Pinocchio, who is this puppet boy?",
  choices: [
    { id: "A", text: "Pinocchio", is_correct: true },
    { id: "B", text: "Geppetto", is_correct: false },
    { id: "C", text: "Jiminy Cricket", is_correct: false },
  ],
  correct_choice_id: "A",
  explanation: "Pinocchio is the titular wooden puppet.",
  visual_spec: {
    intent: "question_illustration",
    prompt: "Pinocchio smiling on a wooden table in Geppetto's workshop",
    aspect_ratio: "16:9",
  },
};

const sampleIssue: AutoQaIssue = {
  type: "quality",
  message: 'Stem-Option Leakage: Correct choice "Pinocchio" matches eponymous franchise title "Pinocchio".',
  details: {
    leakType: "eponymous_franchise_leak",
    franchiseTitle: "Pinocchio",
    correctChoice: "Pinocchio",
  },
};

describe("Stem Leak Remediation Prompt & Strategy Dispatcher (Phase 4)", () => {
  describe("Strategy Resolution", () => {
    it("respects explicit preferred strategy", () => {
      const strategy = resolveRemediationStrategy(sampleLeakedQuestion, "context_reanchoring");
      expect(strategy).toBe("context_reanchoring");
    });

    it("defaults to context_reanchoring for mystery_reveal archetype", () => {
      const mysteryQ: BankQuestion = {
        ...sampleLeakedQuestion,
        archetype_id: "mystery_reveal",
        choices: [{ id: "A", text: "Pinocchio", is_correct: true }],
      };
      const strategy = resolveRemediationStrategy(mysteryQ);
      expect(strategy).toBe("context_reanchoring");
    });

    it("defaults to plot_or_supporting_character for deep_trivia and standard archetypes", () => {
      const strategy = resolveRemediationStrategy(sampleLeakedQuestion);
      expect(strategy).toBe("plot_or_supporting_character");
    });
  });

  describe("Micro-Prompt Generation", () => {
    it("builds prompt with plot_or_supporting_character instructions and visual sync contract", () => {
      const result = buildStemLeakRemediationPrompt({
        question: sampleLeakedQuestion,
        issue: sampleIssue,
        preferredStrategy: "plot_or_supporting_character",
      });

      expect(result.strategy).toBe("plot_or_supporting_character");
      expect(result.prompt).toContain("=== REMEDIATION STRATEGY: PLOT & SUPPORTING CHARACTER REFRAME ===");
      expect(result.prompt).toContain("KEEP FRANCHISE ANCHOR");
      expect(result.prompt).toContain("Geppetto, Fairy Godmother");
      expect(result.prompt).toContain("VISUAL SYNCHRONIZATION (MANDATORY)");
      expect(result.prompt).toContain("In Pinocchio, who is this puppet boy?");
      expect(result.prompt).toContain('"Pinocchio"');
    });

    it("builds prompt with context_reanchoring instructions and visual sync contract", () => {
      const result = buildStemLeakRemediationPrompt({
        question: sampleLeakedQuestion,
        issue: sampleIssue,
        preferredStrategy: "context_reanchoring",
      });

      expect(result.strategy).toBe("context_reanchoring");
      expect(result.prompt).toContain("=== REMEDIATION STRATEGY: CONTEXT RE-ANCHORING ===");
      expect(result.prompt).toContain("PRESERVE CORRECT CHARACTER");
      expect(result.prompt).toContain("REMOVE EPONYMOUS ANCHOR");
      expect(result.prompt).toContain("In classic Disney animation, which wooden puppet dreams of becoming a real boy?");
      expect(result.prompt).toContain("VISUAL SYNCHRONIZATION (MANDATORY)");
    });
  });

  describe("Output Parsing & Validation", () => {
    it("parses valid JSON response wrapped in markdown fences and attaches strategy metadata", () => {
      const mockRawOutput = `\`\`\`json
{
  "question": "In Pinocchio, which woodcarver created the wooden puppet?",
  "choices": [
    { "id": "A", "text": "Geppetto", "is_correct": true },
    { "id": "B", "text": "Stromboli", "is_correct": false },
    { "id": "C", "text": "Jiminy Cricket", "is_correct": false }
  ],
  "correct_choice_id": "A",
  "explanation": "Mister Geppetto carved Pinocchio out of a block of pine wood.",
  "fun_fact": "Geppetto originally named his goldfish Cleo and his kitten Figaro.",
  "visual_spec": {
    "intent": "question_illustration",
    "prompt": "Elderly woodcarver Geppetto working with wood chisels in his rustic Tuscan workshop",
    "aspect_ratio": "16:9"
  }
}
\`\`\``;

      const parsed = parseStemLeakRemediationOutput(mockRawOutput, sampleLeakedQuestion, "plot_or_supporting_character");

      expect(parsed.question).toBe("In Pinocchio, which woodcarver created the wooden puppet?");
      expect(parsed.correct_choice_id).toBe("A");
      expect(parsed.choices[0].text).toBe("Geppetto");
      expect(parsed.choices[0].is_correct).toBe(true);
      expect(parsed.choices[1].is_correct).toBe(false);
      expect(parsed.visual_spec.prompt).toContain("Elderly woodcarver Geppetto");
      expect(parsed.remediation_strategy_applied).toBe("plot_or_supporting_character");
    });

    it("throws clear error when visual_spec.prompt is missing", () => {
      const invalidOutput = JSON.stringify({
        question: "In Pinocchio, which woodcarver created the puppet?",
        choices: [
          { id: "A", text: "Geppetto", is_correct: true },
          { id: "B", text: "Stromboli", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Geppetto carved Pinocchio.",
      });

      expect(() => {
        parseStemLeakRemediationOutput(invalidOutput, sampleLeakedQuestion, "plot_or_supporting_character");
      }).toThrow(/visual_spec\.prompt/);
    });

    it("throws clear error when correct_choice_id does not exist in choices", () => {
      const invalidOutput = JSON.stringify({
        question: "In Pinocchio, which woodcarver created the puppet?",
        choices: [
          { id: "A", text: "Geppetto", is_correct: true },
          { id: "B", text: "Stromboli", is_correct: false },
        ],
        correct_choice_id: "Z",
        explanation: "Geppetto carved Pinocchio.",
        visual_spec: { prompt: "Geppetto in his shop" },
      });

      expect(() => {
        parseStemLeakRemediationOutput(invalidOutput, sampleLeakedQuestion, "plot_or_supporting_character");
      }).toThrow(/correct_choice_id "Z" not found/);
    });
  });
});
