import { getDescriptionSectionLocale } from "./descriptionSectionLocales.js";
import type { ScoreUnitForms } from "./description.types.js";

export interface CalculatedScoringTiers {
  questionCount: number;
  tier1: { min: number; max: number };
  tier2: { min: number; max: number };
  tier3: { min: number; max: number };
}

/**
 * Calculates dynamic scoring tiers that cover every possible score 0..N:
 * - Tier 1 (Beginner): 0 .. floor(N / 3)
 * - Tier 2 (Intermediate): floor(N / 3) + 1 .. floor(2N / 3)
 * - Tier 3 (Expert): floor(2N / 3) + 1 .. N
 * A single-question quiz only has two outcomes, so the middle tier mirrors the top tier.
 */
export function calculateScoringTiers(questionCount: number): CalculatedScoringTiers {
  const count = Math.max(1, Math.floor(questionCount));

  if (count === 1) {
    return {
      questionCount: 1,
      tier1: { min: 0, max: 0 },
      tier2: { min: 1, max: 1 },
      tier3: { min: 1, max: 1 },
    };
  }

  const t1Max = Math.floor(count / 3);
  const t2Max = Math.max(t1Max + 1, Math.floor((2 * count) / 3));

  return {
    questionCount: count,
    tier1: { min: 0, max: t1Max },
    tier2: { min: t1Max + 1, max: t2Max },
    tier3: { min: t2Max + 1, max: count },
  };
}

function pickUnit(min: number, max: number, unit: ScoreUnitForms): string {
  const isSingleValue = min === max;
  const isSingular = isSingleValue && (min === 1 || (min === 0 && unit.zeroIsSingular === true));
  return isSingular ? unit.one : unit.other;
}

/**
 * Formats a localized scoring range (e.g. "0–3 points", "1 point", "4–7点").
 */
export function formatScoringRange(min: number, max: number, language = "English"): string {
  const unit = getDescriptionSectionLocale(language).scoreUnit;
  const value = min === max ? `${min}` : `${min}–${max}`;
  return `${value}${unit.spacer}${pickUnit(min, max, unit)}`;
}
