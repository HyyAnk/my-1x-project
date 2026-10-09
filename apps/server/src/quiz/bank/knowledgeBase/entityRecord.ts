import type { KnowledgeEntity } from "../knowledgeBase.types.js";

export function appendToIndex(index: Map<string, KnowledgeEntity[]>, key: string, entity: KnowledgeEntity): void {
  const list = index.get(key);
  if (list) list.push(entity);
  else index.set(key, [entity]);
}

export function isKnowledgeEntityRecord(
  value: unknown,
): value is Record<string, unknown> & { id: string; domain_id: string; subtopic_id: string } {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.domain_id === "string" && typeof record.subtopic_id === "string";
}

export function sanitizeLoadedEntity(record: Record<string, unknown>): KnowledgeEntity {
  const { copyright_risk: _cr, is_trademark_ip: _it, forbidden_visual_keywords: _fv, safe_visual_proxy: _sp, ...clean } = record;
  return clean as unknown as KnowledgeEntity;
}
