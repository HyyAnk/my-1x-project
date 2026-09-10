export type CopyrightRiskLevel = "high" | "medium" | "none";

export interface KnowledgeFactOrMyth {
  claim: string;
  verdict: "fact" | "myth" | "true" | "false";
  explanation: string;
  fun_fact?: string;
}

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
  copyright_risk?: CopyrightRiskLevel;
  is_trademark_ip?: boolean;
  forbidden_visual_keywords?: string[];
  safe_visual_proxy?: string;
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
