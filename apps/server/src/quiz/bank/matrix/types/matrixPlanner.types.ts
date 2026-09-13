import type { BankGameplayArchetypeId, MatrixComboCandidate } from "@studio/shared";
import type { KnowledgeEntity } from "../../knowledgeBaseLoader.js";
import type { MatrixCoverageServiceOptions } from "../matrixCoverageCalculator.js";
import type { IMatrixCoverageCache } from "../matrixCoverageCache.types.js";

export interface SelectAutoCandidatesOptions extends MatrixCoverageServiceOptions {
  count: number;
  domain_id?: string;
  archetype_ids?: BankGameplayArchetypeId[];
  coverageMap?: ReadonlyMap<string, number>;
  excludeEntityIds?: Set<string> | readonly string[];
}

export interface SelectManualCandidatesOptions extends MatrixCoverageServiceOptions {
  count: number;
  domain_id?: string;
  subtopic_id?: string;
  archetype_ids?: BankGameplayArchetypeId[];
  difficulty?: number;
  coverageMap?: ReadonlyMap<string, number>;
  excludeEntityIds?: Set<string> | readonly string[];
}

export interface PlannedBatchChunk {
  chunkIndex: number;
  totalChunks: number;
  chunkSize: number;
  domainId: string;
  archetypeId: BankGameplayArchetypeId;
  subtopicId?: string;
  candidates: MatrixComboCandidate[];
}

export interface PlanBatchChunksOptions extends MatrixCoverageServiceOptions {
  mode?: "auto" | "manual";
  targetCount: number;
  chunkSize?: number;
  domainId?: string;
  subtopicId?: string;
  subtopicTitle?: string;
  archetypeId?: BankGameplayArchetypeId;
  difficulty?: number;
}

export interface DynamicDeficitChunkOptions extends MatrixCoverageServiceOptions {
  mode?: "auto" | "manual";
  chunkIndex?: number;
  totalChunks?: number;
  chunkSize?: number;
  domainId?: string;
  subtopicId?: string;
  subtopicTitle?: string;
  archetypeId?: BankGameplayArchetypeId;
  difficulty?: number;
  coverageMap?: ReadonlyMap<string, number>;
  coverageCache?: IMatrixCoverageCache;
  excludeEntityIds?: Set<string> | readonly string[];
}

export interface DomainArchEvaluation {
  domainId: string;
  archetypeId: BankGameplayArchetypeId;
  unfilledEntities: KnowledgeEntity[];
  populatedEntities: Array<{ entity: KnowledgeEntity; variants: number }>;
  pairVariants: number;
  domainTotalVariants: number;
  archTotalVariants: number;
  domainIndex: number;
  archIndex: number;
  allDomainEntities: KnowledgeEntity[];
}
