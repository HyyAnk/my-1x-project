import assert from "node:assert/strict";
import nodeTest from "node:test";
import { QuizChoiceSchema, QuizQuestionSchema } from "../src/schemas/quiz/quizQuestions.js";

void nodeTest("QuizChoiceSchema accepts standard choice IDs including uppercase and numbers", () => {
  const validIds = ["A", "B", "C", "True", "False", "1", "2", "3", "c1", "choice-a", "choice_1"];

  for (const id of validIds) {
    const result = QuizChoiceSchema.safeParse({ id, text: `Option ${id}` });
    assert.equal(result.success, true, `Failed for id: ${id}`);
    if (result.success) {
      assert.equal(result.data.id, id);
    }
  }
});

void nodeTest("QuizQuestionSchema validates questions with uppercase choice IDs (A, B, C)", () => {
  const question = {
    id: "q_test_1",
    number: 1,
    format: "multiple_choice",
    difficulty: 2,
    question: "What is the capital of France?",
    choices: [
      { id: "A", text: "Paris" },
      { id: "B", text: "London" },
      { id: "C", text: "Berlin" },
    ],
    correct_choice_id: "A",
    explanation: "Paris is the capital of France.",
    fun_fact: "Paris is known as the City of Light.",
    source_ids: [],
    visual_opportunity: "Eiffel Tower",
    validation: {
      semantic_status: "validated" as const,
      source_coverage: false,
      fact_locked: true,
    },
  };

  const parsed = QuizQuestionSchema.parse(question);
  assert.equal(parsed.id, "q_test_1");
  assert.equal(parsed.choices.length, 3);
  assert.equal(parsed.choices[0].id, "A");
  assert.equal(parsed.choices[1].id, "B");
  assert.equal(parsed.choices[2].id, "C");
  assert.equal(parsed.correct_choice_id, "A");
});

void nodeTest("QuizQuestionSchema validates true_false questions with 2 choices (A, B or True, False)", () => {
  const question = {
    id: "q_tf_1",
    number: 1,
    format: "true_false",
    difficulty: 1,
    question: "The Earth is round. True or False?",
    choices: [
      { id: "A", text: "True" },
      { id: "B", text: "False" },
    ],
    correct_choice_id: "A",
    explanation: "The Earth is an oblate spheroid.",
    fun_fact: "",
    source_ids: [],
    visual_opportunity: "",
    validation: {
      semantic_status: "validated" as const,
      source_coverage: false,
      fact_locked: true,
    },
  };

  const parsed = QuizQuestionSchema.parse(question);
  assert.equal(parsed.id, "q_tf_1");
  assert.equal(parsed.choices.length, 2);
  assert.equal(parsed.choices[0].id, "A");
  assert.equal(parsed.choices[1].id, "B");
});
