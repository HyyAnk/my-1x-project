import type { BankQuestion } from "@studio/shared";
import type { EvaluatedBankQuestionCandidate } from "../quiz/bank/bankEligibility.js";
import { STOPWORDS } from "./stopwords.js";

export function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function scoreQuestionKeywordMatch(q: BankQuestion, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  let score = 0;
  const qDomain = normalize(q.domain_id || "");
  const qSubtopic = normalize(q.subtopic_id || "");
  const qText = normalize(q.question || "");
  const qTags = (q.tags || []).map(normalize);

  for (const token of tokens) {
    if (token.length < 2) continue;
    if (qDomain.includes(token)) score += 10;
    if (qSubtopic.includes(token)) score += 8;
    if (qTags.some((t) => t.includes(token))) score += 7;
    if (qText.includes(token)) score += 4;
  }
  return score;
}

export function scoreDomainKeywordMatch(domainId: string, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  let score = 0;
  const norm = normalize(domainId);
  for (const token of tokens) {
    if (token.length < 2) continue;
    if (norm.includes(token)) score += 10;
  }
  return score;
}

export function extractHintTokens(topicHint?: string): {
  rawTokens: string[];
  hintTokens: string[];
  hasKeyword: boolean;
} {
  const trimmedHint = topicHint?.trim();
  const rawTokens = trimmedHint ? normalize(trimmedHint).split(/\s+/).filter(Boolean) : [];
  const hintTokens = rawTokens.filter((token) => token.length >= 2 && !STOPWORDS.has(token));
  const hasKeyword = rawTokens.length > 0;
  return { rawTokens, hintTokens, hasKeyword };
}

export function selectDiscoveryCandidates(
  slotCandidates: EvaluatedBankQuestionCandidate[],
  requiredCount: number,
): EvaluatedBankQuestionCandidate[] {
  const bySubtopic = new Map<string, EvaluatedBankQuestionCandidate[]>();
  for (const c of slotCandidates) {
    const sub = JSON.stringify([c.question.domain_id, c.question.subtopic_id]);
    if (!bySubtopic.has(sub)) bySubtopic.set(sub, []);
    bySubtopic.get(sub)!.push(c);
  }
  const viableGroup = Array.from(bySubtopic.values()).find((group) => group.length >= requiredCount);
  return viableGroup ? viableGroup.slice(0, requiredCount) : [];
}

export function selectSteeredCandidates(
  slotCandidates: EvaluatedBankQuestionCandidate[],
  hintTokens: string[],
  requiredCount: number,
): EvaluatedBankQuestionCandidate[] | null {
  if (hintTokens.length === 0) return null;
  const scoredCandidates = slotCandidates
    .filter((c) => hintTokens.every((token) => scoreQuestionKeywordMatch(c.question, [token]) > 0))
    .map((c) => ({
      candidate: c,
      score: scoreQuestionKeywordMatch(c.question, hintTokens) + scoreDomainKeywordMatch(c.question.domain_id || "", hintTokens),
    }))
    .filter((item) => item.score > 0);

  scoredCandidates.sort((a, b) => b.score - a.score);

  if (scoredCandidates.length < requiredCount) {
    return null;
  }
  const coherent = selectDiscoveryCandidates(
    scoredCandidates.map((sc) => sc.candidate),
    requiredCount,
  );
  return coherent.length === requiredCount ? coherent : null;
}
