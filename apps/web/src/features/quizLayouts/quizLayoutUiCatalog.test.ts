import { describe, expect, it } from "vitest";
import { QUIZ_LANDSCAPE_LAYOUT_IDS } from "@studio/shared";
import { getQuizLayoutUiDefinitions } from "./quizLayoutUiCatalog";

describe("quiz layout UI catalog", () => {
  it("exposes landscape layouts only", () => {
    expect(getQuizLayoutUiDefinitions().map((definition) => definition.id)).toEqual(QUIZ_LANDSCAPE_LAYOUT_IDS);
    expect(getQuizLayoutUiDefinitions("9:16")).toEqual([]);
  });
});
