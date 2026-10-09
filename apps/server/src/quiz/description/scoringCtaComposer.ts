import type { VideoDescriptionScoringCta } from "@studio/shared";
import { formatScoringRange, type CalculatedScoringTiers } from "./scoringTiers.js";
import { DESCRIPTION_LOCALE_DICTIONARIES } from "./descriptionFallbackLocales.js";

const DEFAULT_TIER_LABELS: ScoringTierLabels = { beginner: "Beginner", intermediate: "Intermediate", expert: "Master" };
const DEFAULT_DELIMITER = ": ";

/** Matches a leading score range such as "1–3 pts: ", "0-1 points : " or "4–7点：". */
const LEADING_RANGE_PREFIX = /^\s*\d+(?:\s*[–\-—~]\s*\d+)?[^:：\n]{0,24}[:：]\s*/u;

export interface ScoringTierLabels {
  beginner: string;
  intermediate: string;
  expert: string;
}

/** Resolves localized fallback rank titles and the range/title delimiter for a language. */
export function resolveScoringTierLabels(normLang: string): { labels: ScoringTierLabels; delimiter: string } {
  const locale = DESCRIPTION_LOCALE_DICTIONARIES[normLang];
  if (!locale) return { labels: DEFAULT_TIER_LABELS, delimiter: DEFAULT_DELIMITER };
  return { labels: locale.scoringLabels, delimiter: locale.scoringDelimiter ?? DEFAULT_DELIMITER };
}

/** Strips any range the model wrote so the code-calculated range is the only one shown. */
export function extractRankTitle(value: string): string {
  return value.replace(LEADING_RANGE_PREFIX, "").trim();
}

function composeTier(rawValue: string, fallbackTitle: string, range: string, delimiter: string): string {
  const title = extractRankTitle(rawValue) || fallbackTitle;
  return `${range}${delimiter}${title}`;
}

/**
 * Rebuilds each tier line from the calculated range plus the rank title,
 * guaranteeing correct numbers and localized score units.
 */
export function composeScoringCta(
  scoringCta: VideoDescriptionScoringCta,
  tiers: CalculatedScoringTiers,
  language: string,
  fallbackTitles: ScoringTierLabels,
  delimiter = DEFAULT_DELIMITER,
): VideoDescriptionScoringCta {
  const range = (tier: { min: number; max: number }) => formatScoringRange(tier.min, tier.max, language);
  return {
    beginner: composeTier(scoringCta.beginner, fallbackTitles.beginner, range(tiers.tier1), delimiter),
    intermediate: composeTier(scoringCta.intermediate, fallbackTitles.intermediate, range(tiers.tier2), delimiter),
    expert: composeTier(scoringCta.expert, fallbackTitles.expert, range(tiers.tier3), delimiter),
    cta_text: scoringCta.cta_text,
  };
}
