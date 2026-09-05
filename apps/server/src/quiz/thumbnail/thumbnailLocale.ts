import type { ThumbnailLayoutType } from "@studio/shared";
import { THUMBNAIL_LOCALIZATIONS, type SupportedLanguage } from "./locales/index.js";

export type { SupportedLanguage, ThumbnailLocalization } from "./locales/index.js";
export {
  THUMBNAIL_LOCALIZATIONS,
  CURIOSITY_BADGE_LOCALIZATIONS,
  AUTO_CURIOSITY_BADGE_PRESETS,
  getRandomCuriosityBadge,
  getCuriosityBadgeText,
  resolveTopicSpecificHook,
} from "./locales/index.js";

interface LanguagePatternRule {
  readonly code: SupportedLanguage;
  readonly substrings: readonly string[];
}

const LANGUAGE_PATTERN_RULES: readonly LanguagePatternRule[] = [
  { code: "nl", substrings: ["dutch", "nederland"] },
  { code: "no", substrings: ["norw", "norsk"] },
  { code: "sv", substrings: ["swed", "svensk"] },
  { code: "da", substrings: ["dan", "dansk"] },
  { code: "fi", substrings: ["finn", "suom"] },
  { code: "de", substrings: ["german", "deutsch"] },
  { code: "fr", substrings: ["french", "français", "francais"] },
  { code: "ja", substrings: ["japan", "nihon"] },
  { code: "ko", substrings: ["korea", "hangul"] },
  { code: "es", substrings: ["span", "español"] },
];

const SCRIPT_HEURISTIC_RULES: readonly { readonly regex: RegExp; readonly code: SupportedLanguage }[] = [
  // Japanese Hiragana/Katakana check
  { regex: /[\u3040-\u309f\u30a0-\u30ff]/, code: "ja" },
  // Korean Hangul check
  { regex: /[\uac00-\ud7af\u1100-\u11ff]/, code: "ko" },
];

function matchLanguageCodeOrKeywords(lang: string): SupportedLanguage | null {
  for (const { code, substrings } of LANGUAGE_PATTERN_RULES) {
    if (lang === code || lang.startsWith(`${code}-`) || substrings.some((sub) => lang.includes(sub))) {
      return code;
    }
  }
  return null;
}

function matchScriptHeuristics(text: string): SupportedLanguage | null {
  for (const { regex, code } of SCRIPT_HEURISTIC_RULES) {
    if (regex.test(text)) {
      return code;
    }
  }
  return null;
}

/**
 * Resolves the target language code from channel settings and text analysis.
 */
export function resolveThumbnailLanguage(input: { language?: string; topicTitle?: string; topicSummary?: string }): SupportedLanguage {
  const lang = (input.language || "").toLowerCase().trim();
  const directMatch = matchLanguageCodeOrKeywords(lang);
  if (directMatch) return directMatch;

  const combinedText = `${input.topicTitle || ""} ${input.topicSummary || ""}`;
  const scriptMatch = matchScriptHeuristics(combinedText);
  if (scriptMatch) return scriptMatch;

  return "en";
}

/**
 * Gets localized hook headline and badge template for a given layout and language.
 */
export function getThumbnailLocalizedTexts(
  layout: ThumbnailLayoutType,
  count: number,
  language: SupportedLanguage,
): { hookText: string; badgeText: string } {
  const locale = THUMBNAIL_LOCALIZATIONS[language] || THUMBNAIL_LOCALIZATIONS.en;
  return {
    hookText: locale.hookText[layout] || THUMBNAIL_LOCALIZATIONS.en.hookText[layout],
    badgeText: (locale.badgeTemplate[layout] || THUMBNAIL_LOCALIZATIONS.en.badgeTemplate[layout])(count),
  };
}
