export interface TextSpan {
  start: number;
  end: number;
}

type WordToken = RegExpMatchArray & { index: number };

/** Lowercase words allowed inside a multi-word title, e.g. "Spy x Family", "Lupin the 3rd", "Attack on Titan". */
const TITLE_CONNECTOR_WORDS = new Set(["x", "of", "the", "and", "no", "on", "de", "vs"]);

/** Capitalized words that open a question sentence and are never part of a title. */
const QUESTION_LEAD_WORDS = new Set([
  "in", "on", "at", "from", "for", "by", "with", "which", "who", "whom", "whose", "what", "where", "when",
  "why", "how", "is", "are", "was", "were", "does", "do", "did", "can", "could", "would", "will", "should",
  "has", "have", "had", "name",
]);

/** Characters allowed between two words of one title: spaces, "Yu-Gi-Oh", "Steins;Gate", "Dr. Stone", "Zelda: Breath". */
const TITLE_JOINER_GAP = /^(?:\s+|\s*[-;:&.]\s*)$/u;

export function tokenizeQuestionWords(question: string): WordToken[] {
  return [...question.matchAll(/[\p{L}\p{N}]+/gu)] as WordToken[];
}

function isTitleWord(token: WordToken): boolean {
  return /^[\p{Lu}\p{N}]/u.test(token[0]) && !QUESTION_LEAD_WORDS.has(token[0].toLocaleLowerCase());
}

/**
 * Picks the question word to highlight. Proper-noun matches (titles, names) win over common words so
 * short title words such as "Spy" or "Yu" still anchor the highlight; otherwise the first common keyword is used.
 */
export function findHighlightKeywordIndex(
  tokens: WordToken[],
  properNounCandidates: ReadonlySet<string>,
  keywordCandidates: ReadonlySet<string>,
): number {
  const properNounIndex = tokens.findIndex((token) => isTitleWord(token) && properNounCandidates.has(token[0].toLocaleLowerCase()));
  if (properNounIndex >= 0) return properNounIndex;
  return tokens.findIndex((token) => keywordCandidates.has(token[0].toLocaleLowerCase()));
}

function isConnectorWord(token: WordToken): boolean {
  return TITLE_CONNECTOR_WORDS.has(token[0]);
}

function isJoined(question: string, left: WordToken, right: WordToken): boolean {
  return TITLE_JOINER_GAP.test(question.slice(left.index + left[0].length, right.index));
}

function nextTitleStep(question: string, tokens: WordToken[], from: number, direction: 1 | -1): number {
  const neighbor = tokens[from + direction];
  if (!neighbor || !isJoined(question, ...orderPair(tokens[from], neighbor, direction))) return 0;
  if (isTitleWord(neighbor)) return 1;
  const beyond = tokens[from + direction * 2];
  if (isConnectorWord(neighbor) && beyond && isTitleWord(beyond) && isJoined(question, ...orderPair(neighbor, beyond, direction))) return 2;
  return 0;
}

function orderPair(current: WordToken, neighbor: WordToken, direction: 1 | -1): [WordToken, WordToken] {
  return direction === 1 ? [current, neighbor] : [neighbor, current];
}

function includeTrailingExclamations(question: string, end: number): number {
  let cursor = end;
  while (question[cursor] === "!") cursor += 1;
  return cursor;
}

/**
 * Expands a matched keyword to the full proper-noun title it belongs to, so highlights cover
 * "Spy x Family" or "Dragon Ball Z" instead of a single word. Lowercase keywords stay single-word.
 */
export function expandKeywordToTitleSpan(question: string, tokens: WordToken[], matchedIndex: number): TextSpan {
  const matched = tokens[matchedIndex];
  const singleWord = { start: matched.index, end: matched.index + matched[0].length };
  if (!isTitleWord(matched)) return singleWord;

  let first = matchedIndex;
  for (let step = nextTitleStep(question, tokens, first, -1); step > 0; step = nextTitleStep(question, tokens, first, -1)) {
    first -= step;
  }
  let last = matchedIndex;
  for (let step = nextTitleStep(question, tokens, last, 1); step > 0; step = nextTitleStep(question, tokens, last, 1)) {
    last += step;
  }
  const lastToken = tokens[last];
  return {
    start: tokens[first].index,
    end: includeTrailingExclamations(question, lastToken.index + lastToken[0].length),
  };
}
