import { readFile } from "node:fs/promises";
import type { QuizAssetPlan, QuizAssetResolution } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { assetFingerprint } from "./assetFingerprint.js";
import { compileQuizAssetPrompt } from "./promptCompiler.js";

export async function isQuizAssetResolutionComplete(input: {
  repository: RepositoryService;
  channelId: string;
  episodeId: string;
  plan: QuizAssetPlan;
  resolution: QuizAssetResolution | null;
  activeEngine?: "codex" | "antigravity";
}): Promise<boolean> {
  if (!input.resolution || input.resolution.episode_id !== input.episodeId) return false;
  if (input.resolution.assets.length < input.plan.assets.length) return false;
  const providerName = "gpti2";
  const consistencyGroups = new Map(input.plan.consistency_groups.map((group) => [group.group_id, group]));
  const byId = new Map(input.resolution.assets.map((asset) => [asset.asset_id, asset]));
  for (const request of input.plan.assets) {
    const compiled = compileQuizAssetPrompt(
      request,
      request.consistency_group_id ? consistencyGroups.get(request.consistency_group_id) : undefined,
    );
    const fingerprint = assetFingerprint(request, providerName, compiled.cacheVersion);
    const resolved = byId.get(request.asset_id);
    if (!resolved) return false;
    if (
      (resolved.fingerprint !== fingerprint && !resolved.path) ||
      resolved.semantic_key !== request.semantic_key ||
      !(await isValidQuizAsset(input.repository, input.channelId, input.episodeId, resolved.path))
    ) {
      return false;
    }
  }
  return true;
}

export async function isValidQuizAsset(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  assetPath: string,
): Promise<boolean> {
  try {
    const absolutePath = await repository.resolveQuizAssetPath(channelId, episodeId, assetPath);
    const data = new Uint8Array(await readFile(absolutePath));
    if (data.length < 24 || !data.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index])) {
      return false;
    }
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return view.getUint32(16) > 0 && view.getUint32(20) > 0;
  } catch {
    return false;
  }
}
