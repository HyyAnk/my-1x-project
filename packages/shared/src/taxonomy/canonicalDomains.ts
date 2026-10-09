/**
 * Canonical domain metadata, titles, and formatting helpers across the studio taxonomy.
 */

import { CANONICAL_DOMAIN_KEYWORD_RULES } from "./canonicalDomainKeywords.js";
import { CANONICAL_DOMAIN_META } from "./canonicalDomainMeta.js";

export { CANONICAL_DOMAIN_META, type CanonicalDomainInfo } from "./canonicalDomainMeta.js";

/**
 * Returns the human-readable canonical domain title for a given domain identifier.
 * Falls back to title-casing the domainId, or empty string if absent.
 */
export function formatCanonicalDomainName(domainId?: string | null): string {
  if (!domainId) return "";
  const canonical = CANONICAL_DOMAIN_META[domainId];
  if (canonical) return canonical.title;
  return domainId.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Infers a canonical domain ID from contextual text (such as topic title or premise).
 */
export function inferCanonicalDomainFromText(text?: string | null): string | undefined {
  if (!text) return undefined;
  const normalized = text.toLowerCase();
  for (const [domainId, keywords] of Object.entries(CANONICAL_DOMAIN_KEYWORD_RULES)) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      return domainId;
    }
  }
  return undefined;
}
