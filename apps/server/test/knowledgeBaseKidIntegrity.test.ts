import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { CANONICAL_DOMAIN_META } from "@studio/shared";
import { findKidUnsafeTerm, isKidSafeEntity } from "../src/quiz/bank/kidSafety/index.js";
import type { KnowledgeEntity } from "../src/quiz/bank/knowledgeBase.types.js";

function findWorkspaceRoot(): string {
  let current = process.cwd();
  while (current !== path.dirname(current)) {
    if (existsSync(path.join(current, "pnpm-workspace.yaml"))) return current;
    current = path.dirname(current);
  }
  return process.cwd();
}

const knowledgeBaseDir = path.join(findWorkspaceRoot(), ".quiz-studio", "knowledge_base");
const entitiesDir = path.join(knowledgeBaseDir, "entities");

function readAllEntities(): KnowledgeEntity[] {
  return readdirSync(entitiesDir)
    .filter((file) => file.endsWith(".json"))
    .flatMap((file) => JSON.parse(readFileSync(path.join(entitiesDir, file), "utf8")) as KnowledgeEntity[]);
}

/** Different subjects that legitimately share a name (a Norse god and a Marvel hero, an animal and a car brand). */
const ALLOWED_HOMONYMS = new Set(["thor", "loki", "jaguar", "hermes", "phoenix", "subway", "heart", "hades", "pegasus"]);

const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

describe.runIf(existsSync(entitiesDir))("Knowledge Base kid-audience integrity", () => {
  const entities = readAllEntities();
  const kidsEntities = entities.filter((entity) => (entity.audience_rating ?? "kids") === "kids");

  it("rates every entity with a known audience", () => {
    const invalid = entities.filter((entity) => !["kids", "teen", "mature"].includes(entity.audience_rating ?? ""));
    expect(invalid.map((entity) => entity.id)).toEqual([]);
  });

  it("has canonical metadata for every domain", () => {
    const domains = [...new Set(entities.map((entity) => entity.domain_id))];
    expect(domains.filter((domainId) => !CANONICAL_DOMAIN_META[domainId])).toEqual([]);
  });

  it("uses unique entity ids", () => {
    const ids = entities.map((entity) => entity.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("keeps kid-facing subject names unique across domains", () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const entity of kidsEntities) {
      const key = normalizeName(entity.name);
      if (ALLOWED_HOMONYMS.has(key)) continue;
      const previous = seen.get(key);
      if (previous) duplicates.push(`${entity.id} duplicates ${previous} (${entity.name})`);
      else seen.set(key, entity.id);
    }
    expect(duplicates).toEqual([]);
  });

  it("points every redirect at an existing entity and retires its source id", () => {
    const redirectsPath = path.join(knowledgeBaseDir, "entity_redirects.json");
    const redirects = existsSync(redirectsPath) ? (JSON.parse(readFileSync(redirectsPath, "utf8")) as Record<string, string>) : {};
    const ids = new Set(entities.map((entity) => entity.id));
    const broken = Object.entries(redirects).filter(([from, to]) => ids.has(from) || !ids.has(to));
    expect(broken).toEqual([]);
  });

  it("keeps kids-rated subjects free of unsafe names, clues, and options", () => {
    expect(kidsEntities.filter((entity) => !isKidSafeEntity(entity)).map((entity) => entity.id)).toEqual([]);
    const unsafeOptions = kidsEntities.flatMap((entity) =>
      [...(entity.distractor_pool ?? []), ...(entity.versus_candidates ?? [])]
        .filter((option) => findKidUnsafeTerm(option, { onScreen: true }))
        .map((option) => `${entity.id}: ${option}`),
    );
    expect(unsafeOptions).toEqual([]);
  });

  it("keeps kids-rated facts free of unsafe claims, explanations, and fun facts", () => {
    const unsafeFacts = kidsEntities.flatMap((entity) =>
      entity.facts_and_myths
        .filter(
          (fact) =>
            findKidUnsafeTerm(fact.claim, { onScreen: true }) ||
            findKidUnsafeTerm(fact.explanation ?? "") ||
            findKidUnsafeTerm(fact.fun_fact ?? ""),
        )
        .map((fact) => `${entity.id}: ${fact.claim}`),
    );
    expect(unsafeFacts).toEqual([]);
  });
});
