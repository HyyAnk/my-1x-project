import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  BankTaxonomySchema,
  type BankDomainMeta,
  type BankTaxonomy,
} from "@studio/shared";
import type { RepositoryRuntime } from "../../runtime.js";
import { getQuestionBankPath } from "./bankPathResolver.js";

export const CANONICAL_DOMAIN_META: Record<string, { title: string; description: string; icon: string }> = {
  careers_occupations: {
    title: "Careers & Occupations",
    description: "Professions, skilled trades, emergency services, and extreme careers.",
    icon: "Briefcase",
  },
  countries_nations: {
    title: "Countries & Nations",
    description: "World geography, iconic landmarks, flags, and cultural heritage.",
    icon: "Globe",
  },
  food_gastronomy: {
    title: "Food & Gastronomy",
    description: "Culinary traditions, global cuisine, pastries, ingredients, and street food.",
    icon: "Utensils",
  },
  human_body: {
    title: "Human Body & Biology",
    description: "Anatomy, biological systems, senses, organs, and physiology.",
    icon: "Heart",
  },
  mythology_creatures: {
    title: "Mythology & Creatures",
    description: "Mythological pantheons, legendary beasts, folklore, and epic lore.",
    icon: "Flame",
  },
  nature_animals: {
    title: "Nature & Animals",
    description: "Wildlife, animal superpowers, marine ecosystems, and biodiversity.",
    icon: "PawPrint",
  },
  pop_culture_classics: {
    title: "Pop Culture & Classics",
    description: "Cinema legends, animation, gaming icons, classic literature, and art.",
    icon: "Film",
  },
  space_earth: {
    title: "Space & Earth",
    description: "Cosmic wonders, astronomy, planetary science, and natural phenomena.",
    icon: "Compass",
  },
  vehicles_technology: {
    title: "Vehicles & Technology",
    description: "Aviation, automotive, robotics, computing breakthroughs, and transport.",
    icon: "Cpu",
  },
};

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

  let files: string[] = [];
  try {
    files = (await readdir(entitiesDir, { withFileTypes: true }))
      .filter((f) => f.isFile() && f.name.endsWith(".json"))
      .map((f) => f.name);
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
      const content = JSON.parse(await readFile(filePath, "utf8"));
      if (!Array.isArray(content)) continue;

      for (const ent of content) {
        const domainId = (typeof ent.domain_id === "string" && ent.domain_id.trim()) || defaultDomainId;
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

        const domainEntry = domainMap.get(domainId)!;
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
 * Reads and merges question bank taxonomy from knowledge base and stored taxonomy.json.
 */
export async function readQuestionBankTaxonomy(this: RepositoryRuntime): Promise<BankTaxonomy> {
  const dynamicDomains = await syncTaxonomyFromKnowledgeBase(this);

  const taxonomyPath = getQuestionBankPath.call(this, "taxonomy.json");
  let fileTaxonomy: BankTaxonomy | null = null;
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
        const subMap = new Map(existing.subtopics.map((s) => [s.id, s]));
        for (const s of fileDom.subtopics) {
          if (!subMap.has(s.id)) {
            subMap.set(s.id, s);
          } else {
            const currSub = subMap.get(s.id)!;
            subMap.set(s.id, {
              id: s.id,
              title: currSub.title || s.title,
              description: s.description || currSub.description,
            });
          }
        }
        mergedDomainsMap.set(fileDom.id, {
          id: fileDom.id,
          title: fileDom.title || existing.title,
          description: fileDom.description || existing.description,
          icon: fileDom.icon || existing.icon,
          subtopics: Array.from(subMap.values()),
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
