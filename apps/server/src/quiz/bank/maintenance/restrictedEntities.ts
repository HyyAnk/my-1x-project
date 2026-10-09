import fs from "node:fs";
import path from "node:path";
import { CHANNEL_KNOWLEDGE_AUDIENCE, resolveAudienceRating } from "../knowledgeBase/knowledgeAudience.js";
import { loadEntityRedirects, resolveEntityRedirect } from "../knowledgeBase/entityRedirects.js";
import type { KnowledgeAudienceRating } from "../knowledgeBase.types.js";

/** Reports the audience rating of a bank question's subject when that subject is not rated for the channel. */
export type RestrictedEntityLookup = (entityId: string | undefined) => KnowledgeAudienceRating | null;

function readRawEntityRatings(entitiesDir: string): Map<string, KnowledgeAudienceRating> {
  const ratings = new Map<string, KnowledgeAudienceRating>();
  for (const file of fs.readdirSync(entitiesDir).filter((name) => name.endsWith(".json"))) {
    const parsed: unknown = JSON.parse(fs.readFileSync(path.join(entitiesDir, file), "utf-8"));
    if (!Array.isArray(parsed)) continue;
    for (const entity of parsed as Array<{ id?: unknown; audience_rating?: KnowledgeAudienceRating }>) {
      if (typeof entity.id === "string") ratings.set(entity.id, resolveAudienceRating(entity));
    }
  }
  return ratings;
}

/**
 * Builds a lookup of Knowledge Base subjects curated as teen or mature. Raw entity files are read directly
 * because the loader hides those subjects; retired ids are followed through the redirect table.
 */
export function loadRestrictedEntityLookup(entitiesDir: string): RestrictedEntityLookup {
  const ratings = readRawEntityRatings(entitiesDir);
  const redirects = loadEntityRedirects(entitiesDir);
  return (entityId) => {
    if (!entityId) return null;
    const rating = ratings.get(resolveEntityRedirect(entityId, redirects)) ?? ratings.get(entityId);
    return rating && rating !== CHANNEL_KNOWLEDGE_AUDIENCE ? rating : null;
  };
}
