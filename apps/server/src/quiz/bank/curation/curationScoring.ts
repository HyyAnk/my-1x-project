import type { BankQuestionWithCooldown, TopicCandidate } from "@studio/shared";

export interface ScoredBankQuestion {
  question: BankQuestionWithCooldown;
  relevanceScore: number;
  visualScore: number;
  totalScore: number;
}

export const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "are",
  "was",
  "were",
  "what",
  "which",
  "who",
  "where",
  "when",
  "how",
  "why",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "as",
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "can",
  "could",
  "will",
  "would",
]);

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
