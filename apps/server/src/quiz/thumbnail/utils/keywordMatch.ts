/**
 * Whole-word keyword matching for topic classification.
 *
 * Plain substring checks misclassify topics ("author" contains "thor", "year" contains "ear").
 * Latin-script keywords must therefore start and end on a word boundary, allowing only a short
 * inflection suffix so plurals and sibling languages still match ("planet" -> "planetas", "planeten").
 * CJK keywords keep substring semantics because those scripts do not separate words.
 */

const UNSEGMENTED_SCRIPT_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u;
const REGEX_SPECIAL_CHARACTERS = /[.*+?^${}()|[\]\\]/g;
const INFLECTION_SUFFIX = "(?:s|es|a|as|e|en|er|ers)?";
const keywordPatternCache = new Map<string, RegExp>();

function buildWholeWordPattern(keyword: string): RegExp {
  const cached = keywordPatternCache.get(keyword);
  if (cached) return cached;
  const escaped = keyword.replace(REGEX_SPECIAL_CHARACTERS, "\\$&");
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}${INFLECTION_SUFFIX}(?![\\p{L}\\p{N}])`, "iu");
  keywordPatternCache.set(keyword, pattern);
  return pattern;
}

export function containsKeyword(text: string, keyword: string): boolean {
  const needle = keyword.trim().toLowerCase();
  if (!needle || !text) return false;
  if (UNSEGMENTED_SCRIPT_PATTERN.test(needle)) return text.toLowerCase().includes(needle);
  return buildWholeWordPattern(needle).test(text);
}

export function containsAnyKeyword(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => containsKeyword(text, keyword));
}
