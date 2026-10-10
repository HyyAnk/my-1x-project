import type { PortraitImageClient } from "../../../providers/imageGeneration/imageGeneration.types.js";
import { createPortraitImageClient } from "../../../providers/imageGeneration/portraitImageClient.js";
import { ensureEpisodeThumbnail } from "../../thumbnail/ensureEpisodeThumbnail.js";
import { generateQuizShortCoverForProduct } from "../../thumbnail/quizShortCoverService.js";
import type { QuizOrchestratorInput } from "../orchestrator.js";
import { resolvePipelineProductRef } from "../quizProductView.js";

function resolvePortraitImageClient(input: QuizOrchestratorInput): PortraitImageClient {
  return input.portraitImageClient ?? createPortraitImageClient(input.config.image_generation, input.config.image_fallback);
}

function resolveLlmClient(input: QuizOrchestratorInput) {
  return input.activeEngine === "antigravity" && input.antigravityClient ? input.antigravityClient : input.codexClient;
}

async function ensureEpisodeThumbnailStage(input: QuizOrchestratorInput): Promise<void> {
  const image = input.config.image_generation;
  await ensureEpisodeThumbnail(input.repository, {
    channelId: input.channelId,
    episodeId: input.episodeId,
    activeEngine: input.activeEngine,
    antigravityClient: input.antigravityClient,
    codexClient: input.codexClient,
    customHookText: input.customHookText,
    layoutOverride: input.layoutOverride,
    badgeOverride: input.badgeOverride,
    imageConfig: image ? { api_key: image.api_key, model: image.model, provider: image.provider, base_url: image.base_url } : undefined,
    imageFallbackConfig: input.config.image_fallback,
  });
}

/**
 * Produces the product's thumbnail inside the pipeline: Episode thumbnails through the existing
 * ensure flow, Quiz Short covers through the portrait cover service. Failures are logged, never thrown.
 */
export async function ensureProductThumbnailNonBlocking(input: QuizOrchestratorInput): Promise<void> {
  const product = resolvePipelineProductRef(input);
  try {
    if (product.kind === "quiz_short") {
      await generateQuizShortCoverForProduct({
        repository: input.repository,
        channelId: input.channelId,
        quizShortId: product.product_id,
        portraitImageClient: resolvePortraitImageClient(input),
        llmClient: resolveLlmClient(input),
      });
      return;
    }
    await ensureEpisodeThumbnailStage(input);
  } catch (error) {
    console.warn(
      `[orchestrator] Thumbnail skipped for ${product.kind} "${product.product_id}":`,
      error instanceof Error ? error.message : error,
    );
  }
}
