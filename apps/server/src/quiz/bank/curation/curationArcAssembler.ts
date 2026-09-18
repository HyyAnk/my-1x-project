import type { BankQuestionWithCooldown } from "@studio/shared";
import type { ScoredBankQuestion } from "./curationScoring.js";

export function assembleThreeActArc(scored: ScoredBankQuestion[]): BankQuestionWithCooldown[] {
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

export function assembleGenericArc(scored: ScoredBankQuestion[], targetCount: number): BankQuestionWithCooldown[] {
  const topQuestions = scored.slice(0, targetCount);
  topQuestions.sort((a, b) => a.question.difficulty - b.question.difficulty || b.visualScore - a.visualScore);
  return topQuestions.map((s) => s.question);
}

export function assemblePartialArc(scored: ScoredBankQuestion[]): BankQuestionWithCooldown[] {
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
