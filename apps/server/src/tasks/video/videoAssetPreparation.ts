import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { QuizAssetPlan } from "@studio/shared";
import type { Repository } from "../../repository.js";
import { resolveQuizAssets } from "../../quiz/assets/resolveQuizAssets.js";
import type { TaskManagerRuntime } from "../runtime.js";

export interface PrepareVideoAssetsOptions {
  runtime: TaskManagerRuntime;
  channelId: string;
  episodeId: string;
  renderRoot: string;
  assetPlan: QuizAssetPlan;
  assetResolution: { assets: Array<{ asset_id: string; path: string; source: string }> } | null;
  onProgress: (message: string, percent: number) => Promise<void>;
}

export interface PrepareVideoAssetsResult {
  assetResolution: { assets: Array<{ asset_id: string; path: string; source: string }> };
  assetSources: Record<string, string>;
}

export async function prepareVideoAssets(options: PrepareVideoAssetsOptions): Promise<PrepareVideoAssetsResult> {
  const { runtime, channelId, episodeId, renderRoot, assetPlan, onProgress } = options;
  let assetResolution = options.assetResolution;

  if (!assetResolution) {
    await onProgress("Quiz · preparing visual assets", 10);
    assetResolution = (
      await resolveQuizAssets({
        repository: runtime.repository,
        channelId,
        episodeId,
        plan: assetPlan,
        activeEngine: runtime.activeEngine,
        antigravityClient: runtime.antigravity,
        imageConfig: { api_key: runtime.imageConfig.api_key, model: runtime.imageConfig.model },
      })
    ).resolution;
  }

  // HyperFrames only discovers local media inside the composition directory.
  const renderAssetDirectory = path.join(renderRoot, "quiz-images");
  await mkdir(renderAssetDirectory, { recursive: true });

  const resolvedAssetEntries: Array<readonly [string, string] | null> = await Promise.all(
    (assetResolution?.assets ?? []).map(async (asset) => {
      try {
        const sourcePath = await runtime.repository.resolveQuizAssetPath(channelId, episodeId, asset.path);
        const extension = path.extname(sourcePath) || ".png";
        const renderFilename = `${asset.asset_id}${extension}`;
        await copyFile(sourcePath, path.join(renderAssetDirectory, renderFilename));
        return [asset.asset_id, `./quiz-images/${renderFilename}`] as const;
      } catch {
        return null;
      }
    }),
  );

  const assetSources: Record<string, string> = Object.fromEntries(
    resolvedAssetEntries.filter((entry): entry is readonly [string, string] => entry !== null),
  );

  return {
    assetResolution,
    assetSources,
  };
}
