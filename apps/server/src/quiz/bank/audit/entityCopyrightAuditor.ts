import fs from "node:fs";
import path from "node:path";
import type { CopyrightRiskLevel, KnowledgeEntity } from "../knowledgeBase.types.js";
import { resolveKnowledgeBaseEntitiesDir, loadAllKnowledgeEntities } from "../knowledgeBaseLoader.js";
import { classifyEntityCopyright } from "./entityCopyrightClassifier.js";

export interface KnowledgeBaseAuditFlaggedItem {
  id: string;
  name: string;
  domainId: string;
  subtopicId: string;
  copyrightRisk: CopyrightRiskLevel;
  isTrademarkIp: boolean;
  forbiddenVisualKeywords: string[];
  safeVisualProxy?: string;
  reasons: string[];
}

export interface KnowledgeBaseAuditReport {
  totalScanned: number;
  highRiskCount: number;
  mediumRiskCount: number;
  noneRiskCount: number;
  trademarkIpCount: number;
  unclassifiedHighRiskCount: number;
  flaggedEntities: KnowledgeBaseAuditFlaggedItem[];
}

export function auditKnowledgeEntities(entities: KnowledgeEntity[]): KnowledgeBaseAuditReport {
  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let noneRiskCount = 0;
  let trademarkIpCount = 0;
  let unclassifiedHighRiskCount = 0;
  const flaggedEntities: KnowledgeBaseAuditFlaggedItem[] = [];

  for (const entity of entities) {
    const classification = classifyEntityCopyright(entity);
    if (classification.copyrightRisk === "high") highRiskCount++;
    else if (classification.copyrightRisk === "medium") mediumRiskCount++;
    else noneRiskCount++;

    if (classification.isTrademarkIp) trademarkIpCount++;

    const isUnclassifiedHigh = classification.copyrightRisk === "high" && (!entity.copyright_risk || !entity.is_trademark_ip);
    if (isUnclassifiedHigh) unclassifiedHighRiskCount++;

    if (classification.copyrightRisk !== "none" || classification.isTrademarkIp) {
      flaggedEntities.push({
        id: entity.id,
        name: entity.name,
        domainId: entity.domain_id,
        subtopicId: entity.subtopic_id,
        copyrightRisk: classification.copyrightRisk,
        isTrademarkIp: classification.isTrademarkIp,
        forbiddenVisualKeywords: classification.forbiddenVisualKeywords,
        safeVisualProxy: classification.safeVisualProxy,
        reasons: classification.reasons,
      });
    }
  }

  return {
    totalScanned: entities.length,
    highRiskCount,
    mediumRiskCount,
    noneRiskCount,
    trademarkIpCount,
    unclassifiedHighRiskCount,
    flaggedEntities,
  };
}

export function auditKnowledgeBase(customDir?: string): KnowledgeBaseAuditReport {
  const targetDir = resolveKnowledgeBaseEntitiesDir(customDir);
  const entities = loadAllKnowledgeEntities({ baseDir: targetDir, forceReload: true });
  return auditKnowledgeEntities(entities);
}

export function sanitizeKnowledgeEntity(entity: KnowledgeEntity): KnowledgeEntity {
  const classification = classifyEntityCopyright(entity);
  const isPlainSafe =
    classification.copyrightRisk === "none" &&
    !classification.isTrademarkIp &&
    !classification.safeVisualProxy &&
    classification.forbiddenVisualKeywords.length === 0;

  if (isPlainSafe) {
    return entity;
  }

  const updated: KnowledgeEntity = {
    ...entity,
    copyright_risk: classification.copyrightRisk,
    is_trademark_ip: classification.isTrademarkIp,
  };

  if (classification.forbiddenVisualKeywords.length > 0) {
    updated.forbidden_visual_keywords = classification.forbiddenVisualKeywords;
  }
  if (classification.safeVisualProxy) {
    updated.safe_visual_proxy = classification.safeVisualProxy;
  }

  return updated;
}

export function sanitizeKnowledgeBaseEntitiesDir(targetDir: string): { processedFiles: number; modifiedEntities: number } {
  if (!fs.existsSync(targetDir)) return { processedFiles: 0, modifiedEntities: 0 };
  const filenames = fs
    .readdirSync(targetDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  let modifiedEntities = 0;

  for (const file of filenames) {
    const filePath = path.join(targetDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8")) as KnowledgeEntity[];
    let fileModified = false;

    const sanitizedList = content.map((entity) => {
      const sanitized = sanitizeKnowledgeEntity(entity);
      if (
        sanitized.copyright_risk !== entity.copyright_risk ||
        sanitized.is_trademark_ip !== entity.is_trademark_ip ||
        sanitized.safe_visual_proxy !== entity.safe_visual_proxy ||
        JSON.stringify(sanitized.forbidden_visual_keywords) !== JSON.stringify(entity.forbidden_visual_keywords)
      ) {
        fileModified = true;
        modifiedEntities++;
      }
      return sanitized;
    });

    if (fileModified) {
      fs.writeFileSync(filePath, JSON.stringify(sanitizedList, null, 2) + "\n", "utf-8");
    }
  }

  return { processedFiles: filenames.length, modifiedEntities };
}
