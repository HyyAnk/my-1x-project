import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  resolveQuizLayout,
  type DirectorPlan,
  type MascotRenderAspectRatio,
  type QuizAssetPlan,
  type QuizAssetResolution,
  type QuizIssue,
  type QuizPreviewLayoutId,
  type QuizV2,
} from "@studio/shared";
import { RepositoryError } from "../../repository.js";
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
  signal: AbortSignal;
  onProgress: (message: string, percent: number) => Promise<void>;
}

export interface PrepareVideoAssetsResult {
  assetResolution: QuizAssetResolution;
  assetSources: Record<string, string>;
}

function throwForAssetBlockers(issues: QuizIssue[]): void {
  const blockers = issues.filter((issue) => issue.severity === "blocker");
  if (blockers.length === 0) return;

  const detail = blockers.map((issue) => issue.message).join(" | ");
  throw new RepositoryError(`Quiz asset generation blocked video preparation: ${detail}`, "QUIZ_ASSET_GENERATION_FAILED");
}

export async function prepareVideoAssets(options: PrepareVideoAssetsOptions): Promise<PrepareVideoAssetsResult> {
  const { runtime, channelId, episodeId, renderRoot, assetPlan, onProgress, signal } = options;
  signal.throwIfAborted();
  let assetResolution = options.assetResolution;

  if (!assetResolution) {
    await onProgress("Quiz · preparing visual assets", 10);
    const result = await resolveQuizAssets({
      repository: runtime.repository,
      channelId,
      episodeId,
      plan: assetPlan,
      activeEngine: runtime.activeEngine,
      antigravityClient: runtime.antigravity,
      imageConfig: {
        api_key: runtime.imageConfig.api_key,
        model: runtime.imageConfig.model,
        provider: runtime.imageConfig.provider,
        base_url: runtime.imageConfig.base_url,
        quality: runtime.imageConfig.quality,
      },
      imageFallbackConfig: runtime.imageFallbackConfig,
      cancellationSignal: signal,
    });
    throwForAssetBlockers(result.issues);
    signal.throwIfAborted();
    assetResolution = result.resolution;
  }

  // HyperFrames only discovers local media inside the composition directory.
  signal.throwIfAborted();
  const renderAssetDirectory = path.join(renderRoot, "quiz-images");
  await mkdir(renderAssetDirectory, { recursive: true });

  const resolvedAssetEntries: Array<readonly [string, string] | null> = await Promise.all(
    (assetResolution?.assets ?? []).map(async (asset) => {
      signal.throwIfAborted();
      const requirement = assetPlan.assets.find((r) => r.asset_id === asset.asset_id);
      try {
        const sourcePath = await runtime.repository.resolveQuizAssetPath(channelId, episodeId, asset.path);
        const extension = path.extname(sourcePath) || ".png";
        const renderFilename = `${asset.asset_id}${extension}`;
        const targetPath = path.join(renderAssetDirectory, renderFilename);
        const layout = resolveAssetLayout(options.quiz, options.director, requirement?.question_id, options.aspectRatio);
        const optResult = await optimizeRenderImage({
          sourcePath,
          targetPath,
          purpose: requirement?.purpose,
          layout,
          maxWidth: requirement?.sizing?.recommended_width,
          maxHeight: requirement?.sizing?.recommended_height,
          sourceFingerprint: asset.fingerprint,
        });
        if (optResult.renderIdentity) {
          (asset as { renderIdentity?: string }).renderIdentity = optResult.renderIdentity;
        }
        return [asset.asset_id, `./quiz-images/${renderFilename}`] as const;
      } catch (error) {
        if (signal.aborted) throw error;
        if (requirement?.required) {
          throw new Error(
            `Required render asset "${asset.asset_id}" failed preparation for episode ${episodeId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
            { cause: error },
          );
        }
        console.warn(
          `[videoAssetPreparation] Failed to prepare render asset "${asset.asset_id}" for episode ${episodeId}; it will be missing from the render:`,
          error instanceof Error ? error.message : error,
        );
        return null;
      }
    }),
  );

  const assetSources: Record<string, string> = Object.fromEntries(
    resolvedAssetEntries.filter((entry): entry is readonly [string, string] => entry !== null),
  );
  signal.throwIfAborted();

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
