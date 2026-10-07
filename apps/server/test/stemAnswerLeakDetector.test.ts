import { describe, it, expect } from "vitest";
import type { BankQuestion } from "@studio/shared";
import {
  detectStemAnswerLeak,
  normalizeEntityText,
} from "../src/quiz/bank/autoQa/stemLeakDetector.js";
import { runAutoQaOnQuestion } from "../src/quiz/bank/autoQa/autoQaRules.js";

function createMockQuestion(overrides: Partial<BankQuestion>): BankQuestion {
  return {
    id: "MOCK-Q-001",
    archetype_id: "deep_trivia",
    domain_id: "entertainment_popculture",
    subtopic_id: "animation",
    language: "en",
    format: "multiple_choice",
    question: "Standard trivia question text here?",
    choices: [
      { id: "A", text: "Option A", is_correct: true },
      { id: "B", text: "Option B", is_correct: false },
      { id: "C", text: "Option C", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "This is a detailed explanation answering the question thoroughly.",
    fun_fact: "This is an engaging fun fact about the subject.",
    visual_spec: { intent: "question_illustration", prompt: "A cinematic scene", aspect_ratio: "16:9" },
    difficulty: 2,
    thinking_seconds: 5,
    ...overrides,
  };
}

describe("Stem-Answer Leak Detector (Phase 3 Comprehensive Benchmark)", () => {
  describe("normalizeEntityText utility", () => {
    it("strips leading English articles", () => {
      expect(normalizeEntityText("The Lion King")).toBe("lion king");
      expect(normalizeEntityText("A Glass Slipper")).toBe("glass slipper");
      expect(normalizeEntityText("An Apple")).toBe("apple");
    });

    it("strips possessives and cleans punctuation", () => {
      expect(normalizeEntityText("Cinderella's Castle")).toBe("cinderella castle");
      expect(normalizeEntityText("Disney’s Pinocchio")).toBe("disney pinocchio");
      expect(normalizeEntityText("Spider-Man!")).toBe("spider-man");
    });
  });

  describe("Group 1: Eponymous Franchise Leaks", () => {
    it("flags exact franchise name leak: 'In Pinocchio, who is this puppet boy?'", () => {
      const q = createMockQuestion({
        question: "In Pinocchio, who is this puppet boy?",
        choices: [
          { id: "A", text: "Pinocchio", is_correct: true },
          { id: "B", text: "Geppetto", is_correct: false },
          { id: "C", text: "Jiminy Cricket", is_correct: false },
        ],
        correct_choice_id: "A",
      });

      const issue = detectStemAnswerLeak(q);
      expect(issue).not.toBeNull();
      expect(issue?.type).toBe("quality");
      expect(issue?.details?.leakType).toBe("eponymous_franchise_leak");
      expect(issue?.details?.correctChoice).toBe("Pinocchio");
    });

    it("flags franchise leak: 'In Cinderella, who lost a glass slipper?'", () => {
      const q = createMockQuestion({
        question: "In Cinderella, who lost a glass slipper?",
        choices: [
          { id: "A", text: "Cinderella", is_correct: true },
          { id: "B", text: "Fairy Godmother", is_correct: false },
          { id: "C", text: "Lady Tremaine", is_correct: false },
        ],
        correct_choice_id: "A",
      });

      const issue = detectStemAnswerLeak(q);
      expect(issue).not.toBeNull();
      expect(issue?.details?.leakType).toBe("eponymous_franchise_leak");
    });

    it("flags possessive prefix franchise leak: 'In Cinderella's castle, who danced with Prince Charming?'", () => {
      const q = createMockQuestion({
        question: "In Cinderella's castle, who danced with Prince Charming?",
        choices: [
          { id: "A", text: "Cinderella", is_correct: true },
          { id: "B", text: "Anastasia", is_correct: false },
          { id: "C", text: "Drizella", is_correct: false },
        ],
        correct_choice_id: "A",
      });

      const issue = detectStemAnswerLeak(q);
      expect(issue).not.toBeNull();
      expect(issue?.details?.leakType).toBe("eponymous_franchise_leak");
    });

    it("flags studio-prefixed eponymous leak: 'In Disney's Pinocchio, who wants to be real?'", () => {
      const q = createMockQuestion({
        question: "In Disney's Pinocchio, who wants to be real?",
        choices: [
          { id: "A", text: "Pinocchio", is_correct: true },
          { id: "B", text: "Figaro", is_correct: false },
          { id: "C", text: "Stromboli", is_correct: false },
        ],
        correct_choice_id: "A",
      });

      const issue = detectStemAnswerLeak(q);
      expect(issue).not.toBeNull();
      expect(issue?.details?.leakType).toBe("eponymous_franchise_leak");
    });

    it("flags hyphenated superhero eponymous leak: 'In Spider-Man, who shoots web lines?'", () => {
      const q = createMockQuestion({
        question: "In Spider-Man, who shoots web lines?",
        choices: [
          { id: "A", text: "Spider-Man", is_correct: true },
          { id: "B", text: "Green Goblin", is_correct: false },
        ],
        correct_choice_id: "A",
      });

      const issue = detectStemAnswerLeak(q);
      expect(issue).not.toBeNull();
    });
  });

  describe("Group 2: Verbatim Stem Leaks (Non-Prefix)", () => {
    it("flags embedded exact identity question: 'Which superhero is known as Iron Man?'", () => {
      const q = createMockQuestion({
        question: "Which superhero is known as Iron Man?",
        choices: [
          { id: "A", text: "Iron Man", is_correct: true },
          { id: "B", text: "Captain America", is_correct: false },
          { id: "C", text: "Thor", is_correct: false },
        ],
        correct_choice_id: "A",
      });

      const issue = detectStemAnswerLeak(q);
      expect(issue).not.toBeNull();
      expect(issue?.details?.leakType).toBe("verbatim_stem_leak");
    });

    it("flags embedded entity title with article stripped", () => {
      const q = createMockQuestion({
        question: "Which mythical sea monster is The Loch Ness Monster?",
        choices: [
          { id: "A", text: "The Loch Ness Monster", is_correct: true },
          { id: "B", text: "Kraken", is_correct: false },
        ],
        correct_choice_id: "A",
      });

      const issue = detectStemAnswerLeak(q);
      expect(issue).not.toBeNull();
      expect(issue?.details?.leakType).toBe("verbatim_stem_leak");
    });
  });

  describe("Group 3: Valid Questions (Zero False-Positives)", () => {
    it("passes reframed supporting character question: 'In Pinocchio, which woodcarver created the wooden puppet?'", () => {
      const q = createMockQuestion({
        question: "In Pinocchio, which woodcarver created the wooden puppet?",
        choices: [
          { id: "A", text: "Geppetto", is_correct: true },
          { id: "B", text: "Stromboli", is_correct: false },
          { id: "C", text: "Jiminy Cricket", is_correct: false },
        ],
        correct_choice_id: "A",
      });

      expect(detectStemAnswerLeak(q)).toBeNull();
    });

    it("passes reframed iconic item question: 'In Cinderella, what item was left behind at midnight?'", () => {
      const q = createMockQuestion({
        question: "In Cinderella, what item was left behind at midnight?",
        choices: [
          { id: "A", text: "Glass slipper", is_correct: true },
          { id: "B", text: "Golden necklace", is_correct: false },
          { id: "C", text: "Silk scarf", is_correct: false },
        ],
        correct_choice_id: "A",
      });

      expect(detectStemAnswerLeak(q)).toBeNull();
    });

    it("passes studio re-anchored question: 'In classic Disney animation, which wooden puppet dreams of becoming real?'", () => {
      const q = createMockQuestion({
        question: "In classic Disney animation, which wooden puppet dreams of becoming real?",
        choices: [
          { id: "A", text: "Pinocchio", is_correct: true },
          { id: "B", text: "Peter Pan", is_correct: false },
          { id: "C", text: "Dumbo", is_correct: false },
        ],
        correct_choice_id: "A",
      });

      expect(detectStemAnswerLeak(q)).toBeNull();
    });

    it("does NOT false-positive on word boundary substrings (e.g., 'cat' in 'catch')", () => {
      const q = createMockQuestion({
        question: "Which domestic animal can catch mice effectively?",
        choices: [
          { id: "A", text: "Cat", is_correct: true },
          { id: "B", text: "Dog", is_correct: false },
          { id: "C", text: "Hamster", is_correct: false },
        ],
        correct_choice_id: "A",
      });

      expect(detectStemAnswerLeak(q)).toBeNull();
    });

    it("does NOT false-positive when distractor appears in question but correct choice does not", () => {
      const q = createMockQuestion({
        question: "Which red fruit grows on an orchard tree?",
        choices: [
          { id: "A", text: "Apple", is_correct: true },
          { id: "B", text: "Red Currant", is_correct: false },
        ],
        correct_choice_id: "A",
      });

      expect(detectStemAnswerLeak(q)).toBeNull();
    });
  });

  describe("Group 4: Archetype Exceptions & Pipeline Integration", () => {
    it("permits versus_faceoff naming contenders in stem: 'Sirius Black vs Bellatrix: Who escaped Azkaban first?'", () => {
      const q = createMockQuestion({
        archetype_id: "versus_faceoff",
        question: "Sirius Black vs Bellatrix: Who escaped Azkaban first?",
        choices: [
          { id: "A", text: "Sirius Black", is_correct: true },
          { id: "B", text: "Bellatrix Lestrange", is_correct: false },
        ],
        correct_choice_id: "A",
      });

      expect(detectStemAnswerLeak(q)).toBeNull();
    });

    it("permits binary verdict archetypes: 'Are blue whales bigger than dinosaurs? Yes or No?'", () => {
      const q = createMockQuestion({
        archetype_id: "verdict_yes_no",
        question: "Are blue whales bigger than dinosaurs? Yes or No?",
        choices: [
          { id: "A", text: "Yes", is_correct: true },
          { id: "B", text: "No", is_correct: false },
        ],
        correct_choice_id: "A",
      });

      expect(detectStemAnswerLeak(q)).toBeNull();
    });

    it("safely handles missing or empty question fields without throwing", () => {
      expect(detectStemAnswerLeak({} as any)).toBeNull();
      expect(detectStemAnswerLeak({ question: "" } as any)).toBeNull();
      expect(detectStemAnswerLeak({ question: "Valid text", choices: [] } as any)).toBeNull();
    });

    it("integrates seamlessly into runAutoQaOnQuestion and rejects leaked questions", () => {
      const leakedQ = createMockQuestion({
        question: "In Pinocchio, who is this puppet boy?",
        choices: [
          { id: "A", text: "Pinocchio", is_correct: true },
          { id: "B", text: "Geppetto", is_correct: false },
        ],
        correct_choice_id: "A",
      });

      const qaResult = runAutoQaOnQuestion(leakedQ);
      expect(qaResult.passed).toBe(false);
      expect(qaResult.issues.some((i) => i.message.includes("Stem-Option Leakage"))).toBe(true);
    });
  });
});
