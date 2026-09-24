import { createHash } from "node:crypto";
import type { MascotProfile } from "@studio/shared";
import type { StudioLogger } from "../../logger.js";
import type { RepositoryService } from "../../repository.js";
import type { loadProductLocalizationArtifact } from "../bank/localization/productLocalization.js";
import { loadMasterReferenceImageBase64 } from "../mascot/services/mascotAssetLoader.js";
import type { MascotVisualAnchor } from "./thumbnailTypes.js";

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
 * Loads the channel mascot visual anchor (master reference image base64, mimeType, sourceUrl, and sha256 fingerprint),
 * or logs a warning and returns null safely.
 */
export async function loadChannelMascotVisualAnchor(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  mascotId?: string | null,
  logger?: StudioLogger,
): Promise<MascotVisualAnchor | null> {
  if (!mascotId) return null;
  let mascot: MascotProfile;
  try {
    mascot = await repository.getMascot(mascotId);
  } catch {
    logger?.warn(`Assigned mascot ${mascotId} not found for visual anchor, proceeding without mascot anchor`, {
      profileId: channelId,
      workerId: episodeId,
    });
    return null;
  }

  try {
    const base64 = await loadMasterReferenceImageBase64(repository, mascot, logger);
    if (!base64) {
      logger?.warn(`Mascot ${mascotId} has no master reference image available for visual anchor`, {
        profileId: channelId,
        workerId: episodeId,
      });
      return null;
    }

    const mimeMatch = base64.match(/^data:([^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
    const sourceUrl = mascot.master_image_url || mascot.master_raw_image_url || undefined;
    const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
    const rawBuffer = Buffer.from(base64Data, "base64");
    const fingerprint = createHash("sha256").update(rawBuffer).digest("hex");

    return {
      base64,
      mimeType,
      sourceUrl: sourceUrl ?? undefined,
      fingerprint,
    };
  } catch (err) {
    logger?.warn(
      `Failed to extract mascot visual anchor for ${mascotId}: ${err instanceof Error ? err.message : String(err)}`,
      {
        profileId: channelId,
        workerId: episodeId,
      },
    );
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
