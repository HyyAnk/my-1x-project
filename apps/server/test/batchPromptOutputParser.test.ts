import { describe, expect, it } from "vitest";
import { normalizeGenerationLanguage, parseBatchGenerationOutput } from "../src/quiz/bank/prompts/batchPromptOutputParser.js";

describe("batch prompt metadata", () => {
  it("preserves the explicit requested language on new parsed questions", () => {
    const [parsed] = parseBatchGenerationOutput(
      JSON.stringify([
        {
          question: "Which planet is red?",
          choices: [
            { id: "a", text: "Mars", is_correct: true },
            { id: "b", text: "Venus", is_correct: false },
            { id: "c", text: "Jupiter", is_correct: false },
          ],
          correct_choice_id: "a",
          explanation: "Mars is red.",
          format: "multiple_choice",
        },
      ]),
      { archetypeId: "deep_trivia", domainId: "science", subtopicId: "space", language: "en-US" },
    );
    expect(parsed.language).toBe("en");
  });

  it("defaults new Bank generation to explicit English when no language is provided", () => {
    const [parsed] = parseBatchGenerationOutput(
      JSON.stringify([
        {
          question: "Q",
          choices: [
            { id: "a", text: "A" },
            { id: "b", text: "B" },
            { id: "c", text: "C" },
          ],
          correct_choice_id: "a",
          explanation: "E",
          format: "multiple_choice",
        },
      ]),
      { archetypeId: "deep_trivia", domainId: "science", subtopicId: "space" },
    );
    expect(parsed.language).toBe("en");
  });

  it("persists a base code for regional or named generation targets", () => {
    expect(normalizeGenerationLanguage("English")).toBe("en");
    expect(normalizeGenerationLanguage("en-US")).toBe("en");
  });

  it("rejects Vietnamese generation targets instead of remapping them", () => {
    expect(() => normalizeGenerationLanguage("vi")).toThrow(/Vietnamese generation targets are not supported/);
    expect(() =>
      parseBatchGenerationOutput("[]", { archetypeId: "deep_trivia", domainId: "science", subtopicId: "space", language: "vi" }),
    ).toThrow(/Vietnamese generation targets are not supported/);
    expect(() => normalizeGenerationLanguage("fr")).toThrow(/Bank generation requires English/);
  });
});
