import type { BankGameplayArchetypeId } from "@studio/shared";
import type { KnowledgeFactOrMyth } from "../../knowledgeBase.types.js";

export interface TargetEntityForGeneration {
  entity_id: string;
  name: string;
  domain_id: string;
  subtopic_id: string;
  visual_anchor: string;
  core_traits: string[];
  distractor_pool?: string[];
  facts_and_myths: KnowledgeFactOrMyth[];
  versus_candidates?: string[];
}

export interface BuildBatchPromptOptions {
  archetypeId: BankGameplayArchetypeId;
  domainId: string;
  subtopicId: string;
  subtopicTitle?: string;
  count: number;
  language?: string;
  difficulty?: number;
  ageBand?: "kids" | "family" | "teen" | "mature";
  existingQuestionSamples?: string[];
}

export interface BuildReverseBatchPromptOptions {
  archetypeId: BankGameplayArchetypeId;
  targets: TargetEntityForGeneration[];
  language?: string;
  difficulty?: number;
  ageBand?: "kids" | "family" | "teen" | "mature";
  existingQuestionSamples?: string[];
}

export interface ArchetypePromptStrategy {
  readonly archetypeId: BankGameplayArchetypeId | BankGameplayArchetypeId[];
  buildBatchPrompt(options: BuildBatchPromptOptions): string;
  buildReversePrompt(options: BuildReverseBatchPromptOptions): string;
}
