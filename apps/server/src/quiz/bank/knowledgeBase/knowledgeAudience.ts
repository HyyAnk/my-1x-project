import { screenKnowledgeEntityForKids } from "../kidSafety/kidSafeKnowledgeEntity.js";
import type { KnowledgeAudienceRating, KnowledgeEntity } from "../knowledgeBase.types.js";

/** The channel publishes for children, so only subjects rated for kids may drive generation. */
export const CHANNEL_KNOWLEDGE_AUDIENCE: KnowledgeAudienceRating = "kids";

export function resolveAudienceRating(entity: Pick<KnowledgeEntity, "audience_rating">): KnowledgeAudienceRating {
  return entity.audience_rating ?? "kids";
}

/**
 * Admits an entity for the kids and family channel: drops subjects curated as teen or mature, then
 * strips any remaining clue, rival, or claim that the lexical kid-safety screen flags. Returns null when excluded.
 */
export function admitEntityForChannelAudience(entity: KnowledgeEntity): KnowledgeEntity | null {
  if (resolveAudienceRating(entity) !== CHANNEL_KNOWLEDGE_AUDIENCE) return null;
  return screenKnowledgeEntityForKids(entity);
}
