import { describe, expect, it } from "vitest";
import {
  loadAllKnowledgeEntities,
  getEntityById,
  clearKnowledgeBaseCache,
  type KnowledgeEntity,
} from "../src/quiz/bank/knowledgeBaseLoader.js";
import { classifyEntityCopyright, auditKnowledgeEntities, auditKnowledgeBase } from "../src/quiz/bank/entityCopyrightAudit.js";

function makeMockEntity(id: string, name: string, domain_id: string, subtopic_id: string, traits: string[] = []): KnowledgeEntity {
  return {
    id,
    name,
    domain_id,
    subtopic_id,
    language: "en",
    visual_anchor: name,
    core_traits: traits,
    facts_and_myths: [],
  };
}

describe("Knowledge Base Entity Copyright Classification & Audit Framework", () => {
  describe("Entity Schema & Loader Copyright Metadata", () => {
    it("loads and preserves copyright metadata on Pac-Man in sports_games (ENT-SPO-072)", () => {
      clearKnowledgeBaseCache();
      const entity = getEntityById("ENT-SPO-072");
      expect(entity).toBeDefined();
      expect(entity?.name).toBe("Pac-Man");
      expect(entity?.copyright_risk).toBe("high");
      expect(entity?.is_trademark_ip).toBe(true);
      expect(entity?.forbidden_visual_keywords).toContain("Pac-Man");
      expect(entity?.forbidden_visual_keywords).toContain("Namco");
      expect(entity?.safe_visual_proxy).toBeDefined();
      expect(entity?.safe_visual_proxy).toContain("retro yellow circular character");
    });

    it("loads and preserves copyright metadata on Pac-Man in pop_culture_classics (ENT-POP-276)", () => {
      clearKnowledgeBaseCache();
      const entity = getEntityById("ENT-POP-276");
      expect(entity).toBeDefined();
      expect(entity?.name).toBe("Pac-Man");
      expect(entity?.copyright_risk).toBe("high");
      expect(entity?.is_trademark_ip).toBe(true);
      expect(entity?.forbidden_visual_keywords).toContain("Pac-Man");
      expect(entity?.safe_visual_proxy).toBeDefined();
      expect(entity?.safe_visual_proxy).toContain("retro yellow circular character");
    });

    it("loads and preserves copyright metadata on Super Mario, Pikachu, and Mickey Mouse", () => {
      clearKnowledgeBaseCache();
      const mario = getEntityById("ENT-POP-270");
      expect(mario?.copyright_risk).toBe("high");
      expect(mario?.is_trademark_ip).toBe(true);
      expect(mario?.forbidden_visual_keywords).toContain("Mario");

      const pikachu = getEntityById("ENT-POP-183");
      expect(pikachu?.copyright_risk).toBe("high");
      expect(pikachu?.is_trademark_ip).toBe(true);
      expect(pikachu?.forbidden_visual_keywords).toContain("Pikachu");

      const mickey = getEntityById("ENT-POP-003");
      expect(mickey?.copyright_risk).toBe("high");
      expect(mickey?.is_trademark_ip).toBe(true);
      expect(mickey?.forbidden_visual_keywords).toContain("Mickey Mouse");
    });
  });

  describe("Entity Copyright Classifier Logic", () => {
    it("flags trademark video game characters as high risk", () => {
      const mock = makeMockEntity("MOCK-001", "Sonic the Hedgehog", "pop_culture_classics", "gaming_icons", ["Sega mascot"]);
      const result = classifyEntityCopyright(mock);
      expect(result.copyrightRisk).toBe("high");
      expect(result.isTrademarkIp).toBe(true);
      expect(result.forbiddenVisualKeywords).toContain("Sonic the Hedgehog");
      expect(result.forbiddenVisualKeywords).toContain("Sega");
      expect(result.safeVisualProxy).toBeDefined();
    });

    it("flags Disney core characters and Lion King characters as high risk", () => {
      const simba = makeMockEntity("MOCK-002", "Simba", "pop_culture_classics", "animation_icons", ["Lion King protagonist"]);
      const result = classifyEntityCopyright(simba);
      expect(result.copyrightRisk).toBe("high");
      expect(result.isTrademarkIp).toBe(true);
      expect(result.forbiddenVisualKeywords).toContain("Simba");
      expect(result.forbiddenVisualKeywords).toContain("The Lion King");
    });

    it("correctly disambiguates biological mammal Wolverine from Marvel superhero", () => {
      const animal = makeMockEntity("ENT-ANI-071", "Wolverine", "nature_animals", "mammals", ["Mustelidae"]);
      const result = classifyEntityCopyright(animal);
      expect(result.copyrightRisk).toBe("none");
      expect(result.isTrademarkIp).toBe(false);
      expect(result.forbiddenVisualKeywords).toContain("Marvel");
      expect(result.forbiddenVisualKeywords).toContain("Logan");
      expect(result.safeVisualProxy).toContain("Gulo gulo");
    });

    it("correctly disambiguates biological Tasmanian Devil from Looney Tunes character", () => {
      const animal = makeMockEntity("ENT-ANI-110", "Tasmanian Devil", "nature_animals", "mammals", ["Sarcophilus harrisii"]);
      const result = classifyEntityCopyright(animal);
      expect(result.copyrightRisk).toBe("none");
      expect(result.isTrademarkIp).toBe(false);
      expect(result.forbiddenVisualKeywords).toContain("Looney Tunes");
      expect(result.safeVisualProxy).toContain("Sarcophilus harrisii");
    });

    it("correctly disambiguates Norse mythological deity Thor from Marvel superhero", () => {
      const thorGod = makeMockEntity("ENT-MYT-005", "Thor", "mythology_creatures", "norse", ["Aesir deity"]);
      const result = classifyEntityCopyright(thorGod);
      expect(result.copyrightRisk).toBe("medium");
      expect(result.isTrademarkIp).toBe(false);
      expect(result.forbiddenVisualKeywords).toContain("Marvel");
      expect(result.safeVisualProxy).toContain("Norse mythological thunder deity");
    });

    it("classifies clean generic entities as none risk", () => {
      const clean = makeMockEntity("MOCK-003", "African Elephant", "nature_animals", "mammals", ["Terrestrial animal"]);
      const result = classifyEntityCopyright(clean);
      expect(result.copyrightRisk).toBe("none");
      expect(result.isTrademarkIp).toBe(false);
      expect(result.forbiddenVisualKeywords).toHaveLength(0);
    });
  });

  describe("Complete Knowledge Base Audit Integrity", () => {
    it("scans all 2,500 entities with zero unclassified high risk entities", () => {
      clearKnowledgeBaseCache();
      const report = auditKnowledgeBase();
      expect(report.totalScanned).toBe(2500);
      expect(report.highRiskCount).toBeGreaterThanOrEqual(90);
      expect(report.unclassifiedHighRiskCount).toBe(0);
      expect(report.trademarkIpCount).toBeGreaterThanOrEqual(90);

      const pacManSports = report.flaggedEntities.find((e) => e.id === "ENT-SPO-072");
      expect(pacManSports).toBeDefined();
      expect(pacManSports?.copyrightRisk).toBe("high");
      expect(pacManSports?.isTrademarkIp).toBe(true);

      const pacManPop = report.flaggedEntities.find((e) => e.id === "ENT-POP-276");
      expect(pacManPop).toBeDefined();
      expect(pacManPop?.copyrightRisk).toBe("high");
      expect(pacManPop?.isTrademarkIp).toBe(true);
    });

    it("ensures every flagged high-risk entity has non-empty forbidden keywords and safe proxy", () => {
      const entities = loadAllKnowledgeEntities();
      const report = auditKnowledgeEntities(entities);
      const highRisk = report.flaggedEntities.filter((e) => e.copyrightRisk === "high");

      for (const item of highRisk) {
        expect(item.forbiddenVisualKeywords.length).toBeGreaterThan(0);
        expect(item.safeVisualProxy).toBeDefined();
        expect(item.safeVisualProxy?.trim().length).toBeGreaterThan(10);
      }
    });
  });
});
