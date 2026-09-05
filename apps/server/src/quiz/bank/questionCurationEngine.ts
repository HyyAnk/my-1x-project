import type {
  BankGameplayArchetypeId,
  BankQuestion,
  BankQuestionWithCooldown,
  TopicCandidate,
  TopicGameplayArchetype,
} from "@studio/shared";
import type { RepositoryService } from "../../repository.js";

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

export interface ScoredBankQuestion {
  question: BankQuestionWithCooldown;
  relevanceScore: number;
  visualScore: number;
  totalScore: number;
}

const STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "or", "is", "are", "was",
  "were", "be", "been", "with", "this", "that", "from", "by", "about", "what", "which",
  "who", "how", "when", "where", "why", "can", "could", "will", "would",
]);

export function resolveTargetArchetype(topic: TopicCandidate): BankGameplayArchetypeId | undefined {
  if (topic.archetype) {
    return topic.archetype as BankGameplayArchetypeId;
  }
  if (topic.suggested_layout) {
    switch (topic.suggested_layout) {
      case "media_left_choices_right":
        return "deep_trivia";
      case "visual_choices_three_pure":
        return "visual_spotting";
      case "verdict_true_false":
        return "verdict_true_false";
      case "split_versus_two":
        return "versus_faceoff";
      case "visual_choices_three":
        return "visual_identification";
      case "full_stack_list":
        return "speed_blitz";
      case "mystery_reveal":
        return "mystery_reveal";
      case "clue_deduction":
        return "clue_deduction";
    }
  }
  if (topic.quiz_format === "true_false") {
    return "verdict_true_false";
  }
  if (topic.quiz_format === "odd_one_out") {
    return "visual_spotting";
  }
  return undefined;
}

export function tokenizeText(text?: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

export function calculateVisualScore(question: BankQuestionWithCooldown): number {
  if (!question.visual_spec) return 0;
  let score = 0;
  const prompt = question.visual_spec.prompt?.trim();
  if (prompt && prompt.length > 0) {
    score += 5;
    if (prompt.length >= 20) {
      score += 5;
    }
  }
  if (question.visual_spec.intent === "question_illustration" || question.visual_spec.intent === "choice_illustration") {
    score += 2;
  }
  return score;
}

export function calculateRelevanceScore(question: BankQuestionWithCooldown, topic: TopicCandidate): number {
  const topicTokens = new Set([
    ...tokenizeText(topic.title),
    ...tokenizeText(topic.premise),
    ...tokenizeText(topic.hook),
    ...tokenizeText(topic.theme_hint),
  ]);

  if (topicTokens.size === 0) return 0;

  let score = 0;

  const questionTokens = tokenizeText(question.question);
  for (const token of questionTokens) {
    if (topicTokens.has(token)) score += 2;
  }

  for (const tag of question.tags ?? []) {
    const tagTokens = tokenizeText(tag);
    for (const token of tagTokens) {
      if (topicTokens.has(token)) score += 3;
    }
  }

  if (question.subtopic_id) {
    const subtopicTokens = tokenizeText(question.subtopic_id.replace(/_/g, " "));
    for (const token of subtopicTokens) {
      if (topicTokens.has(token)) score += 2;
    }
  }

  const detailTokens = [...tokenizeText(question.explanation), ...tokenizeText(question.fun_fact)];
  for (const token of detailTokens) {
    if (topicTokens.has(token)) score += 1;
  }

  return score;
}

export function isValidBankQuestion(question: BankQuestionWithCooldown): boolean {
  const status = (question.status as string) ?? "approved";
  if (status === "archived" || status === "rejected") {
    return false;
  }
  if (status === "approved") {
    return true;
  }
  const semanticStatus = (question as { validation?: { semantic_status?: string } }).validation?.semantic_status;
  if (semanticStatus === "validated") {
    return true;
  }
  return status !== "rejected";
}

function assembleThreeActArc(scored: ScoredBankQuestion[]): BankQuestionWithCooldown[] {
  const remaining = [...scored];

  // Slot 1 (The Hook): Difficulty 1 or 2, high visual score
  const slot1Candidates = remaining.filter((s) => s.question.difficulty <= 2);
  const slot1Pool = slot1Candidates.length > 0 ? slot1Candidates : remaining;
  slot1Pool.sort((a, b) => b.visualScore - a.visualScore || b.totalScore - a.totalScore);
  const slot1 = slot1Pool[0];
  remaining.splice(remaining.indexOf(slot1), 1);

  // Slot 3 (The Climax / Twist): Difficulty 3-5 or fun_fact presence
  const slot3Candidates = remaining.filter(
    (s) => s.question.difficulty >= 3 || Boolean(s.question.fun_fact && s.question.fun_fact.trim().length > 0),
  );
  const slot3Pool = slot3Candidates.length > 0 ? slot3Candidates : remaining;
  slot3Pool.sort((a, b) => b.question.difficulty - a.question.difficulty || b.totalScore - a.totalScore);
  const slot3 = slot3Pool[0];
  remaining.splice(remaining.indexOf(slot3), 1);

  // Slot 2 (The Challenge): Difficulty 2 or 3, or best remaining by score
  const slot2Candidates = remaining.filter((s) => s.question.difficulty === 2 || s.question.difficulty === 3);
  const slot2Pool = slot2Candidates.length > 0 ? slot2Candidates : remaining;
  slot2Pool.sort((a, b) => b.totalScore - a.totalScore);
  const slot2 = slot2Pool[0];

  return [slot1.question, slot2.question, slot3.question];
}

function assembleGenericArc(scored: ScoredBankQuestion[], targetCount: number): BankQuestionWithCooldown[] {
  const topQuestions = scored.slice(0, targetCount);
  topQuestions.sort((a, b) => a.question.difficulty - b.question.difficulty || b.visualScore - a.visualScore);
  return topQuestions.map((s) => s.question);
}

function assemblePartialArc(scored: ScoredBankQuestion[]): BankQuestionWithCooldown[] {
  const sorted = [...scored];
  sorted.sort((a, b) => a.question.difficulty - b.question.difficulty || b.visualScore - a.visualScore);
  return sorted.map((s) => s.question);
}

export function assembleRetentionArc(
  scored: ScoredBankQuestion[],
  targetCount: number,
): { selected: BankQuestionWithCooldown[]; retentionArcApplied: boolean } {
  if (scored.length < targetCount) {
    return {
      selected: assemblePartialArc(scored),
      retentionArcApplied: false,
    };
  }

  if (targetCount === 3) {
    return {
      selected: assembleThreeActArc(scored),
      retentionArcApplied: true,
    };
  }

  return {
    selected: assembleGenericArc(scored, targetCount),
    retentionArcApplied: true,
  };
}

export async function curateQuestionsForTopic(
  deps: CurateQuestionsForTopicDeps,
): Promise<CuratedTopicQuestionsResult> {
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

export {
  ensureTopicQuestionsWithJitFallback,
  determineMissingDifficulties,
  generateJitQuestionsFallback,
  generateJitQuestionsWithLLM,
  type EnsureTopicQuestionsWithJitDeps,
  type EnsureTopicQuestionsResult,
} from "./questionJitSeeder.js";
