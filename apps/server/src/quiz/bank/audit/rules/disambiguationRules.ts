import type { KnowledgeEntity } from "../../knowledgeBase.types.js";

export function isDisambiguatedSafeEntity(entity: KnowledgeEntity): boolean {
  if (entity.domain_id === "nature_animals" && entity.name === "Wolverine") {
    return true;
  }
  if (entity.domain_id === "human_body" || entity.id === "ENT-BOD-149") {
    return true;
  }
  if (entity.domain_id === "space_earth") {
    return true;
  }
  if (entity.id === "ENT-SPO-048") {
    return true;
  }
  return false;
}
