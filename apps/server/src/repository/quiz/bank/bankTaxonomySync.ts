import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { BankTaxonomySchema, CANONICAL_DOMAIN_META, type BankDomainMeta, type BankTaxonomy } from "@studio/shared";
import { CHANNEL_KNOWLEDGE_AUDIENCE } from "../../../quiz/bank/knowledgeBase/knowledgeAudience.js";
import type { RepositoryRuntime } from "../../runtime.js";
import { getQuestionBankPath } from "./bankPathResolver.js";
import { withBankRead } from "./bankSerializationBoundary.js";

export { CANONICAL_DOMAIN_META };

/**
 * Formats a snake_case or hyphenated identifier into a human-readable title.
 */
export function formatTitleFromId(id: string): string {
  return id
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Synchronizes domain taxonomy dynamically from entity files in the knowledge base.
 */
export async function syncTaxonomyFromKnowledgeBase(runtime: RepositoryRuntime): Promise<BankDomainMeta[]> {
  const candidateDirs = [
    path.join(runtime.rootDirectory, ".quiz-studio", "knowledge_base", "entities"),
    path.join(runtime.roots.runtime, "knowledge_base", "entities"),
  ];

  let entitiesDir = candidateDirs[0];
  for (const dir of candidateDirs) {
    if (existsSync(dir)) {
      entitiesDir = dir;
      break;
    }
  }

  if (!existsSync(entitiesDir)) {
    return [];
  }

  let files: string[];
  try {
    files = (await readdir(entitiesDir, { withFileTypes: true })).filter((f) => f.isFile() && f.name.endsWith(".json")).map((f) => f.name);
  } catch {
    return [];
  }

  const domainMap = new Map<
    string,
    {
      id: string;
      title: string;
      description: string;
      icon: string;
      subtopicsMap: Map<string, { id: string; title: string; description: string }>;
    }
  >();

  for (const file of files) {
    const defaultDomainId = path.basename(file, ".json");
    const filePath = path.join(entitiesDir, file);
    try {
      const content = JSON.parse(await readFile(filePath, "utf8")) as unknown;
      if (!Array.isArray(content)) continue;

      for (const rawEnt of content) {
        if (!rawEnt || typeof rawEnt !== "object") continue;
        const ent = rawEnt as { domain_id?: unknown; subtopic_id?: unknown; audience_rating?: unknown };
        // Subjects curated as teen or mature never reach the channel, so their subtopics are not offered.
        if (ent.audience_rating !== undefined && ent.audience_rating !== CHANNEL_KNOWLEDGE_AUDIENCE) continue;
        const domainId = typeof ent.domain_id === "string" && ent.domain_id.trim() ? ent.domain_id.trim() : defaultDomainId;
        if (!domainMap.has(domainId)) {
          const canonical = CANONICAL_DOMAIN_META[domainId];
          domainMap.set(domainId, {
            id: domainId,
            title: canonical?.title || formatTitleFromId(domainId),
            description: canonical?.description || `Questions and concepts covering ${formatTitleFromId(domainId)}.`,
            icon: canonical?.icon || "Sparkle",
            subtopicsMap: new Map(),
          });
        }

        const domainEntry = domainMap.get(domainId);
        if (!domainEntry) continue;

        if (typeof ent.subtopic_id === "string" && ent.subtopic_id.trim()) {
          const subId = ent.subtopic_id.trim();
          if (!domainEntry.subtopicsMap.has(subId)) {
            domainEntry.subtopicsMap.set(subId, {
              id: subId,
              title: formatTitleFromId(subId),
              description: "",
            });
          }
        }
      }
    } catch {
      // Ignore unparseable or inaccessible files
    }
  }

  return Array.from(domainMap.values()).map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    icon: d.icon,
    subtopics: Array.from(d.subtopicsMap.values()),
  }));
}

/**
 * Reads and merges question bank taxonomy from knowledge base and stored taxonomy.json (unlocked internal helper).
 */
export async function readQuestionBankTaxonomyUnlocked(this: RepositoryRuntime): Promise<BankTaxonomy> {
  const dynamicDomains = await syncTaxonomyFromKnowledgeBase(this);

  const taxonomyPath = getQuestionBankPath.call(this, "taxonomy.json");
  let fileTaxonomy: BankTaxonomy | null;
  try {
    const raw = JSON.parse(await readFile(taxonomyPath, "utf8")) as unknown;
    fileTaxonomy = BankTaxonomySchema.parse(raw);
  } catch {
    fileTaxonomy = null;
  }

  const mergedDomainsMap = new Map<string, BankDomainMeta>();

  for (const dom of dynamicDomains) {
    mergedDomainsMap.set(dom.id, { ...dom });
  }

  if (fileTaxonomy) {
    for (const fileDom of fileTaxonomy.domains) {
      if (mergedDomainsMap.has(fileDom.id)) {
        const existing = mergedDomainsMap.get(fileDom.id)!;
        // The Knowledge Base is the source of truth for which subtopics exist; the stored file only adds descriptions.
        const fileSubtopics = new Map(fileDom.subtopics.map((s) => [s.id, s]));
        const subtopics = existing.subtopics.map((sub) => ({
          ...sub,
          description: fileSubtopics.get(sub.id)?.description || sub.description,
        }));
        const canonical = CANONICAL_DOMAIN_META[fileDom.id];
        mergedDomainsMap.set(fileDom.id, {
          id: fileDom.id,
          title: canonical ? existing.title : fileDom.title || existing.title,
          description: canonical ? existing.description : fileDom.description || existing.description,
          icon: canonical ? existing.icon : fileDom.icon || existing.icon,
          subtopics,
        });
      } else if (dynamicDomains.length === 0) {
        mergedDomainsMap.set(fileDom.id, fileDom);
      }
    }
  }

  const domains = Array.from(mergedDomainsMap.values());

  return {
    schema_version: 2,
    updated_at: new Date().toISOString(),
    domains,
  };
}

/**
 * Reads and merges question bank taxonomy, serialized under withBankRead boundary.
 */
export function readQuestionBankTaxonomy(this: RepositoryRuntime): Promise<BankTaxonomy> {
  return withBankRead(this, () => readQuestionBankTaxonomyUnlocked.call(this));
}
