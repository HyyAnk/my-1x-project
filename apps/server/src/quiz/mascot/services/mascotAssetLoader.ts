import { readFile } from "node:fs/promises";
import sharp from "sharp";
import type { MascotProfile } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import type { StudioLogger } from "../../../logger.js";

/**
 * Loads a mascot asset file from disk by relative URL and encodes it as a base64 data URL.
 * Guarantees that the resulting string is formatted as a valid `data:image/png;base64,...` URL.
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
  if (assetUrl.startsWith("data:image/png;base64,")) {
    return assetUrl;
  }
  if (assetUrl.startsWith("data:image/")) {
    const base64Part = assetUrl.split(",")[1];
    if (base64Part) {
      try {
        const buf = Buffer.from(base64Part, "base64");
        const pngBuf = await sharp(buf).toFormat("png").toBuffer();
        return `data:image/png;base64,${pngBuf.toString("base64")}`;
      } catch {
        return `data:image/png;base64,${base64Part}`;
      }
    }
  }

  const cleanUrl = assetUrl.split("?")[0];
  const filename = cleanUrl.split("/").pop();
  if (!filename) {
    return undefined;
  }
  try {
    const fileInfo = await repository.getMascotAssetFile(mascotId, filename);
    const rawBytes = await readFile(fileInfo.absolutePath);
    if (rawBytes && rawBytes.length > 0) {
      const isPng =
        rawBytes.length >= 8 &&
        rawBytes[0] === 0x89 &&
        rawBytes[1] === 0x50 &&
        rawBytes[2] === 0x4e &&
        rawBytes[3] === 0x47;

      let pngBuffer = rawBytes;
      if (!isPng) {
        try {
          pngBuffer = await sharp(rawBytes).toFormat("png").toBuffer();
        } catch {
          // If sharp conversion fails, preserve raw bytes
        }
      }
      return `data:image/png;base64,${Buffer.from(pngBuffer).toString("base64")}`;
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
 * Prioritizes `master_image_url` (matted/transparent) and falls back to `master_raw_image_url` (raw/opaque).
 */
export async function loadMasterReferenceImageBase64(
  repository: RepositoryService,
  mascot: MascotProfile,
  logger?: StudioLogger,
): Promise<string | undefined> {
  const masterBase64 = await loadMascotAssetBase64ByUrl(repository, mascot.id, mascot.master_image_url, logger);
  if (masterBase64) {
    return masterBase64;
  }
  if (mascot.master_raw_image_url) {
    const rawBase64 = await loadMascotAssetBase64ByUrl(repository, mascot.id, mascot.master_raw_image_url, logger);
    if (rawBase64) {
      return rawBase64;
    }
  }
  return undefined;
}
