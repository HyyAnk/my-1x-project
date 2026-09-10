import type { Episode } from "@studio/shared";
import { loadAllKnowledgeEntities, type KnowledgeEntity } from "../quiz/bank/knowledgeBaseLoader.js";
import { KNOWN_TRADEMARK_IP_DEFS, type TrademarkIpDef } from "../quiz/bank/audit/entityCopyrightRules.js";
import { validateTextCopyright } from "../quiz/qa/copyrightValidator.js";

export interface TopicCopyrightResolution {
  hasHighRiskReference: boolean;
  matchedEntityName?: string;
  safeVisualProxy?: string;
  forbiddenKeywords?: string[];
  mitigationPrompt?: string;
}

export const GENERAL_COPYRIGHT_CONSTRAINTS = [
  "STRICT COPYRIGHT & TRADEMARK POLICY:",
  "- Prohibit trademarked entertainment characters, franchises, or Game IPs (e.g. Marvel, DC, Pokemon, Nintendo, Pac-Man, Disney, Mario, Sonic, Minecraft, Roblox).",
  "- Prohibit 'lion cub' or 'Simba' (strictly blocked by AI image generation filters).",
  "- Never name or depict protected trademark characters in questions, choices, explanations, fun facts, or visual opportunities.",
  "- Use purely generic educational concepts, real animals, or public-domain subjects.",
  "- In 'visual_opportunity', describe purely visual generic subjects and environments without trademarked names.",
].join("\n");

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractTopicSearchText(episode: Episode | null): string {
  if (!episode) return "";
  const topic = episode.topic as Record<string, unknown> | undefined;
  const parts = [topic?.title, topic?.premise, topic?.core_premise, topic?.theme_hint, topic?.subtopic_id, episode.slug];
  return parts.filter((part): part is string => typeof part === "string" && part.trim().length > 0).join(" ");
}

function findMatchingKnownTrademarkDef(text: string): TrademarkIpDef | null {
  for (const def of KNOWN_TRADEMARK_IP_DEFS) {
    if (def.namePattern.test(text)) {
      return def;
    }
    for (const kw of def.forbiddenKeywords) {
      if (kw.length >= 3) {
        const regex = new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escapeRegExp(kw)}(?:$|[^\\p{L}\\p{N}_])`, "iu");
        if (regex.test(text)) {
          return def;
        }
      }
    }
  }
  return null;
}

function findMatchingKnowledgeEntity(text: string): KnowledgeEntity | null {
  try {
    const entities = loadAllKnowledgeEntities();
    for (const entity of entities) {
      if (entity.copyright_risk !== "high" && !entity.safe_visual_proxy) continue;

      const nameRegex = new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escapeRegExp(entity.name)}(?:$|[^\\p{L}\\p{N}_])`, "iu");
      if (nameRegex.test(text)) return entity;

      if (entity.aliases) {
        for (const alias of entity.aliases) {
          if (alias.length >= 3) {
            const aliasRegex = new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escapeRegExp(alias)}(?:$|[^\\p{L}\\p{N}_])`, "iu");
            if (aliasRegex.test(text)) return entity;
          }
        }
      }
    }
  } catch {
    // Graceful fallback if KB directory is unavailable
  }
  return null;
}

function buildMitigationPrompt(name: string, safeVisualProxy?: string, forbiddenKeywords?: string[]): string {
  const lines = [
    `MANDATORY TOPIC COPYRIGHT MITIGATION FOR "${name.toUpperCase()}":`,
    `- High copyright risk detected for topic entity "${name}".`,
    `- STRICT PROHIBITION: Do NOT use protected trademark character names ("${name}"${forbiddenKeywords?.length ? `, ${forbiddenKeywords.slice(0, 4).join(", ")}` : ""}) in question text, choices, explanations, fun facts, or visual opportunities.`,
  ];
  if (safeVisualProxy) {
    lines.push(
      `- SAFE VISUAL PROXY: For 'visual_opportunity', you MUST describe the subject using this safe visual proxy instead of character names:`,
      `  "${safeVisualProxy}"`,
    );
  }
  lines.push(
    `- FOCUS: Focus on generic gameplay mechanics, historical arcade context, or educational themes without infringing trademarks.`,
  );
  return lines.join("\n");
}

export function resolveTopicCopyrightGuidance(episode: Episode | null): TopicCopyrightResolution {
  const searchText = extractTopicSearchText(episode);
  if (!searchText) {
    return { hasHighRiskReference: false };
  }

  const knownDef = findMatchingKnownTrademarkDef(searchText);
  if (knownDef) {
    const name = knownDef.forbiddenKeywords[0] || "Trademark IP";
    return {
      hasHighRiskReference: true,
      matchedEntityName: name,
      safeVisualProxy: knownDef.safeVisualProxy,
      forbiddenKeywords: knownDef.forbiddenKeywords,
      mitigationPrompt: buildMitigationPrompt(name, knownDef.safeVisualProxy, knownDef.forbiddenKeywords),
    };
  }

  const kbEntity = findMatchingKnowledgeEntity(searchText);
  if (kbEntity) {
    return {
      hasHighRiskReference: true,
      matchedEntityName: kbEntity.name,
      safeVisualProxy: kbEntity.safe_visual_proxy,
      forbiddenKeywords: kbEntity.forbidden_visual_keywords,
      mitigationPrompt: buildMitigationPrompt(kbEntity.name, kbEntity.safe_visual_proxy, kbEntity.forbidden_visual_keywords),
    };
  }

  const copyrightCheck = validateTextCopyright(searchText);
  if (copyrightCheck.violated && copyrightCheck.term) {
    return {
      hasHighRiskReference: true,
      matchedEntityName: copyrightCheck.term,
      mitigationPrompt: buildMitigationPrompt(copyrightCheck.term),
    };
  }

  return { hasHighRiskReference: false };
}
