import type { MascotProfile } from "@studio/shared";
import type { StudioLogger } from "../../logger.js";
import type { RepositoryService } from "../../repository.js";
import type { loadProductLocalizationArtifact } from "../bank/localization/productLocalization.js";

export interface EpisodeQuestionItem {
  question: string;
  choices?: string[];
  answer?: string;
}

/**
 * Loads the channel mascot profile if assigned, or logs a warning and returns null.
 */
export async function loadChannelMascot(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  mascotId?: string | null,
  logger?: StudioLogger,
): Promise<MascotProfile | null> {
  if (!mascotId) return null;
  try {
    return await repository.getMascot(mascotId);
  } catch {
    logger?.warn(`Assigned mascot ${mascotId} not found, proceeding with default persona`, {
      profileId: channelId,
      workerId: episodeId,
    });
    return null;
  }
}

/**
 * Loads parsed quiz questions from repository scene data for an episode.
 */
export async function loadEpisodeQuestions(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
): Promise<EpisodeQuestionItem[]> {
  try {
    const scenes = (await repository.readScenes(channelId, episodeId)) as unknown[];
    const result: EpisodeQuestionItem[] = [];

    for (const s of scenes) {
      if (!s || typeof s !== "object" || !("quiz" in s)) continue;
      const quiz = (s as { quiz?: unknown }).quiz;
      if (!quiz || typeof quiz !== "object" || !("question" in quiz)) continue;
      const q = quiz as { question?: unknown; choices?: unknown; answer?: unknown };
      if (typeof q.question === "string" && q.question.trim().length > 0) {
        result.push({
          question: q.question,
          choices: Array.isArray(q.choices) ? q.choices.filter((c): c is string => typeof c === "string") : undefined,
          answer: typeof q.answer === "string" ? q.answer : undefined,
        });
      }
    }
    return result;
  } catch {
    return [];
  }
}

/**
 * Applies translated quiz question text and choices from product localization artifacts when applied.
 */
export function applyLocalizedQuestionProjection(
  questions: EpisodeQuestionItem[],
  localization: Awaited<ReturnType<typeof loadProductLocalizationArtifact>>,
): EpisodeQuestionItem[] {
  if (!localization || localization.status !== "applied" || localization.quiz_questions.length === 0) return questions;
  const localized = localization.quiz_questions;
  return questions.map((question, index) => {
    const translated = localized[index];
    if (!translated) return question;
    const answer = question.answer;
    const answerIndex = question.choices?.findIndex((choice) => choice === answer) ?? -1;
    return {
      question: translated.question,
      choices: translated.choices.map((choice) => choice.text),
      answer: answerIndex >= 0 ? translated.choices[answerIndex]?.text || answer : answer,
    };
  });
}
