import { describe, expect, it } from "vitest";
import { sanitizeTextForSpeech, splitSmartPunctuationPhrases, canSplitBetweenWords } from "../src/utils/speechSanitizer.js";
import { performancePhrases, splitPunctuationPhrases } from "../src/quiz/audio/voicePlan.js";
import { splitAtNarrativeBoundaries } from "../src/production.js";

describe("Speech Sanitizer & Text Normalization", () => {
  describe("sanitizeTextForSpeech", () => {
    it("normalizes single-letter scientific abbreviations like T. rex and E. coli into hyphenated spoken words", () => {
      expect(sanitizeTextForSpeech("The dinosaur T. rex was a top predator.")).toBe("The dinosaur T-rex was a top predator.");
      expect(sanitizeTextForSpeech("T. Rex and E. coli and C. elegans are studied.")).toBe("T-Rex and E-coli and C-elegans are studied.");
      expect(sanitizeTextForSpeech("The species T. rex had a powerful bite.")).toBe("The species T-rex had a powerful bite.");
    });

    it("normalizes English titles, honorifics, and abbreviations", () => {
      expect(sanitizeTextForSpeech("Dr. Watson and Mr. Holmes met Mrs. Hudson.")).toBe(
        "Doctor Watson and Mister Holmes met Missus Hudson.",
      );
      expect(sanitizeTextForSpeech("Prof. Charles lives in St. Louis.")).toBe("Professor Charles lives in Saint Louis.");
      expect(sanitizeTextForSpeech("Cats vs. dogs, e.g., playful pets, i.e., good companions etc.")).toBe(
        "Cats versus dogs, for example, playful pets, that is, good companions et cetera",
      );
      expect(sanitizeTextForSpeech("Episode No. 1 is in the U.S. and U.K. today.")).toBe("Episode Number 1 is in the US and UK today.");
    });

    it("preserves numerical decimals without breaking numbers", () => {
      expect(sanitizeTextForSpeech("Pi is approximately 3.14 with a growth rate of 2.5%")).toBe(
        "Pi is approximately 3.14 with a growth rate of 2.5%",
      );
    });
  });

  describe("splitSmartPunctuationPhrases", () => {
    it("does not split phrases at single-letter abbreviations or dinosaur names", () => {
      const input = "The dinosaur T. rex was massive. It lived in the Cretaceous period.";
      const phrases = splitSmartPunctuationPhrases(input);
      expect(phrases).toHaveLength(2);
      expect(phrases[0]).toBe("The dinosaur T-rex was massive.");
      expect(phrases[1]).toBe("It lived in the Cretaceous period.");
    });

    it("does not split on titles like Dr. or decimal numbers", () => {
      const input = "Today Dr. Strange has a lecture at 3.14 pm. Will you attend?";
      const phrases = splitSmartPunctuationPhrases(input);
      expect(phrases).toHaveLength(2);
      expect(phrases[0]).toContain("Doctor Strange");
      expect(phrases[0]).toContain("3.14");
    });
  });

  describe("voicePlan integration", () => {
    it("generates performance phrases without fragmenting T. rex into isolated single letter segments", () => {
      const phrases = performancePhrases("T. rex was a tyrant lizard, right?", "question");
      const phraseTexts = phrases.map((p) => p.text);
      expect(phraseTexts.some((t) => t.includes("T-rex"))).toBe(true);
      expect(phraseTexts.every((t) => t !== "T.")).toBe(true);
    });

    it("splitPunctuationPhrases safely handles multiple abbreviations", () => {
      const result = splitPunctuationPhrases("Watch Dr. Watson and Dr. Jane examine the T. rex fossil! Absolutely fascinating!");
      expect(result).toHaveLength(2);
      expect(result[0]).toContain("Doctor Watson");
      expect(result[0]).toContain("Doctor Jane");
      expect(result[0]).toContain("T-rex");
    });
  });

  describe("production narration splitting integration", () => {
    it("splitAtNarrativeBoundaries does not break on T. rex", () => {
      const text = "The dinosaur T. rex was one of the most formidable predators in Earth history.";
      const chunks = splitAtNarrativeBoundaries(text, 50);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toContain("T-rex");
    });
  });

  describe("canSplitBetweenWords & Collocation Protection", () => {
    it("disallows splitting after intensifiers like too, very, so", () => {
      expect(canSplitBetweenWords("too", "high")).toBe(false);
      expect(canSplitBetweenWords("very", "fast")).toBe(false);
      expect(canSplitBetweenWords("so", "loud")).toBe(false);
    });

    it("disallows splitting after articles, determiners and prepositions", () => {
      expect(canSplitBetweenWords("the", "moon")).toBe(false);
      expect(canSplitBetweenWords("a", "tiger")).toBe(false);
      expect(canSplitBetweenWords("for", "humans")).toBe(false);
      expect(canSplitBetweenWords("in", "the")).toBe(false);
    });

    it("keeps short questions with too high intact without mid-clause splitting", () => {
      const phrases = performancePhrases("Dogs hear sounds too high for humans.", "question");
      expect(phrases).toHaveLength(1);
      expect(phrases[0]?.text).toBe("Dogs hear sounds too high for humans.");
    });

    it("keeps short questions intact without breaking collocations", () => {
      const phrases = performancePhrases("Cheetahs run very fast across open grasslands.", "question");
      expect(phrases).toHaveLength(1);
      expect(phrases[0]?.text).toBe("Cheetahs run very fast across open grasslands.");
    });
  });
});
