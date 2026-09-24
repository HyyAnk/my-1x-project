import {
  type GreenScreenCanvasComposition,
  type GreenScreenValidationResult,
  validateGreenScreenNormalized,
} from "../../../utils/imageMatting.js";
import { MASCOT_GREEN_SCREEN_REINFORCEMENT_TAGS } from "../../mascotPromptConstants.js";
import { createImgStudioRunId } from "../../../providers/imgstudio/idempotency.js";
import { describeImgStudioModel } from "../../../providers/imgstudio/fallbackModels.js";
import type { MascotArtFallbackParams } from "./mascotAiImageClient.js";

/**
 * Appends explicit chroma-key green screen isolation tags to the prompt when a retry is triggered.
 * Avoids duplicate tag injection if the prompt already contains the reinforcement text.
 */
export function reinforcePromptWithGreenScreen(prompt: string): string {
  const trimmed = prompt.trim();
  if (trimmed.includes(MASCOT_GREEN_SCREEN_REINFORCEMENT_TAGS)) {
    return trimmed;
  }
  return `${trimmed}, ${MASCOT_GREEN_SCREEN_REINFORCEMENT_TAGS}`;
}

/**
 * Validates a generated raw image candidate buffer against chroma-key green standards.
 * Supports normalization from WebP/JPEG/PNG and checks composition-aware boundaries.
 */
export async function validateGeneratedGreenScreen(
  candidate: Uint8Array,
  composition?: GreenScreenCanvasComposition,
): Promise<GreenScreenValidationResult> {
  return await validateGreenScreenNormalized(candidate, {
    composition: composition ?? "auto",
  });
}

/**
 * Asserts that a candidate buffer satisfies green screen compliance; throws a descriptive error if invalid.
 */
export async function assertGreenScreenCandidate(
  candidate: Uint8Array,
  composition?: GreenScreenCanvasComposition,
  actionLabel = "mascot art",
): Promise<GreenScreenValidationResult> {
  const result = await validateGeneratedGreenScreen(candidate, composition);
  if (!result.isValid) {
    throw new Error(
      `Green-screen validation failed for ${actionLabel}: reason=${result.reason}, greenRatio=${result.greenRatio}, isTransparent=${result.isTransparent}`,
    );
  }
  return result;
}

export interface GreenScreenGenerationHelpers {
  tryPrimary: (params: MascotArtFallbackParams) => Promise<Uint8Array | null>;
  tryFallback: (
    params: MascotArtFallbackParams,
    runId: string,
    model: string,
    tier: 1 | 2,
  ) => Promise<Uint8Array | null>;
  normalizeAndMat: (raw: Uint8Array) => Promise<{ mattedBytes: Uint8Array; rawBytes: Uint8Array }>;
  executeFallbackArt: () => Promise<{ mattedBytes: Uint8Array; rawBytes: Uint8Array }>;
}

/**
 * Executes green-screen aware AI image generation with bounded retries and prompt reinforcement.
 * Rejects native transparency or non-green chroma backgrounds.
 * Throws a descriptive error if all generation attempts fail green-screen validation.
 */
export async function generateWithGreenScreenRetry(
  params: MascotArtFallbackParams,
  isPrimaryEnabled: boolean,
  isFallbackConfigured: boolean,
  fallbackModels: { level1: string; level2: string },
  helpers: GreenScreenGenerationHelpers,
): Promise<{
  mattedBytes: Uint8Array;
  rawBytes: Uint8Array;
  placeholder: boolean;
}> {
  const { prompt, options = {}, logger, logContext = {}, actionLabel = "mascot art" } = params;
  const maxRetries = options.maxGreenScreenRetries ?? 2;
  const maxAttempts = 1 + Math.max(0, maxRetries);
  const targetComposition = options.composition ?? (options.aspectRatio === "16:9" ? "16:9" : "1:1");

  // If no AI generation is enabled or configured, execute procedural fallback directly
  if (!isPrimaryEnabled && !isFallbackConfigured) {
    options.cancellationSignal?.throwIfAborted();
    const result = await helpers.executeFallbackArt();
    return { ...result, placeholder: true };
  }

  let currentPrompt = prompt;
  let validatedRaw: Uint8Array | null = null;
  let lastValidation: GreenScreenValidationResult | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    options.cancellationSignal?.throwIfAborted();

    const attemptIdempotencyKey = options.idempotencyKey
      ? attempt === 0
        ? options.idempotencyKey
        : `${options.idempotencyKey}_gs_retry_${attempt}`
      : undefined;

    const attemptParams: MascotArtFallbackParams = {
      ...params,
      prompt: currentPrompt,
      options: {
        ...options,
        background: "opaque",
        idempotencyKey: attemptIdempotencyKey,
      },
    };

    // 1. Try primary provider
    let candidate = await helpers.tryPrimary(attemptParams);
    options.cancellationSignal?.throwIfAborted();

    // 2. Try fallback Level 1 if primary failed due to network/API error
    if (!candidate && isFallbackConfigured) {
      const fallbackRunId = attemptIdempotencyKey || createImgStudioRunId();
      candidate = await helpers.tryFallback(attemptParams, fallbackRunId, fallbackModels.level1, 1);
    }

    // 3. Try fallback Level 2 if Level 1 failed
    if (!candidate && isFallbackConfigured) {
      logger?.warn(
        `ImgStudio Level 1 failed for ${actionLabel} (attempt ${attempt + 1}/${maxAttempts}). Starting Level 2 with ${describeImgStudioModel(fallbackModels.level2)}.`,
        { ...logContext, step: "IMAGE_FALLBACK_L2_TRIGGERED" },
      );
      const fallbackRunId = attemptIdempotencyKey || createImgStudioRunId();
      candidate = await helpers.tryFallback(attemptParams, fallbackRunId, fallbackModels.level2, 2);
    }

    // 4. Validate green-screen compliance if candidate image exists
    if (candidate) {
      const validation = await validateGeneratedGreenScreen(candidate, targetComposition);
      if (validation.isValid) {
        validatedRaw = candidate;
        break;
      }

      lastValidation = validation;
      logger?.warn(
        `Green-screen validation failed for ${actionLabel} (attempt ${attempt + 1}/${maxAttempts}, reason: ${validation.reason}, greenRatio: ${validation.greenRatio}, isTransparent: ${validation.isTransparent}). ${attempt + 1 < maxAttempts ? "Retrying with reinforced green-screen prompt tags..." : "Max retries exhausted."}`,
        {
          ...logContext,
          attempt: attempt + 1,
          maxAttempts,
          reason: validation.reason,
          greenRatio: validation.greenRatio,
          isTransparent: validation.isTransparent,
          step: "GREEN_SCREEN_VALIDATION_FAILED",
        },
      );

      // Reinforce prompt for subsequent retry attempt
      currentPrompt = reinforcePromptWithGreenScreen(currentPrompt);
    }
  }

  // Succeeded: candidate passed green screen validation
  if (validatedRaw) {
    options.cancellationSignal?.throwIfAborted();
    const result = await helpers.normalizeAndMat(validatedRaw);
    return { ...result, placeholder: false };
  }

  // Failed: candidate images were produced, but all failed green screen validation
  if (lastValidation) {
    throw new Error(
      `Green-screen validation failed for ${actionLabel} after ${maxAttempts} attempts (reason: ${lastValidation.reason}, greenRatio: ${lastValidation.greenRatio}, isTransparent: ${lastValidation.isTransparent})`,
    );
  }

  // All AI providers failed network/API requests without generating any image candidate
  options.cancellationSignal?.throwIfAborted();
  const fallbackResult = await helpers.executeFallbackArt();
  return { ...fallbackResult, placeholder: true };
}
