import type { ShortReelTopicCandidate } from "@studio/shared";
import type { EvaluatedQuestionCandidate } from "./questionEligibility.js";

function normalizeToken(token: string): string {
  return token
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Calculates topic suitability score for an eligible question candidate.
 * Pure and deterministic, operating exclusively on the selected English text.
 */
export function calculateSuitabilityScore(candidate: EvaluatedQuestionCandidate, topic: ShortReelTopicCandidate): number {
  let score = 0;

  // Domain alignment bonus
  if (topic.domain_id && candidate.question.domain_id === topic.domain_id) {
    score += 100;
  }

  // Subtopic alignment bonus
  if (topic.subtopic_id && candidate.question.subtopic_id === topic.subtopic_id) {
    score += 50;
  }

  // Semantic keyword token overlap against selected English text
  const topicText = `${topic.title} ${topic.premise} ${topic.hook} ${topic.theme_hint ?? ""}`;
  const topicTokens = normalizeToken(topicText)
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const candidateHaystack = normalizeToken(`${candidate.sourceText} ${candidate.explanation} ${(candidate.question.tags || []).join(" ")}`);

  for (const token of topicTokens) {
    if (candidateHaystack.includes(token)) {
      score += 10;
    }
  }

  return score;
}
