export interface CalculatedScoringTiers {
  questionCount: number;
  tier1: { min: number; max: number };
  tier2: { min: number; max: number };
  tier3: { min: number; max: number };
}

/**
 * Calculates dynamic scoring tiers based on total question count N.
 * Divides questions into 3 proportional segments:
 * - Tier 1 (Beginner): 1 .. floor(N / 3)
 * - Tier 2 (Intermediate): floor(N / 3) + 1 .. floor(2N / 3)
 * - Tier 3 (Expert): floor(2N / 3) + 1 .. N
 */
export function calculateScoringTiers(questionCount: number): CalculatedScoringTiers {
  const count = Math.max(1, Math.floor(questionCount));

  if (count === 1) {
    return {
      questionCount: 1,
      tier1: { min: 0, max: 0 },
      tier2: { min: 0, max: 0 },
      tier3: { min: 1, max: 1 },
    };
  }

  if (count === 2) {
    return {
      questionCount: 2,
      tier1: { min: 1, max: 1 },
      tier2: { min: 1, max: 1 },
      tier3: { min: 2, max: 2 },
    };
  }

  const t1Max = Math.max(1, Math.floor(count / 3));
  const t2Min = t1Max + 1;
  const t2Max = Math.max(t2Min, Math.floor((2 * count) / 3));
  const t3Min = Math.min(count, t2Max + 1);

  return {
    questionCount: count,
    tier1: { min: 1, max: t1Max },
    tier2: { min: t2Min, max: t2Max },
    tier3: { min: t3Min, max: count },
  };
}

/**
 * Formats scoring tier string ranges (e.g. "1–3 pts", "4–7 pts", "8–10 pts").
 */
export function formatScoringRange(min: number, max: number, language = "English"): string {
  const unit = "pts";
  if (min === max) {
    return `${min} ${unit}`;
  }
  return `${min}–${max} ${unit}`;
}
