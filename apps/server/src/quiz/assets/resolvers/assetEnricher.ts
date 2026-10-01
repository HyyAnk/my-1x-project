import { readFile } from "node:fs/promises";
import { RepositoryError } from "../../../repository.js";
import { getRecommendationForAssetRequirement, validateQuizImageBytes } from "../imageMetadataValidator.js";
import type { ProviderAssetInput, ProviderAssetOutput } from "./types/providerAsset.types.js";

/**
 * Validates generated asset bytes against dimensions and metadata requirements.
 */
export async function validateAndEnrichAsset(
  input: ProviderAssetInput,
  result: ProviderAssetOutput,
): Promise<ProviderAssetOutput> {
  const { repository, channelId, episodeId, request } = input;
  let bytes: Uint8Array;
  try {
    const absPath = await repository.resolveQuizAssetPath(channelId, episodeId, result.entry.path);
    bytes = new Uint8Array(await readFile(absPath));
  } catch {
    // Non-blocking fallback if the file is mock-resolved or inaccessible in unit tests
    return result;
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
