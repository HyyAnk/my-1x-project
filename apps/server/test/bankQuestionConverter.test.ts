import { describe, expect, it } from "vitest";
import type { BankQuestion } from "@studio/shared";
import {
  convertBankQuestionToQuizQuestionLossless,
  convertBankQuestionToQuizQuestion,
} from "../src/quiz/bank/bridge/bankQuestionConverter.js";

describe("bankQuestionConverter (Yes / No Architecture)", () => {
  const sampleYesNoBankQuestion: BankQuestion = {
    id: "VYN-NAT-0001",
    archetype_id: "verdict_yes_no",
    domain_id: "nature_animals",
    subtopic_id: "marine_life",
    question: "Can penguins fly in the air? Yes or No?",
    format: "yes_no",
    choices: [
      { id: "A", text: "Yes", is_correct: false },
      { id: "B", text: "No", is_correct: true },
    ],
    correct_choice_id: "B",
    explanation: "Penguins are flightless birds adapted for swimming.",
    fun_fact: "Penguins can swim up to 15 miles per hour.",
    age_band: "family",
    difficulty: 1,
    tags: ["nature", "birds"],
    status: "approved",
    language: "en",
  };

  describe("convertBankQuestionToQuizQuestionLossless", () => {
    it("converts verdict_yes_no question into QuizQuestion with format 'yes_no'", () => {
      const quizQuestion = convertBankQuestionToQuizQuestionLossless(sampleYesNoBankQuestion);

      expect(quizQuestion.id).toBe("VYN-NAT-0001");
      expect(quizQuestion.format).toBe("yes_no");
      expect(quizQuestion.gameplay_id).toBe("verdict_yes_no");
      expect(quizQuestion.answer_mode).toBe("choice_selection");
      expect(quizQuestion.choices).toEqual([
        { id: "A", text: "Yes" },
        { id: "B", text: "No" },
      ]);
      expect(quizQuestion.correct_choice_id).toBe("B");
      expect(quizQuestion.question).toBe("Can penguins fly in the air? Yes or No?");
    });

    it("converts legacy verdict_true_false question into format 'yes_no'", () => {
      const legacyQuestion: BankQuestion = {
        id: "VTF-SCI-0002",
        archetype_id: "verdict_true_false" as any,
        domain_id: "science",
        subtopic_id: "astronomy",
        question: "Is the Earth flat? True or False?",
        format: "true_false" as any,
        choices: [
          { id: "A", text: "True", is_correct: false },
          { id: "B", text: "False", is_correct: true },
        ],
        correct_choice_id: "B",
        explanation: "The Earth is an oblate spheroid.",
        age_band: "family",
        difficulty: 1,
        tags: ["earth"],
        status: "approved",
        language: "en",
      };

      const quizQuestion = convertBankQuestionToQuizQuestionLossless(legacyQuestion);
      expect(quizQuestion.format).toBe("yes_no");
    });
  });

  describe("convertBankQuestionToQuizQuestion", () => {
    it("converts verdict_yes_no question with fallback choices to Yes and No", () => {
      const emptyChoicesQuestion: BankQuestion = {
        ...sampleYesNoBankQuestion,
        choices: [],
      };

      const quizQuestion = convertBankQuestionToQuizQuestion(emptyChoicesQuestion);
      expect(quizQuestion.format).toBe("yes_no");
      expect(quizQuestion.choices).toEqual([
        { id: "a", text: "Yes" },
        { id: "b", text: "No" },
      ]);
    });
  });
});
