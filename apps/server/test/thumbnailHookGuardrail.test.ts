import { describe, expect, it } from "vitest";
import {
  countWords,
  normalizeHookText,
  validateThumbnailHook,
  sanitizeThumbnailHook,
  attemptSmartCondensation,
  isValidShortHookText,
  MIN_HOOK_WORDS,
  MAX_HOOK_WORDS,
  MAX_HOOK_CHARS,
  DEFAULT_FALLBACK_HOOK,
} from "../src/quiz/thumbnail/thumbnailHookGuardrail.js";

describe("thumbnailHookGuardrail", () => {
  describe("constants", () => {
    it("exports strict YouTube thumbnail constraints", () => {
      expect(MIN_HOOK_WORDS).toBe(2);
      expect(MAX_HOOK_WORDS).toBe(6);
      expect(MAX_HOOK_CHARS).toBe(30);
      expect(DEFAULT_FALLBACK_HOOK).toBe("QUIZ CHALLENGE");
    });
  });

  describe("countWords", () => {
    it("returns 0 for empty, null, undefined, or whitespace-only strings", () => {
      expect(countWords("")).toBe(0);
      expect(countWords("   ")).toBe(0);
      expect(countWords(null)).toBe(0);
      expect(countWords(undefined)).toBe(0);
    });

    it("returns 0 for pure punctuation strings", () => {
      expect(countWords("... !? :: ---")).toBe(0);
      expect(countWords("---")).toBe(0);
      expect(countWords(";;;")).toBe(0);
    });

    it("counts single word", () => {
      expect(countWords("Secrets")).toBe(1);
      expect(countWords("QUIZ")).toBe(1);
    });

    it("counts standard multi-word hooks", () => {
      expect(countWords("GENIUS TIER")).toBe(2);
      expect(countWords("TRUE OR FALSE?")).toBe(3);
      expect(countWords("CAN YOU WIN THIS?")).toBe(4);
      expect(countWords("CAN YOU SOLVE LEVEL 4?")).toBe(5);
      expect(countWords("CAN YOU WIN THIS BIG QUIZ?")).toBe(6);
    });

    it("handles multiple irregular spaces correctly", () => {
      expect(countWords("  CAN    YOU   WIN   THIS?  ")).toBe(4);
    });

    it("handles dashes and hyphens without counting isolated dashes as words", () => {
      expect(countWords("CAN - YOU - WIN")).toBe(3);
      expect(countWords("CAN — YOU — WIN")).toBe(3);
      expect(countWords("CAN – YOU – WIN")).toBe(3);
      expect(countWords("Arcade-Game Secrets")).toBe(3);
    });

    it("handles slashes and contractions", () => {
      expect(countWords("TRUE/FALSE QUIZ")).toBe(3);
      expect(countWords("WHAT'S THIS?")).toBe(2);
      expect(countWords("DON'T LOOK AWAY")).toBe(3);
    });

    it("accurately counts long titles with punctuation", () => {
      expect(countWords("Arcade Game Secrets: True or False Gaming Showdown")).toBe(8);
      expect(countWords("What can you hold in your left hand but never in your right hand?")).toBe(14);
    });
  });

  describe("normalizeHookText", () => {
    it("trims whitespace and collapses multiple spaces", () => {
      expect(normalizeHookText("  CAN   YOU   PASS?  ")).toBe("CAN YOU PASS?");
    });

    it("strips surrounding quotes", () => {
      expect(normalizeHookText('"CAN YOU PASS?"')).toBe("CAN YOU PASS?");
      expect(normalizeHookText("'TRUE OR FALSE?'")).toBe("TRUE OR FALSE?");
      expect(normalizeHookText("“GENIUS TIER”")).toBe("GENIUS TIER");
    });

    it("strips trailing colons, semicolons, stray commas, or multiple dots", () => {
      expect(normalizeHookText("ARCADE SECRETS:")).toBe("ARCADE SECRETS");
      expect(normalizeHookText("ARCADE SECRETS;")).toBe("ARCADE SECRETS");
      expect(normalizeHookText("ARCADE SECRETS,")).toBe("ARCADE SECRETS");
      expect(normalizeHookText("ARCADE SECRETS...")).toBe("ARCADE SECRETS");
      expect(normalizeHookText("ARCADE SECRETS:;,...")).toBe("ARCADE SECRETS");
    });

    it("preserves punchy trailing question marks and exclamation marks", () => {
      expect(normalizeHookText("TRUE OR FALSE?")).toBe("TRUE OR FALSE?");
      expect(normalizeHookText("CAN YOU WIN THIS?!")).toBe("CAN YOU WIN THIS?!");
      expect(normalizeHookText("ARCADE SECRETS!")).toBe("ARCADE SECRETS!");
    });
  });

  describe("validateThumbnailHook", () => {
    it("accepts valid hooks with 2 to 6 words under 30 characters", () => {
      const validSamples = [
        "GENIUS TIER", // 2 words, 11 chars
        "TRUE OR FALSE?", // 3 words, 14 chars
        "CAN YOU WIN THIS?", // 4 words, 17 chars
        "SOLAR SYSTEM TRIVIA QUIZ", // 4 words, 24 chars
        "CAN YOU SOLVE LEVEL 4?", // 5 words, 22 chars
        "CAN YOU WIN THIS BIG QUIZ?", // 6 words, 26 chars
        "ARCADE SECRETS!", // 2 words, 15 chars
      ];

      for (const sample of validSamples) {
        const result = validateThumbnailHook(sample);
        expect(result.valid).toBe(true);
        expect(result.wordCount).toBeGreaterThanOrEqual(MIN_HOOK_WORDS);
        expect(result.wordCount).toBeLessThanOrEqual(MAX_HOOK_WORDS);
        expect(result.charCount).toBeLessThanOrEqual(MAX_HOOK_CHARS);
        expect(result.normalized).toBe(sample.toUpperCase());
        expect(result.reason).toBeUndefined();
      }
    });

    it("accepts a hook with exactly 30 characters", () => {
      // "12345 12345 12345 12345 123456" has length 30, 5 words
      const exact30 = "12345 12345 12345 12345 123456";
      expect(exact30.length).toBe(30);
      const result = validateThumbnailHook(exact30);
      expect(result.valid).toBe(true);
      expect(result.charCount).toBe(30);
    });

    it("fails guardrail for 31 characters", () => {
      // "12345 12345 12345 12345 1234567" has length 31, 5 words
      const char31 = "12345 12345 12345 12345 1234567";
      expect(char31.length).toBe(31);
      const result = validateThumbnailHook(char31);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("exceeds maximum character count (31 > 30)");
    });

    it("fails guardrail for 7 words even if under 30 characters", () => {
      const words7 = "A B C D E F G";
      expect(countWords(words7)).toBe(7);
      expect(words7.length).toBeLessThanOrEqual(30);
      const result = validateThumbnailHook(words7);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("exceeds maximum word count (7 > 6)");
    });

    it("fails guardrail for long topic title: 'Arcade Game Secrets: True or False Gaming Showdown' (8 words / 48 chars)", () => {
      const longHook = "Arcade Game Secrets: True or False Gaming Showdown";
      const result = validateThumbnailHook(longHook);
      expect(result.valid).toBe(false);
      expect(result.wordCount).toBe(8);
      expect(result.charCount).toBe(50); // "ARCADE GAME SECRETS: TRUE OR FALSE GAMING SHOWDOWN"
    });

    it("fails guardrail for empty string, whitespace, null, and undefined", () => {
      expect(validateThumbnailHook("").valid).toBe(false);
      expect(validateThumbnailHook("   ").valid).toBe(false);
      expect(validateThumbnailHook(null).valid).toBe(false);
      expect(validateThumbnailHook(undefined).valid).toBe(false);
    });

    it("fails guardrail for 1 word hook (fewer than 2 words required)", () => {
      const result1 = validateThumbnailHook("Secrets");
      expect(result1.valid).toBe(false);
      expect(result1.wordCount).toBe(1);
      expect(result1.reason).toContain("too few words (1 < 2)");

      const result2 = validateThumbnailHook("QUIZ");
      expect(result2.valid).toBe(false);
      expect(result2.wordCount).toBe(1);
    });
  });

  describe("attemptSmartCondensation", () => {
    it("condenses long hook with colon delimiter to first valid segment", () => {
      const raw = "Arcade Game Secrets: True or False Gaming Showdown";
      const condensed = attemptSmartCondensation(raw);
      expect(condensed).toBe("ARCADE GAME SECRETS");
      expect(validateThumbnailHook(condensed).valid).toBe(true);
    });

    it("condenses long hook with dash delimiter to first valid segment", () => {
      const raw = "Arcade Secrets - True or False Showdown";
      const condensed = attemptSmartCondensation(raw);
      expect(condensed).toBe("ARCADE SECRETS");
      expect(validateThumbnailHook(condensed).valid).toBe(true);
    });

    it("condenses by word slicing when exceeding 6 words without delimiter", () => {
      const raw = "Can You Pass This Epic Quiz Today"; // 7 words
      const condensed = attemptSmartCondensation(raw);
      expect(condensed).toBeDefined();
      expect(validateThumbnailHook(condensed).valid).toBe(true);
      expect(countWords(condensed)).toBeLessThanOrEqual(MAX_HOOK_WORDS);
    });

    it("returns null when words cannot be condensed to <= 30 chars or >= 2 words", () => {
      const raw = "Supercalifragilisticexpialidocious Incomprehensibilities";
      expect(attemptSmartCondensation(raw)).toBeNull();
    });
  });

  describe("sanitizeThumbnailHook", () => {
    it("returns cleanly formatted uppercase hook when already valid", () => {
      expect(sanitizeThumbnailHook("true or false?", "CAN YOU PASS?")).toBe("TRUE OR FALSE?");
      expect(sanitizeThumbnailHook("can you win this?", "CAN YOU PASS?")).toBe("CAN YOU WIN THIS?");
      expect(sanitizeThumbnailHook("ARCADE SECRETS!", "CAN YOU PASS?")).toBe("ARCADE SECRETS!");
    });

    it("cleans trailing colons, semicolons, commas, dots, and whitespace", () => {
      expect(sanitizeThumbnailHook("  solar system quiz:  ", "CAN YOU PASS?")).toBe("SOLAR SYSTEM QUIZ");
      expect(sanitizeThumbnailHook("arcade secrets;...", "CAN YOU PASS?")).toBe("ARCADE SECRETS");
      expect(sanitizeThumbnailHook('"genius tier"', "CAN YOU PASS?")).toBe("GENIUS TIER");
    });

    it("preserves exactly 30 characters hook", () => {
      const exact30 = "12345 12345 12345 12345 123456";
      expect(exact30.length).toBe(30);
      const result = sanitizeThumbnailHook(exact30, "CAN YOU PASS?");
      expect(result).toBe(exact30);
      expect(result.length).toBe(30);
    });

    it("intercepts 31-character hook and trims or falls back safely", () => {
      // 5 words, 31 chars -> trims to 4 words
      const char31 = "SUPER LONG TITLE QUIZ CHALLENGE";
      expect(char31.length).toBe(31);
      const result = sanitizeThumbnailHook(char31, "CAN YOU PASS?");
      expect(result.length).toBeLessThanOrEqual(MAX_HOOK_CHARS);
      expect(validateThumbnailHook(result).valid).toBe(true);
    });

    it("intercepts 7-word hook and trims to <= 6 words", () => {
      const words7 = "Can You Pass This Epic Quiz Today";
      const result = sanitizeThumbnailHook(words7, "CAN YOU PASS?");
      expect(countWords(result)).toBeLessThanOrEqual(MAX_HOOK_WORDS);
      expect(result.length).toBeLessThanOrEqual(MAX_HOOK_CHARS);
      expect(validateThumbnailHook(result).valid).toBe(true);
    });

    it("intercepts 'Arcade Game Secrets: True or False Gaming Showdown' (8 words / 48 chars) and condenses cleanly", () => {
      const longHook = "Arcade Game Secrets: True or False Gaming Showdown";
      const result = sanitizeThumbnailHook(longHook, "CAN YOU PASS?");
      expect(result).toBe("ARCADE GAME SECRETS");
      expect(validateThumbnailHook(result).valid).toBe(true);
    });

    it("falls back to fallbackTemplate for 0 or 1 word input", () => {
      expect(sanitizeThumbnailHook("", "CAN YOU PASS?")).toBe("CAN YOU PASS?");
      expect(sanitizeThumbnailHook("   ", "CAN YOU PASS?")).toBe("CAN YOU PASS?");
      expect(sanitizeThumbnailHook(null, "CAN YOU PASS?")).toBe("CAN YOU PASS?");
      expect(sanitizeThumbnailHook(undefined, "CAN YOU PASS?")).toBe("CAN YOU PASS?");
      expect(sanitizeThumbnailHook("Secrets", "CAN YOU PASS?")).toBe("CAN YOU PASS?");
      expect(sanitizeThumbnailHook("QUIZ", "TRUE OR FALSE?")).toBe("TRUE OR FALSE?");
    });

    it("guards against invalid fallbackTemplate itself and uses DEFAULT_FALLBACK_HOOK", () => {
      // If caller provides a single-word fallback, it safely falls back to DEFAULT_FALLBACK_HOOK
      expect(sanitizeThumbnailHook("", "InvalidSingleWordFallback")).toBe(DEFAULT_FALLBACK_HOOK);
      // If caller provides an excessively long fallback, it condenses or defaults to DEFAULT_FALLBACK_HOOK
      const excessiveFallback = "This is an excessively long fallback template that cannot possibly fit";
      const result = sanitizeThumbnailHook("", excessiveFallback);
      expect(validateThumbnailHook(result).valid).toBe(true);
    });
  });

  describe("multilingual and compound hook handling", () => {
    it("handles Japanese and CJK word segmentation accurately", () => {
      expect(countWords("一般常識クイズ")).toBe(3);
      expect(countWords("どっちを選ぶ？")).toBe(3);
      expect(countWords("この人は誰？")).toBe(4);
      expect(countWords("宇宙クイズ")).toBe(2);
      expect(countWords("クイズ")).toBe(1);

      expect(validateThumbnailHook("一般常識クイズ").valid).toBe(true);
      expect(validateThumbnailHook("どっちを選ぶ？").valid).toBe(true);
      expect(validateThumbnailHook("この人は誰？").valid).toBe(true);
      expect(validateThumbnailHook("クイズ").valid).toBe(false);
    });

    it("recognizes localized compound word hooks like German and Nordic templates", () => {
      expect(countWords("ALLGEMEINWISSEN")).toBe(2);
      expect(countWords("ALLMÄNBILDNING")).toBe(2);
      expect(countWords("YLEISTIETO")).toBe(2);
      expect(countWords("AVARUUSVISA")).toBe(2);

      expect(validateThumbnailHook("ALLGEMEINWISSEN").valid).toBe(true);
      expect(validateThumbnailHook("ALLMÄNBILDNING").valid).toBe(true);
      expect(validateThumbnailHook("YLEISTIETO").valid).toBe(true);
    });
  });

  describe("isValidShortHookText delegation", () => {
    it("delegates to validateThumbnailHook(...).valid", () => {
      expect(isValidShortHookText("CAN YOU PASS?")).toBe(true);
      expect(isValidShortHookText("GENIUS TIER")).toBe(true);
      expect(isValidShortHookText("Arcade Game Secrets: True or False Gaming Showdown")).toBe(false);
      expect(isValidShortHookText("Secrets")).toBe(false);
      expect(isValidShortHookText("")).toBe(false);
      expect(isValidShortHookText(null)).toBe(false);
      expect(isValidShortHookText(undefined)).toBe(false);
    });
  });
});
