import assert from "node:assert/strict";
import nodeTest from "node:test";
import type { BankQuestion } from "../src/index.js";
import { hashBankQuestionSource } from "../src/index.js";

const source: BankQuestion = {
  id: "HASH-TEST-001",
  archetype_id: "deep_trivia",
  domain_id: "science",
  subtopic_id: "space",
  language: "en",
  question: "Which planet is known as the Red Planet?",
  format: "multiple_choice",
  choices: [
    { id: "A", text: "Mars" },
    { id: "B", text: "Venus" },
    { id: "C", text: "Jupiter" },
  ],
  correct_choice_id: "A",
  explanation: "Mars appears red because of iron oxide on its surface.",
  fun_fact: "Mars has two small moons.",
  age_band: "family",
  difficulty: 2,
  tags: ["space"],
  status: "approved",
};

void nodeTest("Bank source hashes ignore localized translation fields", () => {
  const localized = {
    ...source,
    translations: {
      fr: {
        language: "fr",
        question: "Localized planet question",
        choices: [
          { id: "A", text: "Mars" },
          { id: "B", text: "Localized Venus" },
          { id: "C", text: "Jupiter" },
        ],
        explanation: "Localized planet explanation.",
        verified: true,
      },
    },
  };

  assert.equal(hashBankQuestionSource(localized), hashBankQuestionSource(source));
  assert.equal(hashBankQuestionSource.length, 1);
});
