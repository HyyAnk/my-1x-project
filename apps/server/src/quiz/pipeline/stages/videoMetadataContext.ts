import type { Channel, Episode, QuizProductRef, QuizShort, QuizV2 } from "@studio/shared";
import { RepositoryError } from "../../../repository.js";
import type { LLMClient } from "../../../utils/promptSanitizer.js";
import type { SupportedBaseLanguage } from "../../bank/localization/localization.types.js";
import {
  resolveEpisodeTargetLanguage,
  resolveQuizShortTargetLanguage,
  type ProductLocalizationArtifact,
} from "../../bank/localization/productLocalization.js";
import type { QuizOrchestratorInput } from "../orchestrator.js";
import { resolvePipelineProductRef } from "../quizProductView.js";

type SharedMetadataContext = {
  ref: QuizProductRef;
  channel: Channel;
  quiz: QuizV2;
  targetLanguage: SupportedBaseLanguage;
  localization: ProductLocalizationArtifact | null;
};

export type EpisodeMetadataContext = SharedMetadataContext & { kind: "episode"; episode: Episode };
export type QuizShortMetadataContext = SharedMetadataContext & { kind: "quiz_short"; quizShort: QuizShort };
export type MetadataContext = EpisodeMetadataContext | QuizShortMetadataContext;

export function resolveMetadataClient(input: QuizOrchestratorInput, artifactLabel: string): LLMClient {
  const client = input.activeEngine === "antigravity" && input.antigravityClient ? input.antigravityClient : input.codexClient;
  if (!client) {
    throw new RepositoryError(`No active LLM client available for generating ${artifactLabel}`, "LLM_CLIENT_UNAVAILABLE");
  }
  return client;
}

export function resolveMetadataTimeout(timeoutMs?: number): number {
  return timeoutMs ?? (process.env.NODE_ENV === "test" || process.env.VITEST ? 1500 : 45_000);
}

async function loadQuiz(input: QuizOrchestratorInput, ref: QuizProductRef, artifactLabel: string): Promise<QuizV2> {
  const quiz = await input.repository.readQuiz(input.channelId, ref);
  if (!quiz || quiz.questions.length === 0) {
    throw new RepositoryError(`Quiz questions must be generated before video ${artifactLabel}`, "QUIZ_REQUIRED");
  }
  return quiz;
}

/** Loads the record, channel, quiz and confirmed language for whichever product kind the input names. */
export async function loadMetadataContext(input: QuizOrchestratorInput, artifactLabel: string): Promise<MetadataContext> {
  const ref = resolvePipelineProductRef(input);
  const [channel, quiz] = await Promise.all([input.repository.getChannel(input.channelId), loadQuiz(input, ref, artifactLabel)]);
  if (ref.kind === "quiz_short") {
    const quizShort = await input.repository.getQuizShort(input.channelId, ref.product_id);
    const { targetLanguage, localization } = await resolveQuizShortTargetLanguage(input.repository, input.channelId, quizShort);
    return { kind: "quiz_short", ref, quizShort, channel, quiz, targetLanguage, localization };
  }
  const episode = await input.repository.getEpisode(input.channelId, ref.product_id);
  const { targetLanguage, localization } = await resolveEpisodeTargetLanguage(input.repository, input.channelId, episode);
  return { kind: "episode", ref, episode, channel, quiz, targetLanguage, localization };
}
