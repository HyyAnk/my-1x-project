import { describe, expect, it } from "vitest";
import { makeAuthorizedQuiz, makeAuthorizedBankQuestion } from "./helpers/authorizedContentFixtures.js";
import { assessSemanticQa } from "../src/quiz/qa/stages/assessSemanticQa.js";
import { runAutoQaOnQuestion } from "../src/quiz/bank/questionBankAutoQa.js";
import { validateQuizResearch, validateQuizTreatment, validateQuizScript } from "../src/tasks/validators.js";

describe("Authorized subject generation", () => {
  it.each(["Simba", "Spider-Man", "Batman", "Pikachu", "Mario", "lion cub"])("accepts a valid named subject: %s", (subject) => {
    expect(runAutoQaOnQuestion(makeAuthorizedBankQuestion(subject)).passed).toBe(true);
    expect(assessSemanticQa(makeAuthorizedQuiz(subject))).toEqual([]);
  });

  it("retains schema, quality, source, and duplicate checks", () => {
    const bank = makeAuthorizedBankQuestion("Mario");
    expect(runAutoQaOnQuestion({ ...bank, correct_choice_id: "Z" }).passed).toBe(false);
    expect(runAutoQaOnQuestion({ ...bank, question: "Short" }).passed).toBe(false);
    expect(runAutoQaOnQuestion(bank, [{ ...bank, id: "EXISTING" }]).passed).toBe(false);
    const quiz = makeAuthorizedQuiz("Mario");
    quiz.questions[0].source_ids = [];
    expect(assessSemanticQa(quiz).some((issue) => issue.code === "semantic_sources_missing")).toBe(true);
  });

  it("accepts named subjects in valid markdown without relaxing structure", () => {
    const research = "C01 Simba reference\nhttps://example.com/a\nhttps://example.com/b\nhttps://example.com/c";
    const treatment = "## Question 1\nSimba\nTime budget: 5 seconds\nCorrect answer: Simba";
    const script = "<!-- HUMOR_POLICY: v1 -->\n## Question 1\nGuess who: Simba\nCorrect answer: Simba";
    expect(() => validateQuizResearch(research, 1)).not.toThrow();
    expect(() => validateQuizTreatment(treatment, 1)).not.toThrow();
    expect(() => validateQuizScript(script, 1)).not.toThrow();
    expect(() => validateQuizResearch("C01 Simba", 1)).toThrow(/source URLs/);
    expect(() => validateQuizTreatment("Simba", 1)).toThrow(/question blocks/);
    expect(() => validateQuizScript("## Question 1\nGuess Simba; answer Simba", 1)).toThrow(/HUMOR_POLICY/);
  });
});
