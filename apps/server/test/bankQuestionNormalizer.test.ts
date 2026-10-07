import { describe, expect, it } from "vitest";
import type { BankQuestion } from "@studio/shared";
import {
  normalizeVerdictQuestionText,
  normalizeVerdictChoices,
  normalizeVerdictQuestion,
} from "../src/repository/quiz/bank/bankQuestionNormalizer.js";
import { bankQuestionToRow, rowToBankQuestion } from "../src/repository/quiz/bank/bankSqliteMapper.js";

describe("bankQuestionNormalizer", () => {
  describe("normalizeVerdictQuestionText", () => {
    it("converts trailing 'True or False?' to 'Yes or No?'", () => {
      expect(normalizeVerdictQuestionText("The Earth orbits the Sun. True or False?")).toBe(
        "The Earth orbits the Sun. Yes or No?",
      );
    });

    it("handles variations in casing, colons, and hyphens", () => {
      expect(normalizeVerdictQuestionText("Sharks are mammals: true or false")).toBe(
        "Sharks are mammals Yes or No?",
      );
      expect(normalizeVerdictQuestionText("Octopuses have 3 hearts - TRUE OR FALSE?")).toBe(
        "Octopuses have 3 hearts Yes or No?",
      );
      expect(normalizeVerdictQuestionText("Bananas grow on trees — True or False?")).toBe(
        "Bananas grow on trees Yes or No?",
      );
    });

    it("preserves non-verdict questions unmodified", () => {
      const q = "Which planet is closest to the Sun?";
      expect(normalizeVerdictQuestionText(q)).toBe(q);
    });
  });

  describe("normalizeVerdictChoices", () => {
    it("converts True/False choice text to Yes/No", () => {
      const choices = [
        { id: "A", text: "True", is_correct: true },
        { id: "B", text: "False", is_correct: false },
      ];
      const normalized = normalizeVerdictChoices(choices);
      expect(normalized).toEqual([
        { id: "A", text: "Yes", is_correct: true },
        { id: "B", text: "No", is_correct: false },
      ]);
    });

    it("leaves non-boolean choices unmodified", () => {
      const choices = [
        { id: "A", text: "Venus", is_correct: true },
        { id: "B", text: "Mars", is_correct: false },
      ];
      expect(normalizeVerdictChoices(choices)).toEqual(choices);
    });
  });

  describe("normalizeVerdictQuestion", () => {
    it("normalizes legacy verdict_true_false questions into verdict_yes_no", () => {
      const legacyQuestion: BankQuestion = {
        id: "VTF-SCI-0001",
        archetype_id: "verdict_true_false" as any,
        domain_id: "science",
        subtopic_id: "astronomy",
        question: "Is the sun a star? True or False?",
        format: "true_false" as any,
        choices: [
          { id: "A", text: "True", is_correct: true },
          { id: "B", text: "False", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "The Sun is a G-type main-sequence star.",
        age_band: "family",
        difficulty: 1,
        tags: ["space", "sun"],
        status: "approved",
        language: "en",
        translations: {
          vi: {
            question: "Mặt trời có phải là một ngôi sao? True or False?",
            choices: [
              { id: "A", text: "True" },
              { id: "B", text: "False" },
            ],
            explanation: "Mặt trời là một ngôi sao.",
            verified: true,
          },
        },
      };

      const normalized = normalizeVerdictQuestion(legacyQuestion);

      expect(normalized.archetype_id).toBe("verdict_yes_no");
      expect(normalized.format).toBe("yes_no");
      expect(normalized.question).toBe("Is the sun a star? Yes or No?");
      expect(normalized.choices[0].text).toBe("Yes");
      expect(normalized.choices[1].text).toBe("No");
      expect(normalized.translations?.vi.question).toBe("Mặt trời có phải là một ngôi sao? Yes or No?");
      expect(normalized.translations?.vi.choices[0].text).toBe("Yes");
      expect(normalized.translations?.vi.choices[1].text).toBe("No");
    });

    it("normalizes legacy verdict_fact_myth questions", () => {
      const vfmQuestion: BankQuestion = {
        id: "VFM-NAT-0001",
        archetype_id: "verdict_fact_myth" as any,
        domain_id: "nature_animals",
        subtopic_id: "marine_life",
        question: "Sharks are mammals. True or False?",
        format: "multiple_choice",
        choices: [
          { id: "A", text: "True", is_correct: false },
          { id: "B", text: "False", is_correct: true },
        ],
        correct_choice_id: "B",
        explanation: "Sharks are cartilaginous fish.",
        age_band: "family",
        difficulty: 1,
        tags: ["nature"],
        status: "approved",
        language: "en",
      };

      const normalized = normalizeVerdictQuestion(vfmQuestion);
      expect(normalized.archetype_id).toBe("verdict_yes_no");
      expect(normalized.format).toBe("yes_no");
      expect(normalized.choices[0].text).toBe("Yes");
      expect(normalized.choices[1].text).toBe("No");
    });

    it("passes through non-verdict questions unchanged", () => {
      const speedBlitz: BankQuestion = {
        id: "SPB-NAT-0001",
        archetype_id: "speed_blitz",
        domain_id: "nature_animals",
        subtopic_id: "marine_life",
        question: "How many hearts does an octopus have?",
        format: "multiple_choice",
        choices: [
          { id: "A", text: "3", is_correct: true },
          { id: "B", text: "1", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Octopuses have 3 hearts.",
        age_band: "family",
        difficulty: 1,
        tags: ["nature"],
        status: "approved",
        language: "en",
      };

      const normalized = normalizeVerdictQuestion(speedBlitz);
      expect(normalized).toEqual(speedBlitz);
    });
  });

  describe("bankSqliteMapper round-trip integration", () => {
    it("round-trips and normalizes via bankQuestionToRow and rowToBankQuestion", () => {
      const question: BankQuestion = {
        id: "VTF-MAP-0001",
        archetype_id: "verdict_true_false" as any,
        domain_id: "general_knowledge",
        subtopic_id: "facts",
        question: "Light travels faster than sound. True or False?",
        format: "true_false" as any,
        choices: [
          { id: "A", text: "True", is_correct: true },
          { id: "B", text: "False", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Light travels at ~300,000 km/s.",
        age_band: "family",
        difficulty: 1,
        tags: ["science"],
        status: "approved",
        language: "en",
      };

      const row = bankQuestionToRow(question);
      expect(row.archetype_id).toBe("verdict_yes_no");
      expect(row.format).toBe("yes_no");
      expect(row.question).toBe("Light travels faster than sound. Yes or No?");

      const roundTripped = rowToBankQuestion(row);
      expect(roundTripped.archetype_id).toBe("verdict_yes_no");
      expect(roundTripped.format).toBe("yes_no");
      expect(roundTripped.choices[0].text).toBe("Yes");
      expect(roundTripped.choices[1].text).toBe("No");
    });
  });
});
