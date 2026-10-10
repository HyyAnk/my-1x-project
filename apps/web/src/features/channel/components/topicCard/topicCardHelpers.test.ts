import { describe, expect, it } from "vitest";
import {
  QUIZ_MAX_QUESTION_COUNT,
  QUIZ_MIN_QUESTION_COUNT,
  QUIZ_SHORT_MAX_QUESTION_COUNT,
  QUIZ_SHORT_MIN_QUESTION_COUNT,
} from "@studio/shared";
import {
  calculateEstimatedDurationMinutes,
  calculateMaxAllowedQuestions,
  formatDomain,
  formatDurationHint,
  formatQuizShortDurationHint,
  resolveMinQuestionCount,
  validateQuestionCount,
} from "./topicCardHelpers";

describe("topicCardHelpers", () => {
  describe("formatDomain", () => {
    it("converts snake_case domain identifier to capitalized title format", () => {
      expect(formatDomain("astronomy_and_cosmos")).toBe("Astronomy And Cosmos");
      expect(formatDomain("general_science")).toBe("General Science");
    });
  });

  describe("calculateEstimatedDurationMinutes", () => {
    it("enforces a minimum duration of 3 minutes", () => {
      expect(calculateEstimatedDurationMinutes(1)).toBe(3);
      expect(calculateEstimatedDurationMinutes(5)).toBe(3);
    });

    it("calculates estimated duration for higher question counts", () => {
      // 10 questions * 33 seconds = 330s / 60s = 5.5 min -> rounds to 6 min
      expect(calculateEstimatedDurationMinutes(10)).toBe(6);
    });
  });

  describe("formatDurationHint", () => {
    it("returns boundary instruction text when question count is invalid", () => {
      expect(formatDurationHint(2, false, 8)).toBe("Choose 3-8");
    });

    it("returns estimated minutes text when question count is valid", () => {
      expect(formatDurationHint(6, true, 8)).toBe("About 3 min");
    });
  });

  describe("calculateMaxAllowedQuestions", () => {
    it("returns 1 for short_reel content kind", () => {
      expect(calculateMaxAllowedQuestions("short_reel", 10, false)).toBe(1);
    });

    it("returns default max questions when neither bound nor availability is present", () => {
      expect(calculateMaxAllowedQuestions("episode", 10, false)).toBe(QUIZ_MAX_QUESTION_COUNT);
    });

    it("clamps capacity between min and max questions when bound or available", () => {
      expect(calculateMaxAllowedQuestions("episode", 6, true)).toBe(6);
      expect(calculateMaxAllowedQuestions("episode", 1, true)).toBe(QUIZ_MIN_QUESTION_COUNT);
      expect(calculateMaxAllowedQuestions("episode", 60, true)).toBe(QUIZ_MAX_QUESTION_COUNT);
    });

    it("caps quiz_short by the portrait budget and the bound source count", () => {
      expect(calculateMaxAllowedQuestions("quiz_short", 5, true)).toBe(5);
      expect(calculateMaxAllowedQuestions("quiz_short", 1, true)).toBe(QUIZ_SHORT_MIN_QUESTION_COUNT);
      expect(calculateMaxAllowedQuestions("quiz_short", 60, true)).toBe(QUIZ_SHORT_MAX_QUESTION_COUNT);
      expect(calculateMaxAllowedQuestions("quiz_short", 60, false)).toBe(QUIZ_SHORT_MAX_QUESTION_COUNT);
    });
  });

  describe("validateQuestionCount", () => {
    it("always returns true for short_reel", () => {
      expect(validateQuestionCount(1, 1, true)).toBe(true);
      expect(validateQuestionCount(5, 1, true)).toBe(true);
    });

    it("validates question count boundaries for standard episodes", () => {
      expect(validateQuestionCount(5, 8, false)).toBe(true);
      expect(validateQuestionCount(2, 8, false)).toBe(false);
      expect(validateQuestionCount(9, 8, false)).toBe(false);
      expect(validateQuestionCount(5.5, 8, false)).toBe(false);
    });

    it("checks against source capacity when provided", () => {
      expect(validateQuestionCount(6, 8, false, 5)).toBe(false);
      expect(validateQuestionCount(5, 8, false, 5)).toBe(true);
    });

    it("accepts the quiz_short minimum when the kind-specific floor is supplied", () => {
      expect(validateQuestionCount(3, 5, false, 5, QUIZ_SHORT_MIN_QUESTION_COUNT)).toBe(true);
      expect(validateQuestionCount(2, 5, false, 5, QUIZ_SHORT_MIN_QUESTION_COUNT)).toBe(false);
      expect(resolveMinQuestionCount("quiz_short")).toBe(QUIZ_SHORT_MIN_QUESTION_COUNT);
      expect(resolveMinQuestionCount("episode")).toBe(QUIZ_MIN_QUESTION_COUNT);
      expect(resolveMinQuestionCount("short_reel")).toBe(1);
    });
  });

  describe("formatQuizShortDurationHint", () => {
    it("reports seconds for a valid count and the portrait range otherwise", () => {
      expect(formatQuizShortDurationHint(5, true, 5)).toBe("About 50 s");
      expect(formatQuizShortDurationHint(8, false, 5)).toBe("Choose 3-5");
    });
  });
});
