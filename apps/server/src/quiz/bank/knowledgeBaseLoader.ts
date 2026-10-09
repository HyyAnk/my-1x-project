import fs from "node:fs";
import path from "node:path";

import type { KnowledgeFactOrMyth, KnowledgeEntity, KnowledgeBaseStats, KnowledgeBaseLoaderOptions } from "./knowledgeBase.types.js";
import {
  admitEntityForChannelAudience,
  entityRedirectsFingerprint,
  loadEntityRedirects,
  resolveEntityRedirect,
  type EntityRedirectMap,
} from "./knowledgeBase/index.js";
import { computeEntitiesDirectoryFingerprint, resolveKnowledgeBaseEntitiesDir } from "./knowledgeBase/entitiesDirectory.js";
import { appendToIndex, isKnowledgeEntityRecord, sanitizeLoadedEntity } from "./knowledgeBase/entityRecord.js";

export type { KnowledgeFactOrMyth, KnowledgeEntity, KnowledgeBaseStats, KnowledgeBaseLoaderOptions };
export { computeEntitiesDirectoryFingerprint, resolveKnowledgeBaseEntitiesDir };

// In-memory cache structures
let cachedEntities: KnowledgeEntity[] | null = null;
let entityByIdMap = new Map<string, KnowledgeEntity>();
let entitiesByDomainMap = new Map<string, KnowledgeEntity[]>();
let entitiesByDomainSubtopicMap = new Map<string, KnowledgeEntity[]>();
let entityRedirects: EntityRedirectMap = new Map();
let restrictedEntityIds = new Set<string>();
let cachedBaseDir: string | null = null;
let cachedFingerprint: string | null = null;

/**
 * Loads all knowledge base entities from disk into memory, with instant hash-indexed caching
 * and automatic directory fingerprint change detection for dynamic entity additions.
 */
export function loadAllKnowledgeEntities(options?: KnowledgeBaseLoaderOptions): KnowledgeEntity[] {
  const targetDir = resolveKnowledgeBaseEntitiesDir(options?.baseDir);
  const currentFp = `${computeEntitiesDirectoryFingerprint(targetDir)}|${entityRedirectsFingerprint(targetDir)}`;

  if (cachedEntities && !options?.forceReload && cachedBaseDir === targetDir && cachedFingerprint === currentFp) {
    return cachedEntities;
  }

  const entities: KnowledgeEntity[] = [];
  const byId = new Map<string, KnowledgeEntity>();
  const byDomain = new Map<string, KnowledgeEntity[]>();
  const byDomainSubtopic = new Map<string, KnowledgeEntity[]>();
  const restricted = new Set<string>();

  if (!fs.existsSync(targetDir)) {
    cachedEntities = [];
    entityByIdMap = byId;
    entitiesByDomainMap = byDomain;
    entitiesByDomainSubtopicMap = byDomainSubtopic;
    entityRedirects = new Map();
    restrictedEntityIds = restricted;
    cachedBaseDir = targetDir;
    return [];
  }

  const filenames = fs
    .readdirSync(targetDir)
    .filter((file) => file.endsWith(".json"))
    .sort();

  for (const filename of filenames) {
    const fullPath = path.join(targetDir, filename);
    try {
      const raw = fs.readFileSync(fullPath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (isKnowledgeEntityRecord(item)) {
            // Teen- and adult-rated subjects never reach generation for the kids and family bank.
            const loaded = sanitizeLoadedEntity(item);
            const entity = admitEntityForChannelAudience(loaded);
            if (!entity) {
              restricted.add(loaded.id);
              continue;
            }
            entities.push(entity);
            byId.set(entity.id, entity);
            appendToIndex(byDomain, entity.domain_id, entity);
            appendToIndex(byDomainSubtopic, `${entity.domain_id}:${entity.subtopic_id}`, entity);
          }
        }
      }
    } catch {
      // Continue loading remaining entity files if one has an issue
    }
  }

  cachedEntities = entities;
  entityByIdMap = byId;
  entitiesByDomainMap = byDomain;
  entitiesByDomainSubtopicMap = byDomainSubtopic;
  entityRedirects = loadEntityRedirects(targetDir);
  restrictedEntityIds = restricted;
  cachedBaseDir = targetDir;
  cachedFingerprint = currentFp;

  return entities;
}

/**
 * Fast O(1) lookup of an entity by its unique ID (e.g. ENT-ANI-001). Ids of merged duplicates
 * resolve to their canonical entity; ids of subjects not admitted for the channel audience return undefined.
 */
export function getEntityById(id: string, options?: KnowledgeBaseLoaderOptions): KnowledgeEntity | undefined {
  loadAllKnowledgeEntities(options);
  return entityByIdMap.get(resolveEntityRedirect(id, entityRedirects));
}

/**
 * True when an entity id (after redirects) names a subject the Knowledge Base holds but does not admit for the
 * channel audience. Unknown ids and missing ids return false, so free-form bank questions are not affected.
 * Bank screening calls this once per question across the whole bank, so it reads the most recently loaded
 * snapshot instead of re-fingerprinting the entities folder on every call; any regular loader call refreshes it.
 */
export function isEntityRestrictedForChannel(id: string | null | undefined, options?: KnowledgeBaseLoaderOptions): boolean {
  if (!id) return false;
  const needsLoad =
    !cachedEntities || (options?.baseDir !== undefined && resolveKnowledgeBaseEntitiesDir(options.baseDir) !== cachedBaseDir);
  if (needsLoad) loadAllKnowledgeEntities(options);
  return restrictedEntityIds.has(resolveEntityRedirect(id, entityRedirects));
}

/** Maps a retired entity id (merged duplicate or relocated subject) to its current id; other ids pass through. */
export function resolveCanonicalEntityId(id: string, options?: KnowledgeBaseLoaderOptions): string {
  loadAllKnowledgeEntities(options);
  return resolveEntityRedirect(id, entityRedirects);
}

/**
 * Returns all entities belonging to a specific domain.
 */
export function getEntitiesByDomain(domainId: string, options?: KnowledgeBaseLoaderOptions): KnowledgeEntity[] {
  loadAllKnowledgeEntities(options);
  return entitiesByDomainMap.get(domainId) || [];
}

/**
 * Returns all entities belonging to a specific domain and subtopic.
 */
export function getEntitiesByDomainAndSubtopic(
  domainId: string,
  subtopicId: string,
  options?: KnowledgeBaseLoaderOptions,
): KnowledgeEntity[] {
  loadAllKnowledgeEntities(options);
  const subtopicKey = `${domainId}:${subtopicId}`;
  return entitiesByDomainSubtopicMap.get(subtopicKey) || [];
}

/**
 * Returns a list of all domain IDs present in the loaded knowledge base.
 */
export function getAllKnowledgeDomains(options?: KnowledgeBaseLoaderOptions): string[] {
  loadAllKnowledgeEntities(options);
  return Array.from(entitiesByDomainMap.keys()).sort();
}

/**
 * Returns all unique subtopic IDs for a given domain.
 */
export function getSubtopicsForDomain(domainId: string, options?: KnowledgeBaseLoaderOptions): string[] {
  const entities = getEntitiesByDomain(domainId, options);
  const subtopics = new Set<string>();
  for (const entity of entities) {
    if (entity.subtopic_id) {
      subtopics.add(entity.subtopic_id);
    }
  }
  return Array.from(subtopics).sort();
}

/**
 * Returns summary statistics for the loaded knowledge base.
 */
export function getKnowledgeBaseStats(options?: KnowledgeBaseLoaderOptions): KnowledgeBaseStats {
  const entities = loadAllKnowledgeEntities(options);
  const domainCounts: Record<string, number> = {};
  const subtopicCounts: Record<string, number> = {};

  for (const entity of entities) {
    domainCounts[entity.domain_id] = (domainCounts[entity.domain_id] || 0) + 1;
    const subtopicKey = `${entity.domain_id}:${entity.subtopic_id}`;
    subtopicCounts[subtopicKey] = (subtopicCounts[subtopicKey] || 0) + 1;
  }

  return {
    totalEntities: entities.length,
    domainCounts,
    subtopicCounts,
  };
}

/**
 * Clears the in-memory entity cache (useful in tests or hot reloads).
 */
export function clearKnowledgeBaseCache(): void {
  cachedEntities = null;
  entityByIdMap.clear();
  entitiesByDomainMap.clear();
  entitiesByDomainSubtopicMap.clear();
  entityRedirects = new Map();
  restrictedEntityIds = new Set();
  cachedBaseDir = null;
  cachedFingerprint = null;
}
