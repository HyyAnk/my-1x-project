import { describe, expect, it } from "vitest";
import { QUIZ_SHORT_IMAGE_LAYOUT_PAIR, QUIZ_SHORT_TEXT_LAYOUT_PAIR } from "../src/quiz/director/quizShortDirectorPlan.js";
import {
  adaptQuizShortQuestion,
  adaptQuizShortQuestions,
  choiceTextOverlap,
  needsQuizShortAdaptation,
  selectDistractorToDrop,
} from "../src/quiz/bank/bridge/quizShortQuestionAdapter.js";
import { RepositoryError } from "../src/repository.js";
import { buildQuizShortQuiz } from "./fixtures/quizShortFixtures.js";

const PLANET_CHOICES = ["Red planet Mars", "Blue planet Neptune", "Red dwarf star"];

function threeChoiceQuestion(visual = "A red planet") {
  return buildQuizShortQuiz([{ choices: PLANET_CHOICES, correctIndex: 0, visual }]).questions[0];
}

describe("Quiz Short question adapter", () => {
  it("measures word overlap between choice texts", () => {
    expect(choiceTextOverlap("Red planet Mars", "Red dwarf star")).toBeCloseTo(1 / 5);
    expect(choiceTextOverlap("Red planet Mars", "Blue planet Neptune")).toBeCloseTo(1 / 5);
    expect(choiceTextOverlap("Jupiter", "Saturn")).toBe(0);
  });

  it("drops the distractor with the lowest overlap and keeps the earlier one on ties", () => {
    const question = threeChoiceQuestion();
    // Both distractors share one word with the correct answer, so the tie keeps the first distractor.
    expect(selectDistractorToDrop(question).id).toBe("q1-c2");
    const lopsided = buildQuizShortQuiz([{ choices: ["Jupiter", "Jupiter moon", "Saturn"], correctIndex: 0 }]).questions[0];
    expect(selectDistractorToDrop(lopsided).id).toBe("q1-c2");
  });

  it("adapts a three-choice question on the versus layout and records the dropped choice", () => {
    const question = threeChoiceQuestion();
    const adapted = adaptQuizShortQuestion(question, { assignedLayout: "short_versus_two", choiceImageIntent: false });
    expect(adapted.choices.map((choice) => choice.id)).toEqual(["q1-c0", "q1-c1"]);
    expect(adapted.correct_choice_id).toBe("q1-c0");
    expect(adapted.gameplay_id).toBe("versus_faceoff");
    expect(adapted.adapted_from_choice_ids).toEqual(["q1-c2"]);
    expect(question.choices).toHaveLength(3);
    expect(question.adapted_from_choice_ids).toBeUndefined();
  });

  it("adapts a three-image question even when its beat sits on the primary layout", () => {
    const question = threeChoiceQuestion();
    expect(needsQuizShortAdaptation(question, { assignedLayout: "short_media_top_choices", choiceImageIntent: true })).toBe(true);
    const adapted = adaptQuizShortQuestion(question, { assignedLayout: "short_media_top_choices", choiceImageIntent: true });
    expect(adapted.choices).toHaveLength(2);
  });

  it("leaves text-only three-choice questions and two-choice questions untouched", () => {
    const text = threeChoiceQuestion("");
    expect(adaptQuizShortQuestion(text, { assignedLayout: "short_stack_list", choiceImageIntent: false })).toBe(text);
    const yesNo = buildQuizShortQuiz([{ format: "yes_no" }]).questions[0];
    expect(adaptQuizShortQuestion(yesNo, { assignedLayout: "short_versus_two", choiceImageIntent: false })).toBe(yesNo);
  });

  it("alternates the layout pair starting on the primary layout when adapting a list", () => {
    const quiz = buildQuizShortQuiz(
      Array.from({ length: 5 }, (_, index) => ({ choices: PLANET_CHOICES, correctIndex: index % 3, visual: "A planet" })),
    );
    const adapted = adaptQuizShortQuestions(quiz.questions, QUIZ_SHORT_IMAGE_LAYOUT_PAIR);
    expect(adapted.map((question) => question.choices.length)).toEqual([3, 2, 3, 2, 3]);
    expect(adapted.map((question) => question.adapted_from_choice_ids?.length ?? 0)).toEqual([0, 1, 0, 1, 0]);
    const untouched = adaptQuizShortQuestions(quiz.questions, QUIZ_SHORT_TEXT_LAYOUT_PAIR);
    expect(untouched.map((question) => question.choices.length)).toEqual([3, 3, 3, 3, 3]);
  });

  it("uses the bank visual intent per question index", () => {
    const quiz = buildQuizShortQuiz([
      { choices: PLANET_CHOICES, visual: "A planet" },
      { choices: PLANET_CHOICES, visual: "A planet" },
    ]);
    const adapted = adaptQuizShortQuestions(quiz.questions, QUIZ_SHORT_TEXT_LAYOUT_PAIR, [
      { visual_spec: { intent: "choice_illustration", aspect_ratio: "9:16" } },
      { visual_spec: { intent: "question_illustration", aspect_ratio: "9:16" } },
    ]);
    expect(adapted.map((question) => question.choices.length)).toEqual([2, 3]);
  });

  it("rejects a question whose correct choice cannot be kept", () => {
    const question = { ...threeChoiceQuestion(), correct_choice_id: "missing" };
    expect(() => adaptQuizShortQuestion(question, { assignedLayout: "short_versus_two", choiceImageIntent: false })).toThrow(
      RepositoryError,
    );
    expect(() => selectDistractorToDrop(question)).toThrow(/QUIZ_SHORT_ADAPT_FAILED|no correct choice/);
  });
});
