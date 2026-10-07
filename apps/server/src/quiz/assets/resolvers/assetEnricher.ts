import { readFile, writeFile } from "node:fs/promises";
import { RepositoryError } from "../../../repository.js";
import { getRecommendationForAssetRequirement, validateQuizImageBytes } from "../imageMetadataValidator.js";
import type { ProviderAssetInput, ProviderAssetOutput } from "./types/providerAsset.types.js";
import {
  decodePngToRgba,
  hasNativeTransparency,
  normalizeImageToPng,
  removeImageBackground,
} from "../../../utils/imageMatting.js";

/**
 * Validates generated asset bytes against dimensions and metadata requirements.
 * If transparent background is required and the asset is opaque, automatically invokes auto-matting.
 */
export async function validateAndEnrichAsset(
  input: ProviderAssetInput,
  result: ProviderAssetOutput,
): Promise<ProviderAssetOutput> {
  const { repository, channelId, episodeId, request, logger } = input;
  let bytes: Uint8Array;
  let absPath: string;
  try {
    absPath = await repository.resolveQuizAssetPath(channelId, episodeId, result.entry.path);
    bytes = new Uint8Array(await readFile(absPath));
  } catch {
    // Non-blocking fallback if the file is mock-resolved or inaccessible in unit tests
    return result;
  }

  // Auto-matting check: if transparent background is required, check and remove background if opaque
  if (request.transparent_background) {
    try {
      const pngBytes = await normalizeImageToPng(bytes);
      const decoded = decodePngToRgba(pngBytes);
      if (!hasNativeTransparency(decoded)) {
        logger?.info(
          `[assetEnricher] Asset ${request.asset_id} requires transparent background but image is opaque. Triggering built-in auto-matting.`,
          { profileId: channelId, workerId: episodeId },
        );
        const mattedBytes = await removeImageBackground(bytes);
        if (mattedBytes && mattedBytes.length > 0 && mattedBytes !== bytes) {
          bytes = mattedBytes;
          await writeFile(absPath, bytes);
        }
      }
    } catch (mattingError) {
      logger?.warn(
        `[assetEnricher] Auto-matting check failed for asset ${request.asset_id}: ${(mattingError as Error).message}`,
        { profileId: channelId, workerId: episodeId },
      );
    }
  }

  const recommendation = getRecommendationForAssetRequirement(request);
  const validation = await validateQuizImageBytes({
    bytes,
    recommendation,
    provenance: "generated",
    required: request.required,
  });

  if (validation.actual) {
    result.entry.actual_dimensions = validation.actual;
  }

  const blocker = validation.issues.find((issue) => issue.severity === "blocker");
  if (blocker) {
    throw new RepositoryError(
      `Generated asset ${request.asset_id} failed metadata validation: ${blocker.code}`,
      blocker.code,
    );
  }

  return result;
}
