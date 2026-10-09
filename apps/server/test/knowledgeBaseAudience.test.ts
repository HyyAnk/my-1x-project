import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { admitEntityForChannelAudience, resolveEntityRedirect } from "../src/quiz/bank/knowledgeBase/index.js";
import type { KnowledgeEntity } from "../src/quiz/bank/knowledgeBase.types.js";
import {
  clearKnowledgeBaseCache,
  getEntitiesByDomain,
  getEntityById,
  isEntityRestrictedForChannel,
  loadAllKnowledgeEntities,
  resolveCanonicalEntityId,
} from "../src/quiz/bank/knowledgeBaseLoader.js";

function buildEntity(overrides: Partial<KnowledgeEntity> = {}): KnowledgeEntity {
  return {
    id: "ENT-ANI-900",
    domain_id: "nature_animals",
    subtopic_id: "mammals",
    name: "Test Otter",
    language: "en",
    visual_anchor: "A playful otter floating on its back in a calm river, 9:16 vertical shot.",
    core_traits: ["Floats on its back", "Holds hands while sleeping"],
    facts_and_myths: [
      { claim: "Otters hold hands while they sleep.", verdict: "fact", explanation: "Holding hands keeps them from drifting apart." },
    ],
    ...overrides,
  };
}

describe("admitEntityForChannelAudience", () => {
  it("admits kids-rated and unrated entities", () => {
    expect(admitEntityForChannelAudience(buildEntity({ audience_rating: "kids" }))).not.toBeNull();
    expect(admitEntityForChannelAudience(buildEntity())).not.toBeNull();
  });

  it("excludes teen and mature entities even when their text looks harmless", () => {
    expect(admitEntityForChannelAudience(buildEntity({ audience_rating: "teen" }))).toBeNull();
    expect(admitEntityForChannelAudience(buildEntity({ audience_rating: "mature" }))).toBeNull();
  });
});

describe("resolveEntityRedirect", () => {
  it("follows chains to the current id and passes unknown ids through", () => {
    const redirects = new Map([
      ["ENT-POP-001", "ENT-POP-002"],
      ["ENT-POP-002", "ENT-ANM-003"],
    ]);
    expect(resolveEntityRedirect("ENT-POP-001", redirects)).toBe("ENT-ANM-003");
    expect(resolveEntityRedirect("ENT-ANI-001", redirects)).toBe("ENT-ANI-001");
  });

  it("stops on a cycle instead of looping forever", () => {
    const redirects = new Map([
      ["ENT-A-001", "ENT-B-001"],
      ["ENT-B-001", "ENT-A-001"],
    ]);
    expect(resolveEntityRedirect("ENT-A-001", redirects)).toBe("ENT-B-001");
  });
});

describe("knowledgeBaseLoader audience gate and redirects", () => {
  let rootDir: string;
  let entitiesDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), "kb-audience-"));
    entitiesDir = path.join(rootDir, "entities");
    await mkdir(entitiesDir, { recursive: true });
    const entities = [
      buildEntity({ id: "ENT-ANI-901", name: "Sea Otter Pup", audience_rating: "kids" }),
      buildEntity({ id: "ENT-ANI-902", name: "Teen Rated Subject", audience_rating: "teen" }),
      buildEntity({ id: "ENT-ANI-903", name: "Mature Rated Subject", audience_rating: "mature" }),
    ];
    await writeFile(path.join(entitiesDir, "nature_animals.json"), JSON.stringify(entities, null, 2), "utf8");
    await writeFile(
      path.join(rootDir, "entity_redirects.json"),
      JSON.stringify({ "ENT-POP-999": "ENT-ANI-901", "ENT-POP-998": "ENT-ANI-903" }, null, 2),
      "utf8",
    );
    clearKnowledgeBaseCache();
  });

  afterEach(async () => {
    clearKnowledgeBaseCache();
    await rm(rootDir, { recursive: true, force: true });
  });

  it("loads only kids-rated entities", () => {
    const ids = loadAllKnowledgeEntities({ baseDir: entitiesDir }).map((entity) => entity.id);
    expect(ids).toEqual(["ENT-ANI-901"]);
    expect(getEntitiesByDomain("nature_animals", { baseDir: entitiesDir })).toHaveLength(1);
    expect(getEntityById("ENT-ANI-902", { baseDir: entitiesDir })).toBeUndefined();
  });

  it("resolves retired duplicate ids to their canonical entity", () => {
    expect(getEntityById("ENT-POP-999", { baseDir: entitiesDir })?.name).toBe("Sea Otter Pup");
    expect(resolveCanonicalEntityId("ENT-POP-999", { baseDir: entitiesDir })).toBe("ENT-ANI-901");
    expect(resolveCanonicalEntityId("ENT-ANI-901", { baseDir: entitiesDir })).toBe("ENT-ANI-901");
  });

  it("flags curated teen and mature subjects as restricted, following redirects", () => {
    const options = { baseDir: entitiesDir };
    expect(isEntityRestrictedForChannel("ENT-ANI-902", options)).toBe(true);
    expect(isEntityRestrictedForChannel("ENT-POP-998", options)).toBe(true);
    expect(isEntityRestrictedForChannel("ENT-ANI-901", options)).toBe(false);
    expect(isEntityRestrictedForChannel("ENT-UNKNOWN-001", options)).toBe(false);
    expect(isEntityRestrictedForChannel(null, options)).toBe(false);
  });
});
