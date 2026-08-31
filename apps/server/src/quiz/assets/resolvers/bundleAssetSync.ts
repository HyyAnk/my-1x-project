import { readFile } from "node:fs/promises";
import type { RepositoryService } from "../../../repository.js";

export async function syncHeroImageToBundle(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  bundleNumber: number,
  generatedAssetPath: string,
): Promise<void> {
  if (bundleNumber <= 0) return;
  try {
    const resolvedPath = await repository.resolveQuizAssetPath(channelId, episodeId, generatedAssetPath);
    const imageBytes = new Uint8Array(await readFile(resolvedPath));
    await repository.writeBundleImage(channelId, episodeId, bundleNumber, imageBytes);
  } catch {
    // Non-critical background sync
  }
}
