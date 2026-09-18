import type { BankQuestion, TopicCandidate } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import {
  assembleRetentionArc,
  calculateRelevanceScore,
  calculateVisualScore,
  isValidBankQuestion,
  resolveTargetArchetype,
  type ScoredBankQuestion,
} from "./curation/index.js";

export interface CurateQuestionsForTopicDeps {
  repository: RepositoryService;
  channelId: string;
  topic: TopicCandidate;
  questionCount?: number;
  targetLanguage?: string;
  forceIncludeCooldown?: boolean;
}

export interface CuratedTopicQuestionsResult {
  selectedQuestions: BankQuestion[];
  missingCount: number;
  totalCandidatesFound: number;
  cooldownFilteredCount: number;
  retentionArcApplied: boolean;
}

export async function curateQuestionsForTopic(deps: CurateQuestionsForTopicDeps): Promise<CuratedTopicQuestionsResult> {
  const targetCount = deps.questionCount ?? 3;
  const targetArchetype = resolveTargetArchetype(deps.topic);

  const queryParams = {
    channelId: deps.channelId,
    archetypeId: targetArchetype,
    domainId: deps.topic.domain_id?.trim() || undefined,
    hasTranslationFor: deps.targetLanguage?.trim() || undefined,
    limit: 1000,
  };

  const queryResult = await deps.repository.queryQuestionBankQuestions(queryParams);
  const totalCandidatesFound = queryResult.questions.length;

  let cooldownFilteredCount = 0;
  let candidates = queryResult.questions;

  if (!deps.forceIncludeCooldown) {
    const nonCooldown = candidates.filter((q) => !q.channel_cooldown?.is_cooldown);
    cooldownFilteredCount = candidates.length - nonCooldown.length;
    candidates = nonCooldown;
  }

  const validCandidates = candidates.filter(isValidBankQuestion);

  const scored: ScoredBankQuestion[] = validCandidates.map((q) => {
    const relevanceScore = calculateRelevanceScore(q, deps.topic);
    const visualScore = calculateVisualScore(q);
    return {
      question: q,
      relevanceScore,
      visualScore,
      totalScore: relevanceScore + visualScore,
    };
  });

  scored.sort((a, b) => b.totalScore - a.totalScore);

  const { selected, retentionArcApplied } = assembleRetentionArc(scored, targetCount);
  const missingCount = Math.max(0, targetCount - selected.length);

  return {
    selectedQuestions: selected,
    missingCount,
    totalCandidatesFound,
    cooldownFilteredCount,
    retentionArcApplied,
  };
}

export * from "./curation/index.js";
export {
  ensureTopicQuestionsWithJitFallback,
  determineMissingDifficulties,
  generateJitQuestionsWithLLM,
  type EnsureTopicQuestionsWithJitDeps,
  type EnsureTopicQuestionsResult,
} from "./questionJitSeeder.js";
