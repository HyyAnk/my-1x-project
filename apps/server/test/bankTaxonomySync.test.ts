import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  CANONICAL_DOMAIN_META,
  formatTitleFromId,
  syncTaxonomyFromKnowledgeBase,
  readQuestionBankTaxonomy,
} from "../src/repository/quiz/bank/bankTaxonomySync.js";
import { RepositoryService } from "../src/repository/service.js";

describe("Bank Taxonomy Synchronization & Integrity", () => {
  let tempStorage: string;
  let isolatedRoot: string;
  let repo: RepositoryService;

  beforeAll(async () => {
    let curr = process.cwd();
    while (curr !== path.dirname(curr)) {
      if (existsSync(path.join(curr, "pnpm-workspace.yaml"))) break;
      curr = path.dirname(curr);
    }

    tempStorage = await mkdtemp(path.join(os.tmpdir(), "bank-taxonomy-storage-"));
    isolatedRoot = await mkdtemp(path.join(os.tmpdir(), "bank-taxonomy-root-"));

    await mkdir(path.join(isolatedRoot, ".quiz-studio"), { recursive: true });
    await writeFile(
      path.join(isolatedRoot, ".quiz-studio", "storage.local.json"),
      JSON.stringify({ storage_path: tempStorage }, null, 2),
      "utf8",
    );

    const srcKb = path.join(curr, ".quiz-studio", "knowledge_base");
    const destKb = path.join(isolatedRoot, ".quiz-studio", "knowledge_base");
    await cp(srcKb, destKb, { recursive: true, filter: (src) => !src.includes("entity_assets") }).catch(() => {});

    repo = new RepositoryService(isolatedRoot, tempStorage);
  });

  afterAll(async () => {
    if (tempStorage) {
      await rm(tempStorage, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {});
    }
    if (isolatedRoot) {
      await rm(isolatedRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {});
    }
  });

  describe("Helper Functions", () => {
    it("formatTitleFromId formats snake_case identifiers to title case", () => {
      expect(formatTitleFromId("anime_manga")).toBe("Anime Manga");
      expect(formatTitleFromId("iconic_franchises")).toBe("Iconic Franchises");
      expect(formatTitleFromId("ghibli_classics")).toBe("Ghibli Classics");
      expect(formatTitleFromId("shonen_legends")).toBe("Shonen Legends");
    });

    it("CANONICAL_DOMAIN_META contains canonical metadata for all 18 domains", () => {
      const expectedDomains = [
        "anime_manga",
        "careers_occupations",
        "countries_nations",
        "daily_objects",
        "food_gastronomy",
        "gaming_esports",
        "global_brands",
        "human_body",
        "modern_cinema_tv",
        "music_instruments_gear",
        "mythology_creatures",
        "nature_animals",
        "places_facilities",
        "pop_culture_classics",
        "school_learning",
        "space_earth",
        "sports_games",
        "vehicles_technology",
      ];

      for (const domId of expectedDomains) {
        const meta = CANONICAL_DOMAIN_META[domId];
        expect(meta, `Domain meta for ${domId} should exist`).toBeDefined();
        expect(meta.title.length).toBeGreaterThan(0);
        expect(meta.description.length).toBeGreaterThan(0);
        expect(meta.icon.length).toBeGreaterThan(0);
      }
    });
  });

  describe("syncTaxonomyFromKnowledgeBase", () => {
    it("discovers all 18 domains from knowledge base entities", async () => {
      const domains = await syncTaxonomyFromKnowledgeBase(repo);
      expect(domains.length).toBe(18);

      const domainIds = domains.map((d) => d.id).sort();
      expect(domainIds).toContain("anime_manga");
      expect(domainIds).toContain("nature_animals");
      expect(domainIds).toContain("gaming_esports");
    });

    it("correctly extracts anime_manga domain with its 5 canonical subtopics", async () => {
      const domains = await syncTaxonomyFromKnowledgeBase(repo);
      const anime = domains.find((d) => d.id === "anime_manga");
      expect(anime).toBeDefined();
      expect(anime?.title).toBe("Anime & Manga Universe");
      expect(anime?.icon).toBe("Tv");

      const subtopicIds = anime?.subtopics.map((s) => s.id).sort();
      expect(subtopicIds).toEqual([
        "detective_psychological",
        "ghibli_classics",
        "iconic_franchises",
        "modern_phenomena",
        "shonen_legends",
      ]);
    });
  });

  describe("readQuestionBankTaxonomy", () => {
    it("reads full taxonomy with 18 domains under read lock", async () => {
      const taxonomy = await readQuestionBankTaxonomy.call(repo);
      expect(taxonomy.schema_version).toBe(2);
      expect(taxonomy.domains.length).toBe(18);

      const anime = taxonomy.domains.find((d) => d.id === "anime_manga");
      expect(anime).toBeDefined();
      expect(anime?.subtopics.length).toBe(5);
    });
  });
});
