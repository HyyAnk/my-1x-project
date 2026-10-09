import { describe, expect, it } from "vitest";
import { isVerdictChoicePair, isVerdictFormat } from "../src/quiz/thumbnail/utils/verdictChoices.js";

describe("verdict quiz detection", () => {
  it.each([
    [["True", "False"], true],
    [["Yes", "No"], true],
    [["Myth", "Fact"], true],
    [["Vrai", "Faux"], true],
    [["Mars", "Venus"], false],
    [["True", "False", "Maybe"], false],
  ])("isVerdictChoicePair(%j) -> %s", (choices, expected) => {
    expect(isVerdictChoicePair(choices)).toBe(expected);
  });

  it("recognizes the current and retired verdict format names", () => {
    expect(isVerdictFormat("yes_no")).toBe(true);
    expect(isVerdictFormat("true_false")).toBe(true);
    expect(isVerdictFormat("multiple_choice")).toBe(false);
  });
});
