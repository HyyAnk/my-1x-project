import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/** Gameplay archetypes in the coverage matrix; every admitted entity contributes one combo per archetype. */
export const MATRIX_ARCHETYPE_COUNT = 7;

interface RawEntityRecord {
  id: string;
  domain_id: string;
  audience_rating?: string;
}

function findWorkspaceRoot(): string {
  let current = process.cwd();
  while (current !== path.dirname(current)) {
    if (existsSync(path.join(current, "pnpm-workspace.yaml"))) return current;
    current = path.dirname(current);
  }
  return process.cwd();
}

export const KNOWLEDGE_BASE_ENTITIES_DIR = path.join(findWorkspaceRoot(), ".quiz-studio", "knowledge_base", "entities");

/**
 * Expected Knowledge Base shape read straight from the entity JSON files, independent of the loader:
 * only kids-rated (or unrated) subjects reach the kids and family channel.
 */
export function readKidsAudienceExpectations(entitiesDir: string = KNOWLEDGE_BASE_ENTITIES_DIR) {
  const files = readdirSync(entitiesDir).filter((file) => file.endsWith(".json"));
  const kidsEntities = files
    .flatMap((file) => JSON.parse(readFileSync(path.join(entitiesDir, file), "utf8")) as RawEntityRecord[])
    .filter((entity) => (entity.audience_rating ?? "kids") === "kids");
  const domainCounts: Record<string, number> = {};
  for (const entity of kidsEntities) domainCounts[entity.domain_id] = (domainCounts[entity.domain_id] ?? 0) + 1;
  return {
    fileCount: files.length,
    entityCount: kidsEntities.length,
    domainCount: Object.keys(domainCounts).length,
    domainCounts,
    comboCount: kidsEntities.length * MATRIX_ARCHETYPE_COUNT,
  };
}
