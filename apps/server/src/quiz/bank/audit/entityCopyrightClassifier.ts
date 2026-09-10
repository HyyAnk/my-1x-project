import type { CopyrightRiskLevel, KnowledgeEntity } from "../knowledgeBase.types.js";
import { STRICT_COPYRIGHT_PATTERNS } from "../../qa/copyrightValidator.js";
import { KNOWN_TRADEMARK_IP_DEFS, isDisambiguatedSafeEntity } from "./entityCopyrightRules.js";

export interface EntityClassificationResult {
  entityId: string;
  copyrightRisk: CopyrightRiskLevel;
  isTrademarkIp: boolean;
  forbiddenVisualKeywords: string[];
  safeVisualProxy?: string;
  matchedCategories: string[];
  reasons: string[];
}

export function classifyEntityCopyright(entity: KnowledgeEntity): EntityClassificationResult {
  const disambiguated = checkDisambiguatedEntities(entity);
  if (disambiguated) return disambiguated;

  const knownDef = findKnownTrademarkDef(entity);
  if (knownDef) {
    const keywords = Array.from(new Set([entity.name, ...(entity.aliases || []), ...knownDef.forbiddenKeywords]));
    return {
      entityId: entity.id,
      copyrightRisk: "high",
      isTrademarkIp: true,
      forbiddenVisualKeywords: keywords,
      safeVisualProxy: entity.safe_visual_proxy || knownDef.safeVisualProxy,
      matchedCategories: [knownDef.category],
      reasons: [`Recognized trademark entertainment IP: ${entity.name}`],
    };
  }

  const patternMatch = checkStrictCopyrightPatterns(entity);
  if (patternMatch) return patternMatch;

  return {
    entityId: entity.id,
    copyrightRisk: entity.copyright_risk || "none",
    isTrademarkIp: entity.is_trademark_ip || false,
    forbiddenVisualKeywords: entity.forbidden_visual_keywords || [],
    safeVisualProxy: entity.safe_visual_proxy,
    matchedCategories: [],
    reasons: [],
  };
}

function checkDisambiguatedEntities(entity: KnowledgeEntity): EntityClassificationResult | null {
  if (entity.domain_id === "nature_animals" && entity.name === "Wolverine") {
    return {
      entityId: entity.id,
      copyrightRisk: "none",
      isTrademarkIp: false,
      forbiddenVisualKeywords: ["Marvel", "X-Men", "superhero", "Logan"],
      safeVisualProxy: "Wild taiga mammal Gulo gulo with shaggy brown fur cresting a snowy ridge.",
      matchedCategories: [],
      reasons: ["Disambiguated biological mammal Gulo gulo"],
    };
  }

  if (entity.domain_id === "nature_animals" && entity.name === "Tasmanian Devil") {
    return {
      entityId: entity.id,
      copyrightRisk: "none",
      isTrademarkIp: false,
      forbiddenVisualKeywords: ["Looney Tunes", "Warner Bros", "Taz", "cartoon"],
      safeVisualProxy: "A stocky black carnivorous marsupial Sarcophilus harrisii with a white chest crescent on Australian forest ground.",
      matchedCategories: [],
      reasons: ["Disambiguated biological marsupial Sarcophilus harrisii"],
    };
  }

  if (entity.domain_id === "mythology_creatures" && entity.name === "Thor") {
    return {
      entityId: entity.id,
      copyrightRisk: "medium",
      isTrademarkIp: false,
      forbiddenVisualKeywords: ["Marvel", "Avengers", "blonde superhero"],
      safeVisualProxy:
        "Ancient Norse mythological thunder deity with wild red beard and iron gloves wielding stone hammer Mjolnir amid stormy clouds.",
      matchedCategories: ["MYTHOLOGY_HISTORICAL"],
      reasons: ["Norse mythological deity distinct from Marvel superhero"],
    };
  }

  if (entity.name === "Bagheera") {
    return {
      entityId: entity.id,
      copyrightRisk: "medium",
      isTrademarkIp: false,
      forbiddenVisualKeywords: ["Marvel", "Wakanda", "superhero"],
      safeVisualProxy: "A sleek black Indian leopard resting gracefully on a tropical jungle branch.",
      matchedCategories: ["LITERARY_CLASSIC"],
      reasons: ["Public domain Kipling character distinct from Marvel Black Panther"],
    };
  }

  if (isDisambiguatedSafeEntity(entity)) {
    return {
      entityId: entity.id,
      copyrightRisk: "none",
      isTrademarkIp: false,
      forbiddenVisualKeywords: [],
      matchedCategories: [],
      reasons: ["Disambiguated non-trademark context"],
    };
  }

  return null;
}

function findKnownTrademarkDef(entity: KnowledgeEntity) {
  const namesToCheck = [entity.name, ...(entity.aliases || [])];
  for (const def of KNOWN_TRADEMARK_IP_DEFS) {
    if (namesToCheck.some((n) => def.namePattern.test(n.trim()))) {
      return def;
    }
  }
  return null;
}

function checkStrictCopyrightPatterns(entity: KnowledgeEntity): EntityClassificationResult | null {
  const namesToCheck = [entity.name, ...(entity.aliases || [])];
  for (const def of STRICT_COPYRIGHT_PATTERNS) {
    for (const name of namesToCheck) {
      const match = name.match(def.pattern);
      if (match) {
        const matchedTerm = match[1] || match[0];
        const keywords = Array.from(new Set([entity.name, ...(entity.aliases || []), matchedTerm]));
        return {
          entityId: entity.id,
          copyrightRisk: "high",
          isTrademarkIp: true,
          forbiddenVisualKeywords: keywords,
          safeVisualProxy: entity.safe_visual_proxy,
          matchedCategories: [def.category || "STRICT_PATTERN"],
          reasons: [def.reason],
        };
      }
    }
  }
  return null;
}
