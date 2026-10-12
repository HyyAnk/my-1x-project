import { describe, expect, it } from "vitest";
import { findHighlightPhraseSpan, resolveQuestionHighlightPhrase } from "../src/quiz/formatting/questionHighlightPhrase.js";
import { parseBatchGenerationOutput } from "../src/quiz/bank/prompts/batchPromptOutputParser.js";
import { highlightQuestionMarkup } from "../src/quiz/render/candyArcade/candyArcadeSvg.js";

function highlighted(question: string, opportunity: string, phrase?: string): string | null {
  const match = highlightQuestionMarkup(question, opportunity, phrase).match(/<strong class="keyword-highlight">(.*?)<\/strong>/);
  return match ? match[1] : null;
}

describe("question highlight phrase matching", () => {
  it("finds a case-insensitive whole-word span", () => {
    expect(findHighlightPhraseSpan("Which drink is Iced tea made from?", "iced TEA")).toEqual({ start: 15, end: 23 });
  });

  it("tolerates extra whitespace between the phrase's words", () => {
    expect(findHighlightPhraseSpan("Is  Iced   tea sweet?", "Iced tea")).toEqual({ start: 4, end: 14 });
  });

  it("never matches inside a longer word", () => {
    expect(findHighlightPhraseSpan("Does steam rise?", "tea")).toBeNull();
  });

  it("returns the original question casing for a valid phrase", () => {
    expect(resolveQuestionHighlightPhrase("Which drink is Iced tea?", "\"iced tea\"")).toBe("Iced tea");
  });

  it.each([
    ["missing", undefined],
    ["not a string", 42],
    ["absent from the question", "lemonade"],
    ["longer than six words", "one two three four five six seven"],
  ])("drops a phrase that is %s", (_label, phrase) => {
    expect(resolveQuestionHighlightPhrase("Which drink is Iced tea?", phrase)).toBeUndefined();
  });
});

describe("LLM-chosen question highlight", () => {
  it("highlights the full compound phrase instead of the inferred first word", () => {
    const question = "Iced tea or lemonade: which one has more caffeine?";
    expect(highlighted(question, "A tall glass of Iced tea with lemon")).toBe("Iced");
    expect(highlighted(question, "A tall glass of Iced tea with lemon", "Iced tea")).toBe("Iced tea");
  });

  it("falls back to the inferred keyword when the phrase does not match the question", () => {
    expect(highlighted("In Naruto, which lazy genius controls shadows?", "Shikamaru from Naruto", "Sharingan")).toBe("Naruto");
  });
});

describe("batch output highlight phrase", () => {
  const baseItem = {
    question: "Which drink is Iced tea brewed from?",
    choices: [
      { id: "a", text: "Tea leaves", is_correct: true },
      { id: "b", text: "Coffee beans", is_correct: false },
      { id: "c", text: "Cocoa beans", is_correct: false },
    ],
    correct_choice_id: "a",
    explanation: "Iced tea is brewed tea served cold.",
    format: "multiple_choice",
  };
  const meta = { archetypeId: "deep_trivia", domainId: "food", subtopicId: "drinks" } as const;

  it("keeps a phrase that is copied from the question", () => {
    const [parsed] = parseBatchGenerationOutput(JSON.stringify([{ ...baseItem, highlight_phrase: "iced tea" }]), meta);
    expect(parsed.highlight_phrase).toBe("Iced tea");
  });

  it("drops a phrase the question does not contain", () => {
    const [parsed] = parseBatchGenerationOutput(JSON.stringify([{ ...baseItem, highlight_phrase: "green tea" }]), meta);
    expect(parsed.highlight_phrase).toBeUndefined();
  });
});
