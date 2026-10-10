import { calculatePreparedQuestionSimilarity, prepareQuestionText, type PreparedQuestionText } from "./questionSimilarity.js";

type Postings = Map<string, number[]>;

function addPostings(postings: Postings, features: Set<string>, entryIndex: number): void {
  for (const feature of features) {
    const entries = postings.get(feature);
    if (entries) entries.push(entryIndex);
    else postings.set(feature, [entryIndex]);
  }
}

function countSharedPerEntry(postings: Postings, features: Set<string>, entryCount: number): Int32Array {
  const counts = new Int32Array(entryCount);
  for (const feature of features) {
    const entries = postings.get(feature);
    if (!entries) continue;
    for (const entryIndex of entries) counts[entryIndex] += 1;
  }
  return counts;
}

/**
 * Inverted token and bigram index over a fixed list of question texts. Scoring a query against every
 * indexed text walks only the postings of the query's own features, which is far cheaper than
 * intersecting sets pair by pair, and yields exactly the scores of calculateQuestionSimilarity.
 */
export class QuestionSimilarityIndex {
  private readonly entries: PreparedQuestionText[];
  private readonly tokenPostings: Postings = new Map();
  private readonly bigramPostings: Postings = new Map();

  constructor(texts: readonly string[]) {
    this.entries = texts.map((text) => prepareQuestionText(text));
    this.entries.forEach((entry, index) => {
      addPostings(this.tokenPostings, entry.tokens, index);
      addPostings(this.bigramPostings, entry.bigrams, index);
    });
  }

  get size(): number {
    return this.entries.length;
  }

  /** Similarity of the query to each indexed text, in index order. */
  scoreAll(queryText: string): Float64Array {
    const query = prepareQuestionText(queryText);
    const scores = new Float64Array(this.entries.length);
    if (!query.normalized) return scores;
    const sharedTokens = countSharedPerEntry(this.tokenPostings, query.tokens, this.entries.length);
    const sharedBigrams = countSharedPerEntry(this.bigramPostings, query.bigrams, this.entries.length);
    for (let index = 0; index < this.entries.length; index++) {
      scores[index] = calculatePreparedQuestionSimilarity(query, this.entries[index], {
        tokens: sharedTokens[index],
        bigrams: sharedBigrams[index],
      });
    }
    return scores;
  }
}
