import type { KnowledgeEntity } from "../knowledgeBase.types.js";
import { findKidUnsafeTerm, isKidSafeEntity } from "./kidSafetyDetector.js";

function isKidSafeText(text: string): boolean {
  return findKidUnsafeTerm(text, { onScreen: true }) === null;
}

/**
 * Removes a Knowledge Base entity that is unsuitable for a kids and family channel, and strips
 * unsuitable clues, distractors, rivals, and claims from an otherwise suitable one. Returns null when excluded,
 * including when nothing kid-safe would remain to generate questions from.
 */
export function screenKnowledgeEntityForKids(entity: KnowledgeEntity): KnowledgeEntity | null {
  if (!isKidSafeEntity(entity)) return null;
  const coreTraits = (entity.core_traits ?? []).filter(isKidSafeText);
  const factsAndMyths = (entity.facts_and_myths ?? []).filter(
    (fact) => isKidSafeText(fact.claim) && findKidUnsafeTerm(fact.explanation ?? "") === null,
  );
  if ((entity.core_traits ?? []).length > 0 && coreTraits.length === 0) return null;
  if ((entity.facts_and_myths ?? []).length > 0 && factsAndMyths.length === 0) return null;
  return {
    ...entity,
    core_traits: coreTraits,
    facts_and_myths: factsAndMyths,
    ...(entity.distractor_pool ? { distractor_pool: entity.distractor_pool.filter(isKidSafeText) } : {}),
    ...(entity.versus_candidates ? { versus_candidates: entity.versus_candidates.filter(isKidSafeText) } : {}),
  };
}
