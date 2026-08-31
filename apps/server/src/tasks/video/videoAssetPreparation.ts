import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  resolveQuizLayout,
  type DirectorPlan,
  type MascotRenderAspectRatio,
  type QuizAssetPlan,
  type QuizAssetResolution,
  type QuizPreviewLayoutId,
  type QuizV2,
} from "@studio/shared";
import { resolveQuizAssets } from "../../quiz/assets/resolveQuizAssets.js";
import type { TaskManagerRuntime } from "../runtime.js";
import { optimizeRenderImage } from "./imageOptimizer.js";

export interface PrepareVideoAssetsOptions {
  runtime: TaskManagerRuntime;
  channelId: string;
  episodeId: string;
  renderRoot: string;
  assetPlan: QuizAssetPlan;
  assetResolution: QuizAssetResolution | null;
  quiz: QuizV2;
  director: DirectorPlan;
  aspectRatio: MascotRenderAspectRatio;
  onProgress: (message: string, percent: number) => Promise<void>;
}

export interface PrepareVideoAssetsResult {
  assetResolution: QuizAssetResolution;
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
        const targetPath = path.join(renderAssetDirectory, renderFilename);
        const requirement = assetPlan.assets.find((r) => r.asset_id === asset.asset_id);
        const layout = resolveAssetLayout(options.quiz, options.director, requirement?.question_id, options.aspectRatio);
        await optimizeRenderImage({
          sourcePath,
          targetPath,
          purpose: requirement?.purpose,
          layout,
        });
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

function resolveAssetLayout(
  quiz: QuizV2,
  director: DirectorPlan,
  questionId: string | null | undefined,
  aspectRatio: MascotRenderAspectRatio,
): QuizPreviewLayoutId | undefined {
  if (!questionId) return undefined;
  const question = quiz.questions.find((candidate) => candidate.id === questionId);
  const beat = director.beats.find((candidate) => candidate.question_id === questionId);
  if (!question || !beat) return undefined;
  const resolution = resolveQuizLayout({
    requestedLayout: beat.layout_id,
    archetype: beat.archetype,
    questionFormat: question.format,
    choiceCount: question.choices.length,
    aspectRatio,
  });
  return resolution.ok ? resolution.layoutId : undefined;
}
