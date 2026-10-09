import type { QuizAgeBand } from "@studio/shared";

/** Youngest to broadest audience. "family" is the mixed all-ages audience and accepts every band. */
export const AGE_BAND_ORDER: readonly QuizAgeBand[] = ["4-6", "7-9", "10-12", "family"];

function ageBandRank(band: QuizAgeBand): number {
  const rank = AGE_BAND_ORDER.indexOf(band);
  return rank === -1 ? AGE_BAND_ORDER.length - 1 : rank;
}

/**
 * A question written for a younger band also suits every older band, never the reverse.
 * Example: a "7-9" question may appear in a "10-12" or "family" episode, but not in a "4-6" one.
 */
export function isAgeBandSuitableFor(questionBand: QuizAgeBand, targetBand: QuizAgeBand): boolean {
  return ageBandRank(questionBand) <= ageBandRank(targetBand);
}

/** The broadest band among a set of questions: the youngest audience every one of them suits. */
export function resolveCombinedAgeBand(bands: readonly QuizAgeBand[]): QuizAgeBand {
  if (bands.length === 0) return "family";
  return bands.reduce((broadest, band) => (ageBandRank(band) > ageBandRank(broadest) ? band : broadest));
}
