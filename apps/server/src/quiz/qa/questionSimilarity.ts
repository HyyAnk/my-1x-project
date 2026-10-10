/**
 * Normalizes question text: NFKC normalization, lowercase, punctuation removal, whitespace trimming.
 * Uses an ASCII fast-path for maximum throughput while maintaining full unicode correctness.
 */
export function normalizeQuestionText(text: string): string {
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(text)) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Question text normalized once, with token and bigram sets built lazily on first comparison.
 * Reuse one instance per text when comparing it against many others.
 */
export class PreparedQuestionText {
  readonly normalized: string;
  private tokenSet: Set<string> | null = null;
  private bigramSet: Set<string> | null = null;

  constructor(text: string) {
    this.normalized = normalizeQuestionText(text);
  }

  get tokens(): Set<string> {
    this.tokenSet ??= new Set(this.normalized.split(" ").filter((word) => word.length > 1));
    return this.tokenSet;
  }

  get bigrams(): Set<string> {
    this.bigramSet ??= buildBigrams(this.normalized.replace(/\s/g, ""));
    return this.bigramSet;
  }
}

export function prepareQuestionText(text: string): PreparedQuestionText {
  return new PreparedQuestionText(text);
}

function buildBigrams(text: string): Set<string> {
  const bigrams = new Set<string>();
  for (let i = 0; i < text.length - 1; i++) {
    bigrams.add(text.slice(i, i + 2));
  }
  return bigrams;
}

function countShared(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const item of a) {
    if (b.has(item)) shared++;
  }
  return shared;
}

/** Token and bigram intersection sizes of two texts, when already known (e.g. counted through an index). */
export interface SharedFeatureCounts {
  tokens: number;
  bigrams: number;
}

/**
 * Similarity of two prepared texts: the larger of Token Jaccard and Character Bigram Dice Coefficient.
 * Includes an early-exit length heuristic to avoid n-gram work when the strings differ too much in length.
 */
export function calculatePreparedQuestionSimilarity(
  a: PreparedQuestionText,
  b: PreparedQuestionText,
  sharedCounts?: SharedFeatureCounts,
): number {
  const normA = a.normalized;
  const normB = b.normalized;

  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  // If the length discrepancy is too large, the pair can never meet the similarity threshold (>= 0.75).
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen > 0 && Math.abs(normA.length - normB.length) / maxLen > 0.4) {
    return 0;
  }

  const tokenIntersection = sharedCounts?.tokens ?? countShared(a.tokens, b.tokens);
  const tokenUnion = a.tokens.size + b.tokens.size - tokenIntersection;
  const jaccard = tokenUnion > 0 ? tokenIntersection / tokenUnion : 0;

  const bigramIntersection = sharedCounts?.bigrams ?? countShared(a.bigrams, b.bigrams);
  const totalBigrams = a.bigrams.size + b.bigrams.size;
  const dice = totalBigrams > 0 ? (2 * bigramIntersection) / totalBigrams : 0;

  return Math.max(jaccard, dice);
}

/**
 * Calculates similarity between two question text strings based on Token Jaccard and Bigram Dice Coefficient.
 * Prefer prepareQuestionText + calculatePreparedQuestionSimilarity when one text is compared many times.
 */
export function calculateQuestionSimilarity(textA: string, textB: string): number {
  return calculatePreparedQuestionSimilarity(prepareQuestionText(textA), prepareQuestionText(textB));
}
