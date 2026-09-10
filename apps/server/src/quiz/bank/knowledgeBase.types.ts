/**
 * Represents a verified factual claim or myth debunking in the knowledge base.
 */
export interface KnowledgeFactOrMyth {
  claim: string;
  verdict: "fact" | "myth" | "true" | "false";
  explanation: string;
  fun_fact?: string;
}

/**
 * Clean domain knowledge entity representing real-world subjects, pop-culture icons,
 * animals, places, or concepts with authentic identity and factual visual anchors.
 *
 * NOTE: Legacy enforcement-only metadata (copyright_risk, is_trademark_ip,
 * forbidden_visual_keywords, safe_visual_proxy) has been permanently retired.
 */
export interface KnowledgeEntity {
  id: string;
  domain_id: string;
  subtopic_id: string;
  name: string;
  language: "en";
  aliases?: string[];
  difficulty?: number;
  visual_anchor: string;
  core_traits: string[];
  distractor_pool?: string[];
  facts_and_myths: KnowledgeFactOrMyth[];
  versus_candidates?: string[];
}

export interface KnowledgeBaseStats {
  totalEntities: number;
  domainCounts: Record<string, number>;
  subtopicCounts: Record<string, number>;
}

export interface KnowledgeBaseLoaderOptions {
  baseDir?: string;
  forceReload?: boolean;
}

