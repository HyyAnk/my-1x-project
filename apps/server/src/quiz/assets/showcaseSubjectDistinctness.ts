/**
 * Entity-level distinctness checks for the 4 bridge showcase subjects.
 *
 * Two subjects are treated as the same entity when they share ANY salient keyword
 * (e.g. "sphinx") after removing stop words, generic visual descriptors, and the
 * topic's own words. This is intentionally strict: a duplicated creature on the
 * title screen is far worse than a slightly more generic fallback subject.
 */

const STOP_WORDS = new Set([
  "with", "from", "that", "this", "what", "which", "where", "when", "your", "their",
  "the", "and", "for", "key", "related", "into", "onto", "over", "under", "near",
  "its", "his", "her", "who", "does", "did", "are", "was", "were", "has", "have",
]);

const GENERIC_DESCRIPTORS = new Set([
  "character", "iconic", "cinematic", "stylized", "portrait", "sacred", "golden",
  "scene", "avatar", "symbol", "emblem", "photo", "image", "illustration", "standing",
  "holding", "glowing", "background", "ambient", "peaceful", "friendly", "smiling",
  "card", "sticker", "figure", "visual", "opportunity", "quiz", "challenge", "topic",
  "warm", "light", "dramatic", "atmospheric", "landscape", "historic", "setting",
  "distinct", "mythical", "creature", "fantasy", "companion", "beast", "magical",
  "epic", "majestic", "ancient", "legendary", "mysterious", "beautiful", "giant",
  "close", "closeup", "view", "shot", "wide", "detailed", "colorful", "vibrant",
  "young", "old", "big", "small", "large", "white", "black", "red", "blue", "green",
  "dark", "bright", "shining", "sunset", "sunrise", "night", "day", "sky",
  "great", "feathered", "winged", "flying", "guarding", "sleeping", "glowing",
]);

function stem(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

const EXCLUSION_CLAUSE_PATTERN = /\s*\(must not depict:[^)]*\)/gi;

function tokenize(text: string): string[] {
  return text.replace(EXCLUSION_CLAUSE_PATTERN, "").toLowerCase().match(/[a-z0-9]{3,}/g) || [];
}

export function extractSalientKeywords(
  text: string | undefined,
  ignore: ReadonlySet<string> = new Set(),
): Set<string> {
  if (!text) return new Set();
  const result = new Set<string>();
  for (const raw of tokenize(text)) {
    const word = stem(raw);
    if (STOP_WORDS.has(raw) || GENERIC_DESCRIPTORS.has(raw) || GENERIC_DESCRIPTORS.has(word)) continue;
    if (ignore.has(raw) || ignore.has(word)) continue;
    result.add(word);
  }
  return result;
}

/** Topic words appear in every fallback subject, so they must never count as a shared entity. */
export function buildTopicIgnoreSet(topicTitle: string): Set<string> {
  const ignore = new Set<string>();
  for (const raw of tokenize(topicTitle)) {
    ignore.add(raw);
    ignore.add(stem(raw));
  }
  return ignore;
}

export function sharesEntity(a: string, b: string, ignore: ReadonlySet<string>): boolean {
  const setA = extractSalientKeywords(a, ignore);
  if (setA.size === 0) return false;
  const setB = extractSalientKeywords(b, ignore);
  for (const word of setA) {
    if (setB.has(word)) return true;
  }
  return false;
}

export function isDistinctFromAll(
  candidate: string,
  chosen: readonly string[],
  ignore: ReadonlySet<string>,
): boolean {
  return chosen.every((existing) => !sharesEntity(candidate, existing, ignore));
}

/** Returns the first candidate that does not share an entity with any chosen subject. */
export function pickDistinctSubject(
  candidates: readonly string[],
  chosen: readonly string[],
  ignore: ReadonlySet<string>,
): string | null {
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    if (isDistinctFromAll(trimmed, chosen, ignore)) return trimmed;
  }
  return null;
}

/** Short "must not depict" clause so the image model avoids entities already used on the title screen. */
export function buildExclusionClause(
  chosen: readonly string[],
  ignore: ReadonlySet<string>,
  maxTerms = 4,
): string {
  const keywordLists = chosen.map((subject) => [...extractSalientKeywords(subject, ignore)]);
  const terms: string[] = [];
  const longest = Math.max(0, ...keywordLists.map((list) => list.length));
  for (let round = 0; round < longest && terms.length < maxTerms; round++) {
    for (const list of keywordLists) {
      const word = list[round];
      if (word && !terms.includes(word)) terms.push(word);
      if (terms.length >= maxTerms) break;
    }
  }
  return terms.length ? ` (must not depict: ${terms.join(", ")})` : "";
}
