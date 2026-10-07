import type { ThumbnailLayoutType } from "@studio/shared";
import type { SupportedLanguage } from "./locales/types.js";
import { resolveTopicSpecificHook } from "./locales/topicHooks.js";
import {
  attemptSmartCondensation,
  sanitizeThumbnailHook,
  validateThumbnailHook,
} from "./thumbnailHookGuardrail.js";

export interface UniversalTopicHookInput {
  readonly topicTitle?: string | null;
  readonly topicSummary?: string | null;
  readonly layout: ThumbnailLayoutType;
  readonly language: SupportedLanguage;
  readonly customHookText?: string | null;
  readonly defaultFallback: string;
}

const NOISE_PATTERN =
  /\b(quiz|trivia|challenge|test|exam|showdown|part\s*\d+|episode\s*\d+|vol\.?\s*\d+|season\s*\d+|true\s+or\s+false|true\/false|yes\s+or\s+no|yes\/no|vrai\s+ou\s+faux|verdadero\s+o\s+falso|richtig\s+oder\s+falsch)\b/gi;

const NUMBERING_PREFIX_PATTERN = /^(top\s+\d+|\d+\s+biggest|\d+\s+crazy|\d+\s+best|\d+\s+most|\d+)\s+/i;

const GENERIC_ARCHETYPE_TITLE_PATTERN =
  /^(general\s+knowledge|allgemeinwissen|allmänbildning|yleistieto|almen\s+viden|algemene\s+kennis|culture\s+générale|cultura\s+general|一般常識クイズ|一般常識|상식|综合知识挑战|综合知识|myths\s+and\s+facts|myths\s+&\s+facts|true\s+or\s+false|true\/false|yes\s+or\s+no|yes\/no|vrai\s+ou\s+faux|verdadero\s+o\s+falso|which\s+would\s+you\s+choose|would\s+you\s+rather|who\s+is\s+this|find\s+the\s+odd\s+one|can\s+you\s+solve\s+level|spot\s+the\s+difference|二选一|你会选哪个|誰だ|仲間外れ|間違い探し|iq\s+test|iqテスト|quiz|trivia)(\s*[:：]|\s*(quiz|trivia|tietovisa|challenge|test|showdown|\d+\s*(fragen|questions|問|道题|kysymystä)))*$/i;

/**
 * Strips formatting noise (e.g. "Quiz", "Trivia", "True or False", numbering, quotes, brackets).
 */
export function cleanRawTitleNoise(title: string): string {
  let cleaned = title.replace(NOISE_PATTERN, " ").replace(/\s+/g, " ").trim();
  cleaned = cleaned.replace(NUMBERING_PREFIX_PATTERN, "").trim();
  cleaned = cleaned.replace(/^[[({"'“”‘’]+|[\])}"'“”‘’]+$/g, "").trim();
  cleaned = cleaned.replace(/[—–:|?!.,;\s-]+$/, "").trim();
  return cleaned;
}

/**
 * Checks whether a title is a generic format or category title where the localized layout hook is preferred.
 */
export function isGenericQuizTitle(title: string | null | undefined): boolean {
  if (!title || !title.trim()) return true;
  return GENERIC_ARCHETYPE_TITLE_PATTERN.test(title.trim());
}

/**
 * Extracts a concise, punchy semantic subject headline directly from an episode topic title.
 * Prioritizes the main subject segment while stripping boilerplate formatting noise.
 */
export function extractPunchyTopicHeadline(topicTitle: string | null | undefined): string | null {
  if (!topicTitle || !topicTitle.trim()) {
    return null;
  }

  const raw = topicTitle.trim();
  if (isGenericQuizTitle(raw)) {
    return null;
  }

  // 1. If title contains delimiters (colon, dash, pipe, em-dash), analyze segments
  const delimiterRegex = /[:：|—–]|\s-\s/;
  if (delimiterRegex.test(raw)) {
    const rawSegments = raw
      .split(delimiterRegex)
      .map((s) => cleanRawTitleNoise(s))
      .filter((s) => s.length > 0);

    for (const segment of rawSegments) {
      if (isGenericQuizTitle(segment)) continue;
      const validation = validateThumbnailHook(segment);
      if (validation.valid) {
        return validation.normalized;
      }
    }
  }

  // 2. Evaluate entire cleaned title
  const fullyCleaned = cleanRawTitleNoise(raw);
  if (fullyCleaned && !isGenericQuizTitle(fullyCleaned)) {
    const directValidation = validateThumbnailHook(fullyCleaned);
    if (directValidation.valid) {
      return directValidation.normalized;
    }

    const condensed = attemptSmartCondensation(fullyCleaned);
    if (condensed && !isGenericQuizTitle(condensed)) {
      return condensed;
    }
  }

  return null;
}

/**
 * Resolves a high-CTR, topic-intelligent hook for any layout and language.
 * Checks curated topic domain taxonomies (Space, Animal, Flag, Cookie, Car, Medical/First Aid, etc.)
 * across all layouts while cleanly falling back to the layout's signature archetype banner.
 */
export function resolveUniversalTopicHook(input: UniversalTopicHookInput): string {
  // 1. Priority 1: Direct user custom hook override
  if (input.customHookText && input.customHookText.trim().length > 0) {
    return sanitizeThumbnailHook(input.customHookText, input.defaultFallback);
  }

  // 2. Priority 2: Curated domain taxonomy match (Space, Animal, Flag, Cookie, Car, Medical/First Aid, Norse, Greek, etc.)
  const topicText = `${input.topicTitle || ""} ${input.topicSummary || ""}`.trim();
  const lower = topicText.toLowerCase();

  const domainHook = resolveTopicSpecificHook(lower, input.language);
  if (domainHook) {
    return sanitizeThumbnailHook(domainHook, input.defaultFallback);
  }

  // 3. Fallback layout template (e.g. GENERAL KNOWLEDGE, WHICH WOULD YOU CHOOSE?, TRUE OR FALSE?)
  return sanitizeThumbnailHook(input.defaultFallback);
}

/**
 * Extracts a concise, punchy topic-specific headline from an episode topic title,
 * stripping formatting noise like "True or False", question numbering, and colons.
 */
export function deriveTopicHeadlineFallback(topicTitle: string | null | undefined, defaultFallback: string): string {
  if (!topicTitle || !topicTitle.trim() || isGenericQuizTitle(topicTitle)) {
    return sanitizeThumbnailHook(defaultFallback);
  }

  const extracted = extractPunchyTopicHeadline(topicTitle);
  if (extracted) {
    return extracted;
  }

  return sanitizeThumbnailHook(defaultFallback);
}
