import { z } from "zod";

/**
 * The True/False (and older Fact/Myth) verdict system has been retired in favour of Yes/No.
 * These identifiers are no longer valid schema values; they are only accepted on input so that
 * previously persisted episodes, bank batches, and channel configs keep loading, and are
 * rewritten to their Yes/No equivalents during parsing.
 */
const LEGACY_VERDICT_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  verdict_true_false: "verdict_yes_no",
  verdict_fact_myth: "verdict_yes_no",
  true_false: "yes_no",
});

export const LEGACY_VERDICT_ARCHETYPE_IDS = ["verdict_true_false", "verdict_fact_myth"] as const;
export type LegacyVerdictArchetypeId = (typeof LEGACY_VERDICT_ARCHETYPE_IDS)[number];

export function isLegacyVerdictIdentifier(value: unknown): value is string {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(LEGACY_VERDICT_ALIASES, value);
}

/**
 * Maps a retired True/False identifier to its Yes/No replacement. Any other value is returned unchanged.
 */
export function normalizeLegacyVerdictIdentifier<T>(value: T): T | string {
  return isLegacyVerdictIdentifier(value) ? LEGACY_VERDICT_ALIASES[value] : value;
}

/**
 * Wraps an enum schema so that retired True/False identifiers parse as their Yes/No equivalents.
 */
export function acceptLegacyVerdictAliases<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(normalizeLegacyVerdictIdentifier, schema);
}
