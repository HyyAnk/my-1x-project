import { describe, expect, it } from "vitest";
import { calculateQuestionSimilarity } from "../src/quiz/qa/questionHistory.js";
import { QuestionSimilarityIndex } from "../src/quiz/qa/questionSimilarityIndex.js";

const INDEXED = [
  "Which planet is known as the Red Planet?",
  "Which planet is known as the red planet in our solar system?",
  "What is the largest ocean on Earth?",
  "",
  "Énigme : quel animal français court le plus vite ?",
  "a",
];

const QUERIES = [
  "Which planet is known as the Red Planet?",
  "What is the largest ocean on planet Earth?",
  "Quel animal français court le plus vite ?",
  "How many legs does a spider have?",
  "",
  "!!!",
];

describe("QuestionSimilarityIndex", () => {
  it("scores every indexed text exactly like pairwise similarity", () => {
    const index = new QuestionSimilarityIndex(INDEXED);
    expect(index.size).toBe(INDEXED.length);
    for (const query of QUERIES) {
      const expected = INDEXED.map((text) => calculateQuestionSimilarity(query, text));
      expect(Array.from(index.scoreAll(query))).toEqual(expected);
    }
  });
});
