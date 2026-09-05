/**
 * Speech Text Normalizer and Sanitizer
 *
 * Normalizes script and dialogue text into voice-safe spoken forms before TTS synthesis.
 * Eliminates accidental pause/sentence breaks caused by periods in abbreviations,
 * scientific names (e.g. "T. rex" -> "T-rex"), honorifics, titles, and common acronyms.
 */

/**
 * Normalizes abbreviations, titles, scientific names, and acronyms to prevent TTS engines
 * from reading them disjointedly or mistaking periods for sentence boundaries.
 */
export function sanitizeTextForSpeech(text: string): string {
  if (!text) return "";

  let spoken = text;

  // 1. Specific multi-letter or multi-dot abbreviations (MUST run before generic single-letter rule)
  // Note: Avoid trailing \b after a period '.' because '.' is not a word character.
  spoken = spoken
    .replace(/\be\.g\.,?\s*/gi, "for example, ")
    .replace(/\bi\.e\.,?\s*/gi, "that is, ")
    .replace(/\betc\.(?=\s|[.,!?;:]|$)/gi, "et cetera")
    .replace(/\bvs\.(?=\s|[.,!?;:]|$)/gi, "versus")
    .replace(/\bU\.S\.A\.(?=\s|[.,!?;:]|$)/gi, "USA")
    .replace(/\bU\.S\.(?=\s|[.,!?;:]|$)/gi, "US")
    .replace(/\bU\.K\.(?=\s|[.,!?;:]|$)/gi, "UK")
    .replace(/\bNo\.\s*(\d+)/gi, "Number $1");

  // 2. English titles and honorifics
  spoken = spoken
    .replace(/\bDr\.\s*/gi, "Doctor ")
    .replace(/\bMr\.\s*/gi, "Mister ")
    .replace(/\bMrs\.\s*/gi, "Missus ")
    .replace(/\bMs\.\s*/gi, "Miss ")
    .replace(/\bProf\.\s*/gi, "Professor ")
    .replace(/\bSt\.\s+/gi, "Saint ");

  // 4. Scientific & single-letter abbreviations (e.g. "T. rex" -> "T-rex", "E. coli" -> "E-coli", "C. elegans" -> "C-elegans")
  spoken = spoken.replace(/(?:^|(?<=[\s"'(]))([A-Za-z])\.\s*([a-zA-Z]+)\b/g, "$1-$2");

  return spoken.replace(/\s+/g, " ").trim();
}

/**
 * Smart boundary splitter that breaks text into performance phrases
 * without splitting single-letter initials, known abbreviations, or decimals.
 */
export function splitSmartPunctuationPhrases(text: string): string[] {
  const sanitized = sanitizeTextForSpeech(text);
  if (!sanitized) return [];

  // Split on punctuation followed by whitespace, avoiding splitting within decimals (e.g. 3.14)
  const parts = sanitized
    .split(/(?<!\d)(?<=[.?!,;:])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 1 ? parts : [sanitized];
}

export const NO_SPLIT_AFTER_WORDS = new Set([
  // English intensifiers & degree modifiers (MUST stay attached to adjective/adverb)
  "too",
  "very",
  "so",
  "more",
  "most",
  "less",
  "least",
  "really",
  "quite",
  "pretty",
  "extremely",
  "super",
  "fairly",
  "highly",
  "deeply",
  "terribly",
  "awfully",
  "hardly",
  "nearly",
  "almost",
  "just",
  "much",
  "way",
  "far",
  // English determiners & articles (MUST stay attached to noun/modifier)
  "the",
  "a",
  "an",
  "this",
  "that",
  "these",
  "those",
  "my",
  "your",
  "his",
  "her",
  "its",
  "our",
  "their",
  "each",
  "every",
  "all",
  "some",
  "any",
  "no",
  "both",
  "neither",
  "either",
  "another",
  "such",
  // English prepositions (MUST stay attached to complement noun phrase)
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "about",
  "into",
  "onto",
  "through",
  "over",
  "under",
  "between",
  "among",
  "behind",
  "across",
  "without",
  "like",
  "as",
  "during",
  "before",
  "after",
  "than",
  "upon",
  "within",
  "towards",
  // Auxiliaries & modal / tense markers
  "can",
  "could",
  "will",
  "would",
  "shall",
  "should",
  "may",
  "might",
  "must",
  "is",
  "are",
  "am",
  "was",
  "were",
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
]);

export const NO_SPLIT_BEFORE_WORDS = new Set([
  // English post-modifiers & particles
  "enough",
  "ago",
  "away",
  "apart",
]);

/**
 * Validates whether a natural speech pause/split is grammatically allowed between two adjacent words.
 * Returns false if left word is an intensifier/article/preposition or right word is a bound particle.
 */
export function canSplitBetweenWords(left: string, right: string): boolean {
  const cleanLeft = left.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "").toLowerCase();
  const cleanRight = right.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "").toLowerCase();
  if (!cleanLeft || !cleanRight) return true;
  if (NO_SPLIT_AFTER_WORDS.has(cleanLeft)) return false;
  if (NO_SPLIT_BEFORE_WORDS.has(cleanRight)) return false;
  return true;
}
