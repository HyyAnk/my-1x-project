const MIN_KEYWORD_LENGTH = 4;

const NON_DISTINCTIVE_WORDS = new Set([
  "that",
  "this",
  "these",
  "those",
  "with",
  "from",
  "into",
  "onto",
  "over",
  "under",
  "about",
  "which",
  "what",
  "where",
  "when",
  "whose",
  "their",
  "there",
  "other",
  "than",
  "then",
  "have",
  "only",
  "most",
  "more",
  "very",
  "some",
  "each",
]);

const INFLECTION_SUFFIXES = ["ings", "ing", "ers", "ies", "ied", "es", "ed", "er", "ly", "s"];

function tokenize(text: string): string[] {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/**
 * Reduces a word to a rough stem so inflected forms ("glides" / "glider", "forests" / "forest") compare equal.
 */
export function stemKeyword(word: string): string {
  for (const suffix of INFLECTION_SUFFIXES) {
    if (word.length - suffix.length >= MIN_KEYWORD_LENGTH && word.endsWith(suffix)) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

function isDistinctiveWord(word: string): boolean {
  return word.length >= MIN_KEYWORD_LENGTH && !NON_DISTINCTIVE_WORDS.has(word) && !/^\d+$/.test(word);
}

function stemsMatch(answerStem: string, stemWordStem: string): boolean {
  if (answerStem === stemWordStem) return true;
  const [shorter, longer] = answerStem.length <= stemWordStem.length ? [answerStem, stemWordStem] : [stemWordStem, answerStem];
  return shorter.length >= MIN_KEYWORD_LENGTH + 1 && longer.startsWith(shorter);
}

export interface AnswerKeywordEchoOptions {
  /** Allow the stem to name the answer's category head noun, e.g. "what shark" for "Bull Shark". */
  allowCategoryHeadNoun?: boolean;
}

function categoryHeadNounStem(answerWords: string[]): string | null {
  return answerWords.length >= 2 ? stemKeyword(answerWords[answerWords.length - 1]) : null;
}

/**
 * Finds distinctive words of the correct answer that are echoed (exactly or as an inflected form) in the question stem.
 * Words shared with any distractor are ignored because they do not single out the correct answer.
 */
export function findAnswerKeywordEchoes(
  questionText: string,
  correctAnswer: string,
  distractors: readonly string[],
  options: AnswerKeywordEchoOptions = {},
): string[] {
  const distractorStems = new Set(distractors.flatMap((text) => tokenize(text).map(stemKeyword)));
  const answerWords = tokenize(correctAnswer).filter(isDistinctiveWord);
  const allowedHeadNoun = options.allowCategoryHeadNoun ? categoryHeadNounStem(answerWords) : null;
  const answerStems = [...new Set(answerWords.map(stemKeyword))].filter((stem) => !distractorStems.has(stem));
  if (answerStems.length === 0) return [];

  const stemWordStems = tokenize(questionText).filter(isDistinctiveWord).map(stemKeyword);
  return answerStems.filter((answerStem) =>
    stemWordStems.some(
      (stemWordStem) => stemsMatch(answerStem, stemWordStem) && !(answerStem === allowedHeadNoun && stemWordStem === answerStem),
    ),
  );
}
