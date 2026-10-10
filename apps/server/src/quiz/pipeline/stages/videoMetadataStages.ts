import type { VideoDescription, VideoTitle } from "@studio/shared";
import type { LLMClient } from "../../../utils/promptSanitizer.js";
import { generateQuizShortDescription, generateVideoDescription } from "../../description/index.js";
import { getEpisodeThumbnailManifest } from "../../thumbnail/index.js";
import { readQuizShortCoverManifest } from "../../thumbnail/quizShortCoverManifest.js";
import { generateVideoTitle, loadRecentChannelTitles } from "../../title/index.js";
import type { QuizOrchestratorInput } from "../orchestrator.js";
import { loadMetadataContext, resolveMetadataClient, resolveMetadataTimeout, type MetadataContext } from "./videoMetadataContext.js";

type MetadataStageOptions = { toneHint?: string; timeoutMs?: number };

export type GenerateEpisodeDescriptionOptions = MetadataStageOptions & {
  /** The quiz content changed: regenerate the title too, unless the user wrote it by hand. */
  force?: boolean;
};

async function loadThumbnailHookText(input: QuizOrchestratorInput, context: MetadataContext): Promise<string | null | undefined> {
  if (context.kind === "quiz_short") {
    return (await readQuizShortCoverManifest(input.repository, input.channelId, context.ref.product_id).catch(() => null))?.hook_text;
  }
  return (await getEpisodeThumbnailManifest(input.repository, input.channelId, context.ref.product_id).catch(() => null))?.hook_text;
}

/**
 * Generates and stores the product's single SEO YouTube title. Runs before the description.
 * Episodes use the long-form formula; Quiz Shorts the 70-character "#Shorts" variant.
 */
export async function generateProductTitle(
  input: QuizOrchestratorInput & MetadataStageOptions,
): Promise<{ title: VideoTitle; artifact_path: string }> {
  const context = await loadMetadataContext(input, "title");
  const client = resolveMetadataClient(input, "title");
  const [thumbnailHookText, recentTitles] = await Promise.all([
    loadThumbnailHookText(input, context),
    loadRecentChannelTitles(input.repository, input.channelId, context.ref.product_id).catch(() => []),
  ]);

  const title = await generateVideoTitle({
    client,
    channel: context.channel,
    quiz: context.quiz,
    episode: context.kind === "episode" ? context.episode : context.quizShort,
    productKind: context.kind,
    productId: context.ref.product_id,
    targetLanguage: context.targetLanguage,
    localization: context.localization,
    thumbnailHookText,
    recentTitles,
    toneHint: input.toneHint,
    timeoutMs: resolveMetadataTimeout(input.timeoutMs),
  });
  const artifact_path = await input.repository.writeVideoTitle(input.channelId, context.ref, title);
  return { title, artifact_path };
}

/**
 * Returns the stored title, generating one first when it is missing or stale.
 * Title failures never block the description.
 */
async function ensureProductTitle(input: QuizOrchestratorInput & GenerateEpisodeDescriptionOptions): Promise<VideoTitle | null> {
  const existing = await input.repository.readVideoTitle(input.channelId, input.episodeId).catch(() => null);
  const isStale = Boolean(input.force) && existing?.source !== "manual";
  if (existing && !isStale) return existing;
  try {
    return (await generateProductTitle({ ...input, toneHint: undefined })).title;
  } catch (error) {
    console.warn(
      `[videoMetadataStages] Title generation skipped for product "${input.episodeId}":`,
      error instanceof Error ? error.message : error,
    );
    return existing;
  }
}

async function generateDescriptionForContext(
  input: QuizOrchestratorInput & GenerateEpisodeDescriptionOptions,
  context: MetadataContext,
  client: LLMClient,
  title: VideoTitle | null,
): Promise<VideoDescription> {
  const shared = {
    client,
    channel: context.channel,
    quiz: context.quiz,
    targetLanguage: context.targetLanguage,
    localization: context.localization,
    videoTitle: title,
    toneHint: input.toneHint,
    timeoutMs: resolveMetadataTimeout(input.timeoutMs),
  };
  if (context.kind === "quiz_short") return generateQuizShortDescription({ ...shared, quizShort: context.quizShort });
  const timeline = await input.repository.readQuizTimeline(input.channelId, context.ref).catch(() => null);
  return generateVideoDescription({ ...shared, episode: context.episode, timeline });
}

/**
 * Generates the SEO description after making sure the title exists, so both target the same keyword.
 */
export async function generateProductDescription(
  input: QuizOrchestratorInput & GenerateEpisodeDescriptionOptions,
): Promise<{ description: VideoDescription; title: VideoTitle | null; artifact_path: string }> {
  const context = await loadMetadataContext(input, "description");
  const client = resolveMetadataClient(input, "description");
  const title = await ensureProductTitle(input);
  const description = await generateDescriptionForContext(input, context, client, title);
  const artifact_path = await input.repository.writeVideoDescription(input.channelId, context.ref, description);
  return { description, title, artifact_path };
}

/** Episode names kept for every existing call site; both functions dispatch on the product kind. */
export const generateEpisodeTitle = generateProductTitle;
export const generateEpisodeDescription = generateProductDescription;
