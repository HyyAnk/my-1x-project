import {
  createEnglishSourceSnapshot,
  type BankQuestionWithCooldown,
  type ShortReelSourceSnapshot,
  type ShortReelTopicCandidate,
  type TopicCandidate,
} from "@studio/shared";
import { RepositoryError } from "../repository/service.js";
import type { QueryQuestionBankParams } from "../repository/quiz/bank/bankQueryEngine.js";
import { evaluateQuestionEligibility, type EvaluatedQuestionCandidate } from "./questionEligibility.js";
import { calculateSuitabilityScore } from "./questionSuitability.js";

export interface QuestionBankQueryClient {
  queryQuestionBankQuestions(params: QueryQuestionBankParams): Promise<{
    questions: BankQuestionWithCooldown[];
    total: number;
  }>;
}

export interface SelectShortReelQuestionOptions {
  topic: ShortReelTopicCandidate | TopicCandidate;
  repository: QuestionBankQueryClient;
  maxPages?: number;
  pageSize?: number;
}

interface ScoredCandidate {
  candidate: EvaluatedQuestionCandidate;
  score: number;
}

/**
 * Selects exactly one approved English bank question or verified English translation
 * across bounded pages with stable tie-breaking and BANK_EMPTY error handling.
 * Consumes the validated source constructor without duplicating snapshot creation logic.
 */
export async function selectShortReelQuestion(options: SelectShortReelQuestionOptions): Promise<ShortReelSourceSnapshot> {
  const { topic, repository, maxPages = 20, pageSize = 50 } = options;

  if (topic.content_kind !== "short_reel") {
    throw new RepositoryError(
      `Cannot select question for topic with content_kind "${topic.content_kind}" (expected "short_reel")`,
      "INVALID_TOPIC_KIND",
    );
  }

  const shortReelTopic = topic;
  const targetArchetype = String(shortReelTopic.archetype);

  if (targetArchetype !== "versus_faceoff" && targetArchetype !== "deep_trivia") {
    throw new RepositoryError(`Invalid Short-Reel archetype "${targetArchetype}"`, "INVALID_ARCHETYPE");
  }

  const scoredCandidates: ScoredCandidate[] = [];
  let offset = 0;
  let pageCount = 0;
  let totalAvailable = Infinity;

  while (pageCount < maxPages && offset < totalAvailable) {
    const page = await repository.queryQuestionBankQuestions({
      channelId: shortReelTopic.channel_id,
      readyOnly: true,
      status: "approved",
      archetypeId: targetArchetype,
      limit: pageSize,
      offset,
    });

    totalAvailable = page.total;
    if (page.questions.length === 0) {
      break;
    }

    for (const rawQuestion of page.questions) {
      const eligibility = evaluateQuestionEligibility(rawQuestion, targetArchetype);
      if (eligibility.eligible) {
        const score = calculateSuitabilityScore(eligibility.candidate, shortReelTopic);
        scoredCandidates.push({ candidate: eligibility.candidate, score });
      }
    }

    offset += page.questions.length;
    pageCount++;
  }

  if (scoredCandidates.length === 0) {
    throw new RepositoryError(
      `No eligible approved English question found in Question Bank for archetype "${targetArchetype}"`,
      "BANK_EMPTY",
    );
  }

  // Sort candidates by:
  // 1. Highest suitability score descending
  // 2. Stable tie-break by question ID ascending
  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.candidate.question.id.localeCompare(b.candidate.question.id);
  });

  const selected = scoredCandidates[0].candidate;

  return createEnglishSourceSnapshot(selected.question, selected.translationProvenance);
}
