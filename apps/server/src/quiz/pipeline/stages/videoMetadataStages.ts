import type { VideoDescription, VideoTitle } from "@studio/shared";
import { RepositoryError } from "../../../repository.js";
import type { LLMClient } from "../../../utils/promptSanitizer.js";
import { resolveEpisodeTargetLanguage } from "../../bank/localization/productLocalization.js";
import { generateVideoDescription } from "../../description/index.js";
import { getEpisodeThumbnailManifest } from "../../thumbnail/index.js";
import { generateVideoTitle, loadRecentChannelTitles } from "../../title/index.js";
import type { QuizOrchestratorInput } from "../orchestrator.js";
import { resolvePipelineProductRef } from "../quizProductView.js";

type MetadataStageOptions = { toneHint?: string; timeoutMs?: number };

export type GenerateEpisodeDescriptionOptions = MetadataStageOptions & {
  /** The quiz content changed: regenerate the title too, unless the user wrote it by hand. */
  force?: boolean;
};

function resolveMetadataClient(input: QuizOrchestratorInput, artifactLabel: string): LLMClient {
  const client = input.activeEngine === "antigravity" && input.antigravityClient ? input.antigravityClient : input.codexClient;
  if (!client) {
    throw new RepositoryError(`No active LLM client available for generating ${artifactLabel}`, "LLM_CLIENT_UNAVAILABLE");
  }
  return client;
}

function resolveMetadataTimeout(timeoutMs?: number): number {
  return timeoutMs ?? (process.env.NODE_ENV === "test" || process.env.VITEST ? 1500 : 45_000);
}

async function loadMetadataContext(input: QuizOrchestratorInput, artifactLabel: string) {
  if (resolvePipelineProductRef(input).kind === "quiz_short") {
    // Quiz Short titles and descriptions use the portrait-aware generators that arrive in Phase 5.
    throw new RepositoryError(
      `Quiz Short video ${artifactLabel} generation is not implemented in this phase`,
      "QUIZ_SHORT_METADATA_NOT_IMPLEMENTED",
    );
  }
  const [episode, channel, quiz] = await Promise.all([
    input.repository.getEpisode(input.channelId, input.episodeId),
    input.repository.getChannel(input.channelId),
    input.repository.readQuiz(input.channelId, input.episodeId),
  ]);
  if (!quiz || quiz.questions.length === 0) {
    throw new RepositoryError(`Quiz questions must be generated before video ${artifactLabel}`, "QUIZ_REQUIRED");
  }
  const { targetLanguage, localization } = await resolveEpisodeTargetLanguage(input.repository, input.channelId, episode);
  return { episode, channel, quiz, targetLanguage, localization };
}

/**
 * Generates and stores the episode's single SEO YouTube title. Runs before the description.
 */
export async function generateEpisodeTitle(
  input: QuizOrchestratorInput & MetadataStageOptions,
): Promise<{ title: VideoTitle; artifact_path: string }> {
  const context = await loadMetadataContext(input, "title");
  const client = resolveMetadataClient(input, "title");
  const [thumbnailManifest, recentTitles] = await Promise.all([
    getEpisodeThumbnailManifest(input.repository, input.channelId, input.episodeId).catch(() => null),
    loadRecentChannelTitles(input.repository, input.channelId, input.episodeId).catch(() => []),
  ]);

  const title = await generateVideoTitle({
    client,
    ...context,
    thumbnailHookText: thumbnailManifest?.hook_text,
    recentTitles,
    toneHint: input.toneHint,
    timeoutMs: resolveMetadataTimeout(input.timeoutMs),
  });
  const artifact_path = await input.repository.writeVideoTitle(input.channelId, input.episodeId, title);
  return { title, artifact_path };
}

/**
 * Returns the stored title, generating one first when it is missing or stale.
 * Title failures never block the description.
 */
async function ensureEpisodeTitle(input: QuizOrchestratorInput & GenerateEpisodeDescriptionOptions): Promise<VideoTitle | null> {
  const existing = await input.repository.readVideoTitle(input.channelId, input.episodeId).catch(() => null);
  const isStale = Boolean(input.force) && existing?.source !== "manual";
  if (existing && !isStale) return existing;
  try {
    return (await generateEpisodeTitle({ ...input, toneHint: undefined })).title;
  } catch (error) {
    console.warn(
      `[videoMetadataStages] Title generation skipped for episode "${input.episodeId}":`,
      error instanceof Error ? error.message : error,
    );
    return existing;
  }
}

/**
 * Generates the SEO description after making sure the title exists, so both target the same keyword.
 */
export async function generateEpisodeDescription(
  input: QuizOrchestratorInput & GenerateEpisodeDescriptionOptions,
): Promise<{ description: VideoDescription; title: VideoTitle | null; artifact_path: string }> {
  const context = await loadMetadataContext(input, "description");
  const client = resolveMetadataClient(input, "description");
  const title = await ensureEpisodeTitle(input);
  const timeline = await input.repository.readQuizTimeline(input.channelId, input.episodeId).catch(() => null);

  const description = await generateVideoDescription({
    client,
    ...context,
    timeline,
    videoTitle: title,
    toneHint: input.toneHint,
    timeoutMs: resolveMetadataTimeout(input.timeoutMs),
  });
  const artifact_path = await input.repository.writeVideoDescription(input.channelId, input.episodeId, description);
  return { description, title, artifact_path };
}
