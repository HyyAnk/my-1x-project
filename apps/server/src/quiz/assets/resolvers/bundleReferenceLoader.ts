import { readFile } from "node:fs/promises";
import type { RepositoryService } from "../../../repository.js";

export interface LoadBundleReferenceParams {
  repository: RepositoryService;
  channelId: string;
  episodeId: string;
  bundleNumber: number;
  readBinary?: (path: string) => Promise<Uint8Array | Buffer>;
}

/**
 * Loads a continuity bundle reference image (CB-XX.png) as a base64 string if available.
 * Used to anchor subsequent choice assets or scene assets to the question's master visual anchor.
 */
export async function loadBundleReferenceImageBase64(params: LoadBundleReferenceParams): Promise<string | undefined> {
  const { repository, channelId, episodeId, bundleNumber, readBinary = readFile } = params;
  if (bundleNumber <= 0) return undefined;

  try {
    const bundleTarget = await repository.getBundleImagePath(channelId, episodeId, bundleNumber);
    const bundleFile = await repository
      .getBundleImageFile(channelId, episodeId, bundleTarget.filename)
      .catch(() => null);

    if (bundleFile?.absolutePath) {
      const bytes = await readBinary(bundleFile.absolutePath);
      if (bytes && bytes.length > 0) {
        return Buffer.from(bytes).toString("base64");
      }
    }
  } catch {
    // Non-critical reference loading: if bundle image is absent or unreadable, proceed without it.
  }

  return undefined;
}
