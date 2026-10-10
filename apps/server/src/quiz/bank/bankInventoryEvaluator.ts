import {
  hashBankQuestionSource,
  QUIZ_SHORT_TOPIC_ARCHETYPES,
  type BankQuestion,
  type BankQuestionWithCooldown,
  type QuizConfigFormat,
  type QuizShortTopicArchetype,
} from "@studio/shared";
import {
  evaluateEpisodeQuestionEligibility,
  evaluateQuizShortQuestionEligibility,
  evaluateShortReelQuestionEligibility,
  type BankQuestionEligibilityResult,
  type ShortReelEligibilityOptions,
} from "./bankEligibility.js";

const SHORT_REEL_ARCHETYPES: ReadonlySet<string> = new Set(["deep_trivia", "versus_faceoff", "verdict_yes_no"]);
const QUIZ_SHORT_ARCHETYPES: ReadonlySet<string> = new Set(QUIZ_SHORT_TOPIC_ARCHETYPES);

export interface BankInventoryEvaluator {
  readonly targetLanguage: string;
  readonly expectedFormat?: QuizConfigFormat;
  episode(question: BankQuestionWithCooldown): BankQuestionEligibilityResult;
  /** Returns null when the question's archetype is not used by Quiz Shorts. */
  quizShort(question: BankQuestionWithCooldown): BankQuestionEligibilityResult | null;
  /** Returns null when the question's archetype is not used by Short Reels. */
  shortReel(question: BankQuestionWithCooldown): BankQuestionEligibilityResult | null;
  sourceHash(question: BankQuestion): string;
}

function memoize<K extends object, V>(compute: (key: K) => V): (key: K) => V {
  const cache = new Map<K, V>();
  return (key) => {
    if (cache.has(key)) return cache.get(key) as V;
    const value = compute(key);
    cache.set(key, value);
    return value;
  };
}

/**
 * Creates the eligibility and source-hash evaluators for one inventory scan. Each question is
 * screened and hashed at most once per scan, even though exclusion counting, eligible-source
 * collection, and the snapshot digest all need the results.
 */
export function createBankInventoryEvaluator(targetLanguage: string, expectedFormat?: QuizConfigFormat): BankInventoryEvaluator {
  return {
    targetLanguage,
    expectedFormat,
    episode: memoize((question: BankQuestionWithCooldown) =>
      evaluateEpisodeQuestionEligibility(question, { targetLanguage, expectedFormat }),
    ),
    quizShort: memoize((question: BankQuestionWithCooldown) =>
      QUIZ_SHORT_ARCHETYPES.has(question.archetype_id)
        ? evaluateQuizShortQuestionEligibility(question, { targetArchetype: question.archetype_id as QuizShortTopicArchetype })
        : null,
    ),
    shortReel: memoize((question: BankQuestionWithCooldown) =>
      SHORT_REEL_ARCHETYPES.has(question.archetype_id)
        ? evaluateShortReelQuestionEligibility(question, {
            targetArchetype: question.archetype_id as ShortReelEligibilityOptions["targetArchetype"],
          })
        : null,
    ),
    sourceHash: memoize((question: BankQuestion) => hashBankQuestionSource(question)),
  };
}
