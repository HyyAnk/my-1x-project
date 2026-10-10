import { describe, expect, it } from "vitest";
import {
  calculateQuestionSimilarity,
  checkQuestionsAgainstHistory,
  evaluateQuestionMatch,
  normalizeQuestionText,
  pruneQuestionHistory,
} from "../src/quiz/qa/questionHistory.js";
import type { QuestionHistoryEntry, QuizQuestion } from "@studio/shared";

describe("Question History & Similarity Checking", () => {
  it("normalizes question text accurately", () => {
    expect(normalizeQuestionText("  Énigme : quel animal français court le plus vite ?!  ")).toBe(
      "énigme quel animal français court le plus vite",
    );
  });

  it("calculates similarity accurately", () => {
    const identical = calculateQuestionSimilarity(
      "Which planet is the largest in the Solar System?",
      "Which planet is the largest in the Solar System?",
    );
    expect(identical).toBe(1);

    const highSim = calculateQuestionSimilarity(
      "Guess which creature runs the fastest on land?",
      "Which animal is the fastest runner on land?",
    );
    expect(highSim).toBeGreaterThan(0.5);

    const lowSim = calculateQuestionSimilarity("Guess which animal runs the fastest?", "What is the capital city of France?");
    expect(lowSim).toBeLessThan(0.3);
  });

  it("evaluates exact and fuzzy duplicate matches correctly", () => {
    const exact = evaluateQuestionMatch("Which bird cannot fly?", "Which bird cannot fly?", "Penguin", "Penguin");
    expect(exact.isDuplicate).toBe(true);
    expect(exact.similarity).toBe(1.0);

    const similarWithSameAnswer = evaluateQuestionMatch(
      "Which bird swims well but cannot fly?",
      "What kind of bird swims well yet cannot fly?",
      "Penguin",
      "Penguin",
    );
    expect(similarWithSameAnswer.isDuplicate).toBe(true);
    expect(similarWithSameAnswer.similarity).toBeGreaterThanOrEqual(0.8);
  });

  it("prunes old question history based on TTL (30 days)", () => {
    const nowMs = 1700000000000;
    const dayMs = 24 * 60 * 60 * 1000;

    const entries: QuestionHistoryEntry[] = [
      {
        question_id: "q-1",
        question_text: "Question from 10 days ago",
        normalized_question: "question from 10 days ago",
        choices: ["A", "B"],
        correct_answer: "A",
        episode_id: "ep-1",
        episode_title: "Ep 1",
        channel_id: "ch-1",
        rendered_at: new Date(nowMs - 10 * dayMs).toISOString(),
      },
      {
        question_id: "q-2",
        question_text: "Question from 40 days ago (expired)",
        normalized_question: "question from 40 days ago expired",
        choices: ["A", "B"],
        correct_answer: "B",
        episode_id: "ep-2",
        episode_title: "Ep 2",
        channel_id: "ch-1",
        rendered_at: new Date(nowMs - 40 * dayMs).toISOString(),
      },
    ];

    const pruned = pruneQuestionHistory(entries, 30, nowMs);
    expect(pruned.length).toBe(1);
    expect(pruned[0].question_id).toBe("q-1");
  });

  it("checks episode questions against history and enforces pass_threshold", () => {
    const historyEntries: QuestionHistoryEntry[] = [
      {
        question_id: "hist-1",
        question_text: "Is the cheetah the fastest runner?",
        normalized_question: "is the cheetah the fastest runner",
        choices: ["True", "False"],
        correct_answer: "True",
        episode_id: "ep-old-1",
        episode_title: "Super Speedy Animals",
        channel_id: "ch-1",
        rendered_at: new Date().toISOString(),
      },
      {
        question_id: "hist-2",
        question_text: "Which planet is closest to the Sun?",
        normalized_question: "which planet is closest to the sun",
        choices: ["Mercury", "Venus", "Mars"],
        correct_answer: "Mercury",
        episode_id: "ep-old-2",
        episode_title: "Exploring the Universe",
        channel_id: "ch-1",
        rendered_at: new Date().toISOString(),
      },
    ];

    const currentQuestions: QuizQuestion[] = [
      {
        id: "q-1",
        number: 1,
        format: "true_false",
        difficulty: 1,
        question: "Is the cheetah the fastest runner?",
        choices: [
          { id: "choice_a", text: "True" },
          { id: "choice_b", text: "False" },
        ],
        correct_choice_id: "choice_a",
        explanation: "The cheetah is the fastest land animal.",
        fun_fact: "It can reach speeds of up to 120 km/h.",
        source_ids: [],
        visual_opportunity: "",
        validation: { semantic_status: "validated", source_coverage: false, fact_locked: true },
      },
      {
        id: "q-2",
        number: 2,
        format: "multiple_choice_text",
        difficulty: 2,
        question: "Which planet is closest to the Sun in the Solar System?",
        choices: [
          { id: "choice_a", text: "Mercury" },
          { id: "choice_b", text: "Venus" },
          { id: "choice_c", text: "Mars" },
          { id: "choice_d", text: "Earth" },
        ],
        correct_choice_id: "choice_a",
        explanation: "Mercury is the closest planet.",
        fun_fact: "Its temperatures swing wildly.",
        source_ids: [],
        visual_opportunity: "",
        validation: { semantic_status: "validated", source_coverage: false, fact_locked: true },
      },
      {
        id: "q-3",
        number: 3,
        format: "multiple_choice_text",
        difficulty: 2,
        question: "Which fish is the largest in the ocean?",
        choices: [
          { id: "choice_a", text: "Whale shark" },
          { id: "choice_b", text: "Blue whale" },
          { id: "choice_c", text: "Dolphin" },
          { id: "choice_d", text: "Stingray" },
        ],
        correct_choice_id: "choice_a",
        explanation: "The whale shark is the largest fish.",
        fun_fact: "It feeds only on plankton.",
        source_ids: [],
        visual_opportunity: "",
        validation: { semantic_status: "validated", source_coverage: false, fact_locked: true },
      },
    ];

    // Threshold = 1 -> Duplicate count = 2 -> Failed
    const resultFail = checkQuestionsAgainstHistory("ep-new", currentQuestions, historyEntries, 1);
    expect(resultFail.duplicate_count).toBe(2);
    expect(resultFail.passed).toBe(false);

    // Threshold = 2 -> Duplicate count = 2 -> Passed
    const resultPass = checkQuestionsAgainstHistory("ep-new", currentQuestions, historyEntries, 2);
    expect(resultPass.duplicate_count).toBe(2);
    expect(resultPass.passed).toBe(true);
  });
});
