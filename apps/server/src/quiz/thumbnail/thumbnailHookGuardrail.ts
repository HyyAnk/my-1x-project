/**
 * Thumbnail Hook Guardrail & Sanitizer Domain Engine
 *
 * Enforces strict YouTube thumbnail headline constraints:
 * - Word Count: 2 to 6 words (punchy, high-CTR, zero unreadable clutter)
 * - Character Count: At most 30 characters (ensures large, clear 3D typography on mobile screens)
 * - Automatic Sanitization: Cleans stray punctuation, normalizes whitespace, uppercase formatting,
 *   and applies smart condensation (delimiter split, word truncation, fallback template).
 */

export const MIN_HOOK_WORDS = 2;
export const MAX_HOOK_WORDS = 6;
export const MAX_HOOK_CHARS = 30;
export const DEFAULT_FALLBACK_HOOK = "QUIZ CHALLENGE";

export interface ThumbnailHookValidationResult {
  valid: boolean;
  wordCount: number;
  charCount: number;
  normalized: string;
  reason?: string;
}

/**
 * Normalizes hook text by stripping surrounding quotes, collapsing whitespace,
 * and trimming trailing colons, semicolons, stray commas, or multiple dots.
 */
export function normalizeHookText(raw: string | null | undefined): string {
  if (!raw) return "";

  let text = raw.trim();

  // Strip enclosing quotes (double, single, smart/curly quotes)
  text = text.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();

  // Collapse multiple whitespace into a single space
  text = text.replace(/\s+/g, " ");

  // Strip trailing colons, semicolons, commas, or whitespace
  text = text.replace(/[:;,\s]+$/g, "");

  // Strip trailing dots (single or ellipsis)
  text = text.replace(/\.+$/g, "");

  // Final cleanup of trailing colons, commas, or whitespace that were before dots
  text = text.replace(/[:;,\s]+$/g, "").trim();

  return text;
}

const CJK_REGEX = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const INTL_SEGMENTER = new Intl.Segmenter(undefined, { granularity: "word" });

const KNOWN_COMPOUND_HOOKS = new Set(["ALLGEMEINWISSEN", "ALLMÄNBILDNING", "YLEISTIETO", "AVARUUSVISA", "ELÄINVISA", "LIPPUVISA"]);

/**
 * Counts words accurately across multiple spaces, dashes, hyphens, and punctuation.
 * Non-alphanumeric punctuation marks or isolated dashes do not count as separate words.
 * Handles CJK languages (Japanese, Korean, Chinese) via Intl.Segmenter and recognizes
 * localized single-token compound words (e.g., German Allgemeinwissen, Swedish Allmänbildning).
 */
export function countWords(text: string | null | undefined): number {
  if (!text) return 0;

  // Replace hyphens, en-dashes, em-dashes, and slashes with space so that compound words like
  // "Arcade-Game" count as separate words and isolated dashes like " - " do not become word tokens.
  const normalized = text.replace(/[-–—/]/g, " ").trim();
  if (!normalized) return 0;

  // For CJK text (Japanese, Korean, Chinese) without whitespace word separation,
  // utilize standard Intl.Segmenter to extract authentic semantic word units.
  if (CJK_REGEX.test(normalized)) {
    return [...INTL_SEGMENTER.segment(normalized)].filter((s) => s.isWordLike).length;
  }

  const tokens = normalized.split(/\s+/);
  const words = tokens.map((token) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")).filter((word) => word.length > 0);

  let count = 0;
  for (const w of words) {
    if (KNOWN_COMPOUND_HOOKS.has(w.toUpperCase())) {
      count += 2;
    } else {
      count += 1;
    }
  }

  return count;
}

/**
 * Validates whether a thumbnail hook candidate meets the strict word count (2-6 words)
 * and character count (<= 30 chars) constraints.
 */
export function validateThumbnailHook(text: string | null | undefined): ThumbnailHookValidationResult {
  if (!text) {
    return {
      valid: false,
      wordCount: 0,
      charCount: 0,
      normalized: "",
      reason: "Hook text is empty",
    };
  }

  const normalized = normalizeHookText(text).toUpperCase();
  if (!normalized) {
    return {
      valid: false,
      wordCount: 0,
      charCount: 0,
      normalized: "",
      reason: "Hook text contains no valid characters",
    };
  }

  const wordCount = countWords(normalized);
  const charCount = normalized.length;

  if (wordCount < MIN_HOOK_WORDS) {
    return {
      valid: false,
      wordCount,
      charCount,
      normalized,
      reason: `Hook has too few words (${wordCount} < ${MIN_HOOK_WORDS})`,
    };
  }

  if (wordCount > MAX_HOOK_WORDS) {
    return {
      valid: false,
      wordCount,
      charCount,
      normalized,
      reason: `Hook exceeds maximum word count (${wordCount} > ${MAX_HOOK_WORDS})`,
    };
  }

  if (charCount > MAX_HOOK_CHARS) {
    return {
      valid: false,
      wordCount,
      charCount,
      normalized,
      reason: `Hook exceeds maximum character count (${charCount} > ${MAX_HOOK_CHARS})`,
    };
  }

  return {
    valid: true,
    wordCount,
    charCount,
    normalized,
  };
}

/**
 * Checks whether a candidate hook text is concise enough to serve as a punchy thumbnail hook banner.
 * Delegates directly to validateThumbnailHook to ensure single source of truth across all modules.
 */
export function isValidShortHookText(text: string | null | undefined): boolean {
  return validateThumbnailHook(text).valid;
}

/**
 * Resolves a safe, guaranteed valid fallback hook string.
 */
function resolveSafeFallback(fallbackTemplate?: string): string {
  if (fallbackTemplate) {
    const direct = validateThumbnailHook(fallbackTemplate);
    if (direct.valid) {
      return direct.normalized;
    }
    const condensed = attemptSmartCondensation(fallbackTemplate);
    if (condensed) {
      return condensed;
    }
  }
  return DEFAULT_FALLBACK_HOOK;
}

/**
 * Attempts smart condensation of an over-length hook string:
 * 1. Natural delimiter split (colons, dashes, pipes, question marks).
 * 2. Word slicing (taking first 2 to 6 words that fit within 30 chars).
 */
export function attemptSmartCondensation(raw: string): string | null {
  const cleaned = normalizeHookText(raw);
  if (!cleaned) return null;

  // 1. Try splitting by natural title delimiters: colons, pipes, em/en-dashes, spaced hyphens, question marks
  const delimiterMatch = cleaned.split(/[:|—–]|\s-\s|\?\s+/);
  if (delimiterMatch.length > 1) {
    for (const segment of delimiterMatch) {
      const segValidation = validateThumbnailHook(segment);
      if (segValidation.valid) {
        return segValidation.normalized;
      }
    }
  }

  // 2. Try word-slicing from MAX_HOOK_WORDS down to MIN_HOOK_WORDS
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length >= MIN_HOOK_WORDS) {
    const maxSlice = Math.min(tokens.length, MAX_HOOK_WORDS);
    for (let count = maxSlice; count >= MIN_HOOK_WORDS; count--) {
      let candidateTokens = tokens.slice(0, count);

      // Avoid leaving dangling prepositions, articles, or conjunctions at the end of slice
      const lastToken = candidateTokens[candidateTokens.length - 1]?.toUpperCase();
      const danglingWords = ["OF", "THE", "A", "AN", "IN", "ON", "AT", "TO", "FOR", "WITH", "BY", "FROM", "AND", "OR", "BUT", "THAT"];
      if (danglingWords.includes(lastToken) && candidateTokens.length - 1 >= MIN_HOOK_WORDS) {
        candidateTokens = candidateTokens.slice(0, -1);
      }

      const candidate = candidateTokens.join(" ");
      const candidateValidation = validateThumbnailHook(candidate);
      if (candidateValidation.valid) {
        return candidateValidation.normalized;
      }
    }
  }

  return null;
}

/**
 * Sanitizes and guards a thumbnail hook string:
 * - If valid (2-6 words AND <= 30 chars): normalizes and formats cleanly (uppercase).
 * - If invalid (exceeds 6 words OR > 30 chars): attempts smart condensation.
 * - If still invalid or has fewer than 2 words: falls back cleanly to fallbackTemplate.
 */
export function sanitizeThumbnailHook(rawHook: string | null | undefined, fallbackTemplate: string = DEFAULT_FALLBACK_HOOK): string {
  const safeFallback = resolveSafeFallback(fallbackTemplate);

  if (!rawHook) {
    return safeFallback;
  }

  // Check direct validation
  const validation = validateThumbnailHook(rawHook);
  if (validation.valid) {
    return validation.normalized;
  }

  // If hook has fewer than 2 words, it cannot be condensed into a valid hook
  if (validation.wordCount < MIN_HOOK_WORDS) {
    return safeFallback;
  }

  // Attempt smart condensation for hooks exceeding word or char limits
  const condensed = attemptSmartCondensation(rawHook);
  if (condensed) {
    return condensed;
  }

  return safeFallback;
}
