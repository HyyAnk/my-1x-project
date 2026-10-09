import { describe, expect, it } from "vitest";
import { QuizQuestionSchema, type BankQuestion, type QuizQuestion } from "@studio/shared";
import {
  applyStableChoiceOrder,
  balanceGeneratedChoicePositions,
  spreadCorrectChoicePositions,
  swapContenderNamesInStem,
} from "../src/quiz/bank/choiceOrder/index.js";
import { parseBatchGenerationOutput } from "../src/quiz/bank/batchGeneratorPrompt.js";

function bankQuestion(index: number, overrides: Partial<BankQuestion> = {}): BankQuestion {
  return {
    id: `BQ-${index}`,
    archetype_id: "deep_trivia",
    domain_id: "space_earth",
    subtopic_id: "planets",
    language: "en",
    format: "multiple_choice",
    question: `Which planet fact number ${index} is correct?`,
    choices: [
      { id: "A", text: `Right ${index}`, is_correct: true },
      { id: "B", text: `Wrong ${index}a`, is_correct: false },
      { id: "C", text: `Wrong ${index}b`, is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "Because it is the correct one.",
    fun_fact: "",
    age_band: "family",
    difficulty: 2,
    tags: [],
    status: "approved",
    ...overrides,
  };
}

function quizQuestion(id: string, overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return QuizQuestionSchema.parse({
    id,
    number: 1,
    format: "multiple_choice",
    gameplay_id: "deep_trivia",
    difficulty: 2,
    question: "Which one is correct?",
    choices: [
      { id: "c1", text: "Correct" },
      { id: "c2", text: "Wrong one" },
      { id: "c3", text: "Wrong two" },
    ],
    correct_choice_id: "c1",
    explanation: "Because.",
    fun_fact: "",
    source_ids: [],
    visual_opportunity: "",
    validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    ...overrides,
  });
}

function correctIndex(question: { choices: ReadonlyArray<{ id: string }>; correct_choice_id: string }): number {
  return question.choices.findIndex((choice) => choice.id === question.correct_choice_id);
}

describe("generation-time answer position balancing", () => {
  it("rotates the correct answer through every position and relabels choices A/B/C", () => {
    const balanced = balanceGeneratedChoicePositions(Array.from({ length: 9 }, (_, index) => bankQuestion(index)));
    const positions = balanced.map(correctIndex);
    expect(new Set(positions)).toEqual(new Set([0, 1, 2]));
    expect(positions.filter((position) => position === 0)).toHaveLength(3);

    for (const [index, question] of balanced.entries()) {
      expect(question.choices.map((choice) => choice.id)).toEqual(["A", "B", "C"]);
      const correct = question.choices.find((choice) => choice.id === question.correct_choice_id);
      expect(correct?.text).toBe(`Right ${index}`);
      expect(correct?.is_correct).toBe(true);
      expect(question.choices.filter((choice) => choice.is_correct)).toHaveLength(1);
    }
  });

  it("keeps Yes/No and single-reveal choice order fixed", () => {
    const yesNo = bankQuestion(1, {
      archetype_id: "verdict_yes_no",
      format: "yes_no",
      choices: [
        { id: "A", text: "Yes", is_correct: true },
        { id: "B", text: "No", is_correct: false },
      ],
    });
    const mystery = bankQuestion(2, { archetype_id: "mystery_reveal", choices: [{ id: "A", text: "Saturn", is_correct: true }] });
    expect(balanceGeneratedChoicePositions([yesNo, mystery, yesNo])).toEqual([yesNo, mystery, yesNo]);
  });

  it("swaps the contender names in a versus stem when the sides are swapped", () => {
    const versus = (index: number) =>
      bankQuestion(index, {
        archetype_id: "versus_faceoff",
        question: `Cheetah vs Falcon ${index}: Which reaches higher top speed?`,
        choices: [
          { id: "A", text: "Cheetah", is_correct: false },
          { id: "B", text: `Falcon ${index}`, is_correct: true },
        ],
        correct_choice_id: "B",
      });
    const balanced = balanceGeneratedChoicePositions([versus(1), versus(2)]);
    for (const question of balanced) {
      const [left, right] = question.choices.map((choice) => choice.text);
      expect(question.question.indexOf(left)).toBeLessThan(question.question.indexOf(right));
    }
    expect(new Set(balanced.map(correctIndex))).toEqual(new Set([0, 1]));
  });

  it("is applied by the batch output parser", () => {
    const raw = JSON.stringify(
      Array.from({ length: 6 }, (_, index) => ({
        question: `Which planet fact number ${index} is correct?`,
        format: "multiple_choice",
        choices: [
          { id: "A", text: `Right ${index}`, is_correct: true },
          { id: "B", text: `Wrong ${index}a`, is_correct: false },
          { id: "C", text: `Wrong ${index}b`, is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Because it is the correct one.",
      })),
    );
    const parsed = parseBatchGenerationOutput(raw, { archetypeId: "deep_trivia", domainId: "space_earth", subtopicId: "planets" });
    expect(new Set(parsed.map(correctIndex)).size).toBe(3);
  });
});

describe("render-time stable choice order", () => {
  it("is deterministic per question id and preserves ids and the canonical answer", () => {
    const question = quizQuestion("bank-question-42");
    const first = applyStableChoiceOrder(question);
    const second = applyStableChoiceOrder(question);
    expect(second).toEqual(first);
    expect([...first.choices.map((choice) => choice.id)].sort()).toEqual(["c1", "c2", "c3"]);
    expect(first.correct_choice_id).toBe("c1");
    expect(first.choices.find((choice) => choice.id === "c1")?.text).toBe("Correct");
  });

  it("spreads answers across positions for legacy questions that all had the answer first", () => {
    const positions = Array.from({ length: 60 }, (_, index) => correctIndex(applyStableChoiceOrder(quizQuestion(`legacy-${index}`))));
    for (const position of [0, 1, 2]) {
      expect(positions.filter((value) => value === position).length).toBeGreaterThan(10);
    }
  });

  it("never reorders Yes/No buttons", () => {
    const yesNo = quizQuestion("yn-1", {
      format: "yes_no",
      gameplay_id: "verdict_yes_no",
      choices: [
        { id: "yes", text: "Yes" },
        { id: "no", text: "No" },
      ],
      correct_choice_id: "no",
    });
    expect(applyStableChoiceOrder(yesNo)).toBe(yesNo);
  });
});

describe("episode-level answer position spreading", () => {
  it("prevents consecutive identical answer positions for 3-choice questions", () => {
    const spread = spreadCorrectChoicePositions(Array.from({ length: 8 }, (_, index) => quizQuestion(`q-${index}`)));
    const positions = spread.map(correctIndex);
    for (let index = 1; index < positions.length; index++) {
      expect(positions[index]).not.toBe(positions[index - 1]);
    }
    for (const question of spread) {
      expect(question.choices.find((choice) => choice.id === question.correct_choice_id)?.text).toBe("Correct");
    }
  });

  it("allows at most two identical positions in a row for 2-choice versus questions", () => {
    const versus = (id: string) =>
      quizQuestion(id, {
        gameplay_id: "versus_faceoff",
        question: "Lion vs Tiger: Which cat is heavier?",
        choices: [
          { id: "lion", text: "Lion" },
          { id: "tiger", text: "Tiger" },
        ],
        correct_choice_id: "lion",
      });
    const positions = spreadCorrectChoicePositions(["v1", "v2", "v3", "v4", "v5"].map(versus)).map(correctIndex);
    for (let index = 2; index < positions.length; index++) {
      expect(positions[index] === positions[index - 1] && positions[index] === positions[index - 2]).toBe(false);
    }
  });
});

describe("versus stem contender swap", () => {
  it("swaps both names and leaves other text intact", () => {
    expect(swapContenderNamesInStem("Belgium vs Netherlands: Which has more official languages?", "Belgium", "Netherlands")).toBe(
      "Netherlands vs Belgium: Which has more official languages?",
    );
  });

  it("leaves the stem unchanged when only one contender is named", () => {
    const stem = "Which is faster than a Cheetah over long distances?";
    expect(swapContenderNamesInStem(stem, "Cheetah", "Pronghorn")).toBe(stem);
  });

  it("leaves a stem that already names the contenders in the new order unchanged", () => {
    const stem = "Which is heavier, a Tiger or a Lion?";
    expect(swapContenderNamesInStem(stem, "Lion", "Tiger")).toBe(stem);
  });

  it("matches whole words only and keeps lowercase mentions lowercase", () => {
    expect(swapContenderNamesInStem("Which category wins: the cat or the dog?", "Cat", "Dog")).toBe(
      "Which category wins: the dog or the cat?",
    );
  });
});

describe("Yes/No buttons stay fixed even without a gameplay id", () => {
  it("does not reorder a yes_no question from the direct generation path", () => {
    const yesNo = quizQuestion("question-01", {
      format: "yes_no",
      gameplay_id: undefined,
      choices: [
        { id: "choice-yes", text: "Yes" },
        { id: "choice-no", text: "No" },
      ],
      correct_choice_id: "choice-no",
    });
    expect(applyStableChoiceOrder(yesNo)).toBe(yesNo);
    expect(spreadCorrectChoicePositions([yesNo, yesNo, yesNo])).toEqual([yesNo, yesNo, yesNo]);
  });
});
