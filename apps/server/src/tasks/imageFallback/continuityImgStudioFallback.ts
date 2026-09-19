import type { AppConfig } from "@studio/shared";
import type { StudioLogger } from "../../logger.js";
import type { RepositoryService } from "../../repository.js";
import { describeImgStudioModel, resolveImgStudioFallbackModels } from "../../providers/imgstudio/fallbackModels.js";
import { ImgStudioImageProvider } from "../../providers/imgstudio/index.js";
import type { ImgStudioImageTarget } from "../../providers/imgstudio/types.js";

interface ContinuityImgStudioFallbackInput {
  repository: RepositoryService;
  logger: StudioLogger;
  config?: AppConfig["image_fallback"];
  target: ImgStudioImageTarget;
  prompt: string;
  signal?: AbortSignal;
  isCancelled: () => boolean;
}

function assertFallbackActive(input: ContinuityImgStudioFallbackInput): void {
  if (input.signal?.aborted || input.isCancelled()) {
    throw input.signal?.reason instanceof Error ? input.signal.reason : new Error("Continuity image generation was cancelled");
  }
}

async function generateFallbackLevel(
  input: ContinuityImgStudioFallbackInput,
  model: string,
  level: 1 | 2,
): Promise<{ asset_path: string }> {
  assertFallbackActive(input);
  const config = input.config;
  const provider = new ImgStudioImageProvider(input.repository, input.target, {
    apiKey: config?.api_key,
    baseUrl: config?.base_url,
    model,
    resolution: config?.resolution,
    quality: config?.quality,
    idempotencyScope: `fallback-level-${level}`,
  });
  return provider.generateReference(input.prompt, input.signal);
}

export async function generateContinuityImgStudioFallback(
  input: ContinuityImgStudioFallbackInput,
  primaryError: unknown,
): Promise<{ image: { asset_path: string } } | null> {
  const config = input.config;
  if (!config || config.enabled === false || !ImgStudioImageProvider.isConfigured(config.api_key)) {
    return null;
  }

  const bundleLabel = `CB-${String(input.target.bundleNumber ?? 1).padStart(2, "0")}`;
  const models = resolveImgStudioFallbackModels(config.model);
  const primaryReason = primaryError instanceof Error ? primaryError.message : String(primaryError);
  input.logger.warn(
    `Primary image provider failed for bundle ${bundleLabel} (${primaryReason}). Starting ImgStudio Level 1 with ${describeImgStudioModel(models.level1)}.`,
    { profileId: input.target.channelId, step: "IMAGE_FALLBACK_TRIGGERED" },
  );

  try {
    const image = await generateFallbackLevel(input, models.level1, 1);
    return { image };
  } catch (level1Error) {
    assertFallbackActive(input);
    const level1Reason = level1Error instanceof Error ? level1Error.message : String(level1Error);
    input.logger.warn(
      `ImgStudio Level 1 failed for bundle ${bundleLabel} (${level1Reason}). Starting Level 2 with ${describeImgStudioModel(models.level2)}.`,
      { profileId: input.target.channelId, step: "IMAGE_FALLBACK_L2_TRIGGERED" },
    );
  }

  try {
    const image = await generateFallbackLevel(input, models.level2, 2);
    return { image };
  } catch (level2Error) {
    input.logger.error(
      `ImgStudio Level 2 failed for bundle ${bundleLabel}: ${level2Error instanceof Error ? level2Error.message : String(level2Error)}`,
      { profileId: input.target.channelId, step: "IMAGE_FALLBACK_L2_FAILED" },
    );
    throw level2Error;
  }
}
