import { readFile } from "node:fs/promises";
import type { MascotProfile } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import type { StudioLogger } from "../../../logger.js";

/**
 * Loads a mascot asset file from disk by relative URL and encodes it as a base64 data URL.
 */
export async function loadMascotAssetBase64ByUrl(
  repository: RepositoryService,
  mascotId: string,
  assetUrl?: string | null,
  logger?: StudioLogger,
): Promise<string | undefined> {
  if (!assetUrl) {
    return undefined;
  }
  const filename = assetUrl.split("/").pop();
  if (!filename) {
    return undefined;
  }
  try {
    const fileInfo = await repository.getMascotAssetFile(mascotId, filename);
    const rawBytes = await readFile(fileInfo.absolutePath);
    if (rawBytes && rawBytes.length > 0) {
      return `data:image/png;base64,${Buffer.from(rawBytes).toString("base64")}`;
    }
  } catch (err) {
    logger?.warn(`Could not load mascot asset image for reference (${assetUrl}): ${err instanceof Error ? err.message : String(err)}`, {
      profileId: mascotId,
    });
  }
  return undefined;
}

/**
 * Loads the master concept reference image base64 data URL for the given mascot.
 */
export async function loadMasterReferenceImageBase64(
  repository: RepositoryService,
  mascot: MascotProfile,
  logger?: StudioLogger,
): Promise<string | undefined> {
  return loadMascotAssetBase64ByUrl(repository, mascot.id, mascot.master_image_url, logger);
}
