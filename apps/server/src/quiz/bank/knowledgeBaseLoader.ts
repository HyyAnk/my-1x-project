import fs from "node:fs";
import path from "node:path";

export interface KnowledgeFactOrMyth {
  claim: string;
  verdict: "fact" | "myth" | "true" | "false";
  explanation: string;
  fun_fact?: string;
}

export interface KnowledgeEntity {
  id: string;
  domain_id: string;
  subtopic_id: string;
  name: string;
  language: "en";
  aliases?: string[];
  difficulty?: number;
  visual_anchor: string;
  core_traits: string[];
  distractor_pool?: string[];
  facts_and_myths: KnowledgeFactOrMyth[];
  versus_candidates?: string[];
}

export interface KnowledgeBaseStats {
  totalEntities: number;
  domainCounts: Record<string, number>;
  subtopicCounts: Record<string, number>;
}

export interface KnowledgeBaseLoaderOptions {
  baseDir?: string;
  forceReload?: boolean;
}

// In-memory cache structures
let cachedEntities: KnowledgeEntity[] | null = null;
let entityByIdMap = new Map<string, KnowledgeEntity>();
let entitiesByDomainMap = new Map<string, KnowledgeEntity[]>();
let entitiesByDomainSubtopicMap = new Map<string, KnowledgeEntity[]>();
let cachedBaseDir: string | null = null;
let cachedFingerprint: string | null = null;

/**
 * Computes a lightweight fingerprint (filenames + mtimeMs + size) of the entities directory.
 * Takes < 0.1ms for 14 files and enables real-time hot-reload when new entities or files are added.
 */
export function computeEntitiesDirectoryFingerprint(targetDir: string): string {
  if (!fs.existsSync(targetDir)) return "non-existent";
  try {
    const filenames = fs
      .readdirSync(targetDir)
      .filter((file) => file.endsWith(".json"))
      .sort();
    let fp = "";
    for (const file of filenames) {
      const st = fs.statSync(path.join(targetDir, file));
      fp += `${file}:${st.mtimeMs}:${st.size};`;
    }
    return fp;
  } catch {
    return "error";
  }
}

/**
 * Resolves the directory containing knowledge base JSON files across monorepo runtimes.
 */
export function resolveKnowledgeBaseEntitiesDir(customDir?: string): string {
  if (customDir && fs.existsSync(customDir)) {
    return customDir;
  }

  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, ".quiz-studio", "knowledge_base", "entities"),
    path.resolve(cwd, "..", "..", ".quiz-studio", "knowledge_base", "entities"),
    path.resolve(cwd, "..", ".quiz-studio", "knowledge_base", "entities"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

/**
 * Loads all knowledge base entities from disk into memory, with instant hash-indexed caching
 * and automatic directory fingerprint change detection for dynamic entity additions.
 */
export function loadAllKnowledgeEntities(options?: KnowledgeBaseLoaderOptions): KnowledgeEntity[] {
  const targetDir = resolveKnowledgeBaseEntitiesDir(options?.baseDir);
  const currentFp = computeEntitiesDirectoryFingerprint(targetDir);

  if (
    cachedEntities &&
    !options?.forceReload &&
    cachedBaseDir === targetDir &&
    cachedFingerprint === currentFp
  ) {
    return cachedEntities;
  }

  const entities: KnowledgeEntity[] = [];
  const byId = new Map<string, KnowledgeEntity>();
  const byDomain = new Map<string, KnowledgeEntity[]>();
  const byDomainSubtopic = new Map<string, KnowledgeEntity[]>();

  if (!fs.existsSync(targetDir)) {
    cachedEntities = [];
    entityByIdMap = byId;
    entitiesByDomainMap = byDomain;
    entitiesByDomainSubtopicMap = byDomainSubtopic;
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
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object" && typeof item.id === "string" && typeof item.domain_id === "string") {
            const entity = item as KnowledgeEntity;
            entities.push(entity);
            byId.set(entity.id, entity);

            const domainList = byDomain.get(entity.domain_id) || [];
            domainList.push(entity);
            byDomain.set(entity.domain_id, domainList);

            const subtopicKey = `${entity.domain_id}:${entity.subtopic_id}`;
            const subtopicList = byDomainSubtopic.get(subtopicKey) || [];
            subtopicList.push(entity);
            byDomainSubtopic.set(subtopicKey, subtopicList);
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
  cachedBaseDir = targetDir;
  cachedFingerprint = currentFp;

  return entities;
}

/**
 * Fast O(1) lookup of an entity by its unique ID (e.g. ENT-ANI-001).
 */
export function getEntityById(id: string, options?: KnowledgeBaseLoaderOptions): KnowledgeEntity | undefined {
  loadAllKnowledgeEntities(options);
  return entityByIdMap.get(id);
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
  cachedBaseDir = null;
  cachedFingerprint = null;
}
