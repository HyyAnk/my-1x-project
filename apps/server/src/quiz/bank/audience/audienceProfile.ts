import type { QuizAgeBand } from "@studio/shared";
import { countWords, fleschKincaidGrade } from "./readability.js";

export interface AudienceProfileInput {
  question: string;
  explanation?: string;
}

export interface AudienceProfile {
  age_band: QuizAgeBand;
  difficulty: 1 | 2 | 3 | 4 | 5;
  questionGrade: number;
  explanationGrade: number;
}

interface AgeBandThreshold {
  band: QuizAgeBand;
  maxQuestionGrade: number;
  maxExplanationGrade: number;
  maxQuestionWords: number;
}

/** Youngest band first; the first band whose limits a question fits is assigned. */
const AGE_BAND_THRESHOLDS: readonly AgeBandThreshold[] = [
  { band: "4-6", maxQuestionGrade: 2.5, maxExplanationGrade: 4, maxQuestionWords: 12 },
  { band: "7-9", maxQuestionGrade: 5, maxExplanationGrade: 7, maxQuestionWords: 16 },
  { band: "10-12", maxQuestionGrade: 8, maxExplanationGrade: 10, maxQuestionWords: 20 },
];

/** Upper comprehension-grade bound for difficulty levels 1-4; anything harder is level 5. */
const DIFFICULTY_GRADE_CEILINGS: readonly number[] = [2, 5, 8, 11];

/** The question is read on screen; the explanation is heard, which children follow about two grades above their reading level. */
const LISTENING_GRADE_ALLOWANCE = 2;

function resolveAgeBand(questionGrade: number, explanationGrade: number, questionWords: number): QuizAgeBand {
  const fit = AGE_BAND_THRESHOLDS.find(
    (threshold) =>
      questionGrade <= threshold.maxQuestionGrade &&
      explanationGrade <= threshold.maxExplanationGrade &&
      questionWords <= threshold.maxQuestionWords,
  );
  return fit?.band ?? "family";
}

function resolveDifficulty(questionGrade: number, explanationGrade: number): AudienceProfile["difficulty"] {
  const comprehensionGrade = Math.max(questionGrade, explanationGrade - LISTENING_GRADE_ALLOWANCE);
  const level = DIFFICULTY_GRADE_CEILINGS.findIndex((ceiling) => comprehensionGrade <= ceiling);
  return (level === -1 ? 5 : level + 1) as AudienceProfile["difficulty"];
}

/**
 * Estimates the youngest suitable audience and a 1-5 difficulty from the reading level of
 * the on-screen question and the narrated explanation. Deterministic and side-effect free.
 */
export function estimateAudienceProfile(input: AudienceProfileInput): AudienceProfile {
  const questionGrade = fleschKincaidGrade(input.question);
  const explanationGrade = fleschKincaidGrade(input.explanation ?? "");
  return {
    age_band: resolveAgeBand(questionGrade, explanationGrade, countWords(input.question)),
    difficulty: resolveDifficulty(questionGrade, explanationGrade),
    questionGrade,
    explanationGrade,
  };
}
