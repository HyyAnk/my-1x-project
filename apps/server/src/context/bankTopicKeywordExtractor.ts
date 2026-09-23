import type { BankQuestion } from "@studio/shared";
import type { EvaluatedBankQuestionCandidate } from "../quiz/bank/bankEligibility.js";
import { STOPWORDS } from "./stopwords.js";
import { KEYWORD_SYNONYMS } from "./topicMatrixPlanner.js";

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
  const synonyms = (KEYWORD_SYNONYMS[q.domain_id || ""] || []).map(normalize);

  for (const token of tokens) {
    if (token.length < 2) continue;
    if (qDomain.includes(token)) score += 10;
    if (qSubtopic.includes(token)) score += 8;
    if (qTags.some((t) => t.includes(token))) score += 7;
    if (synonyms.some((syn) => syn.includes(token) || token.includes(syn))) score += 6;
    if (qText.includes(token)) score += 4;
  }
  return score;
}

export function scoreDomainKeywordMatch(domainId: string, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  let score = 0;
  const norm = normalize(domainId);
  const synonyms = (KEYWORD_SYNONYMS[domainId] || []).map(normalize);

  for (const token of tokens) {
    if (token.length < 2) continue;
    if (norm.includes(token)) {
      score += 10;
    } else if (synonyms.some((syn) => syn.includes(token) || token.includes(syn))) {
      score += 8;
    }
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

  // Sort questions within each subtopic group: difficulty 1 before 2, then deterministic question id
  for (const group of bySubtopic.values()) {
    group.sort((a, b) => {
      const aDiff = a.question.difficulty ?? 2;
      const bDiff = b.question.difficulty ?? 2;
      if (aDiff !== bDiff) return aDiff - bDiff;
      return a.question.id.localeCompare(b.question.id);
    });
  }

  // Filter all viable subtopic groups that meet the required count
  const viableGroups = Array.from(bySubtopic.values()).filter((group) => group.length >= requiredCount);
  if (viableGroups.length === 0) return [];

  // Pick uniformly at random among viable subtopic groups
  const chosenIndex = Math.floor(Math.random() * viableGroups.length);
  return viableGroups[chosenIndex].slice(0, requiredCount);
}

export function selectSteeredCandidates(
  slotCandidates: EvaluatedBankQuestionCandidate[],
  hintTokens: string[],
  requiredCount: number,
): EvaluatedBankQuestionCandidate[] | null {
  if (hintTokens.length === 0) return null;
  const scoredCandidates = slotCandidates
    .filter((c) => hintTokens.every((token) => scoreQuestionKeywordMatch(c.question, [token]) > 0))
    .map((c) => {
      let score = scoreQuestionKeywordMatch(c.question, hintTokens) + scoreDomainKeywordMatch(c.question.domain_id || "", hintTokens);
      // Priority bonus for difficulty: 1
      if (c.question.difficulty === 1) {
        score += 10;
      }
      return {
        candidate: c,
        score,
      };
    })
    .filter((item) => item.score > 0);

  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.candidate.question.id.localeCompare(b.candidate.question.id);
  });

  // Group scored candidates by subtopic
  const bySubtopic = new Map<string, { candidate: EvaluatedBankQuestionCandidate; score: number }[]>();
  for (const sc of scoredCandidates) {
    const sub = JSON.stringify([sc.candidate.question.domain_id, sc.candidate.question.subtopic_id]);
    if (!bySubtopic.has(sub)) bySubtopic.set(sub, []);
    bySubtopic.get(sub)!.push(sc);
  }

  // Filter viable subtopic groups having at least requiredCount candidates
  const viableGroups = Array.from(bySubtopic.values()).filter((g) => g.length >= requiredCount);
  if (viableGroups.length === 0) return null;

  // Sort candidates within each group: descending by score, difficulty 1 before 2, then question id
  for (const group of viableGroups) {
    group.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aDiff = a.candidate.question.difficulty ?? 2;
      const bDiff = b.candidate.question.difficulty ?? 2;
      if (aDiff !== bDiff) return aDiff - bDiff;
      return a.candidate.question.id.localeCompare(b.candidate.question.id);
    });
  }

  // Rank viable groups by their top candidates' scores
  viableGroups.sort((gA, gB) => {
    const topScoreA = gA.slice(0, requiredCount).reduce((sum, item) => sum + item.score, 0);
    const topScoreB = gB.slice(0, requiredCount).reduce((sum, item) => sum + item.score, 0);
    return topScoreB - topScoreA;
  });

  return viableGroups[0].slice(0, requiredCount).map((item) => item.candidate);
}
