import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  resolveEffectiveMascotMediaMode,
  resolveMascotStyleIdForQuizConfig,
  type Channel,
  type QuizShort,
  type Scene,
} from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../repository.js";
import type { TaskManagerRuntime } from "../runtime.js";
import { renderSourceFingerprint } from "../fingerprints.js";
import { loadRequiredQuizRenderArtifacts } from "./quizRenderArtifacts.js";
import { prepareLocalizedMascot } from "./mascotLocalization.js";
import { measureMascotContentBounds } from "./mascotContentBounds.js";
import { prepareSoundtrack } from "./soundtrackPreparation.js";
import { prepareVideoAssets } from "./videoAssetPreparation.js";
import { syncStaticMediaAssets } from "./videoStaticAssets.js";
import { ensureCurrentAssetSizing, validateQuizPreflight } from "./quizPreflightValidator.js";
import { writeCompositionFiles } from "./compositionFileWriter.js";
import { buildMascotRenderDependencies, type VideoCompositionContext } from "./videoCompositionPreparer.js";
import { resolveChannelBrandIdentity } from "../../quiz/brand/channelBrandAssetResolver.js";
import { HyperframesRenderer } from "../../quiz/render/hyperframesRenderer.js";
import { buildQuizRenderStyleContext } from "../../quiz/render/quizRenderStyleContext.js";
import { findQuizShortMascotViolations } from "../../quiz/render/candyArcade/quizShortMascotInvariant.js";
import type { VideoRenderProduct } from "./videoRenderProduct.js";

export type QuizShortCompositionOptions = {
  runtime: TaskManagerRuntime;
  repository: RepositoryService;
  taskId: string;
  signal: AbortSignal;
  channel: Channel;
  product: VideoRenderProduct;
  quizShort: QuizShort;
  scenes: Scene[];
  onProgress: (message: string, percent: number) => Promise<void>;
};

const QUIZ_SHORT_ASPECT_RATIO = "9:16" as const;
const quizRenderer = new HyperframesRenderer();

/** The Quiz Short composition never carries intro or outro media. */
const NO_BOOKENDS: VideoCompositionContext["introOutro"] = {
  selectionSource: "none",
  unavailableReason: "Quiz Shorts have no intro or outro",
};

/**
 * Prepares the portrait Quiz Short composition: loads the Quiz V2 artifacts, assets, soundtrack
 * and mascot the same way Episodes do, but with no bookend resolution, no style pinning write and
 * the Quiz Short mascot invariant enforced before the HTML is written.
 */
export async function prepareQuizShortComposition(options: QuizShortCompositionOptions): Promise<VideoCompositionContext> {
  const { runtime, repository, channel, product, quizShort, scenes, onProgress } = options;
  const channelId = channel.channel_id;
  const productId = product.ref.product_id;

  const artifacts = await loadRequiredQuizRenderArtifacts(repository, channelId, product.ref);
  await ensureCurrentAssetSizing(repository, channelId, productId, artifacts);
  const narration = await repository.getEpisodeAudioFile(channelId, product.ref, path.basename(quizShort.narration_asset_path!));
  const renderRoot = repository.resolvePath("runtime", "hyperframes", productId);
  await mkdir(renderRoot, { recursive: true });
  const compositionPath = path.join(renderRoot, "index.html");
  const outputPath = path.join(renderRoot, "quiz-video.mp4");
  await copyFile(narration.absolutePath, path.join(renderRoot, "narration.wav"));

  const initialAssetResolution = await repository.readQuizAssetResolution(channelId, product.ref);
  const { assetResolution, assetSources } = await prepareVideoAssets({
    runtime,
    channelId,
    episodeId: productId,
    renderRoot,
    assetPlan: artifacts.assetPlan,
    assetResolution: initialAssetResolution,
    quiz: artifacts.quiz,
    director: artifacts.director,
    aspectRatio: QUIZ_SHORT_ASPECT_RATIO,
    signal: options.signal,
    onProgress,
  });
  const narrationDurationSeconds = quizShort.narration_duration_seconds ?? artifacts.timeline.duration_seconds;
  const preflightAssessment = await validateQuizPreflight(
    repository,
    channelId,
    productId,
    artifacts,
    assetResolution?.assets ?? [],
    quizShort.narration_duration_seconds !== null,
  );

  const bgmHistory = await repository.readBgmHistory(channelId);
  const localizedMascot = await prepareLocalizedMascot(channel, repository, renderRoot);
  const mascotProfile = localizedMascot ? await measureMascotContentBounds(localizedMascot, renderRoot) : null;
  const { selectedBgmTrackId, selectedBgmFilename } = await prepareSoundtrack({
    renderRoot,
    narration,
    timeline: artifacts.timeline,
    episode: { episode_id: productId },
    bgmHistory,
    assetSources,
    onProgressMessage: async (message) => onProgress(message, 15),
  });

  const renderFps = runtime.videoConfig?.fps ?? 30;
  const effectiveMediaMode = resolveEffectiveMascotMediaMode(channel.mascot_config, runtime.videoConfig?.mascot_media_mode);
  const brandIdentity = await resolveChannelBrandIdentity({ channel, repository, renderRoot });
  const prepared = await quizRenderer.prepare({
    productKind: "quiz_short",
    quiz: artifacts.quiz,
    director: artifacts.director,
    timeline: artifacts.timeline,
    scenes,
    audioPath: "./soundtrack.wav",
    premixedAudio: true,
    styleContext: buildQuizRenderStyleContext(channel, quizShort.quiz_config),
    aspectRatio: QUIZ_SHORT_ASPECT_RATIO,
    narrationDurationSeconds,
    assets: assetSources,
    bgmOptions: { recentTrackIds: bgmHistory.map((entry) => entry.track_id), seed: productId },
    mascot: mascotProfile,
    mascotStyleId: resolveMascotStyleIdForQuizConfig(mascotProfile, quizShort.quiz_config),
    mascotConfig: channel.mascot_config,
    fps: renderFps,
    mascotMediaMode: effectiveMediaMode,
    brandIdentity,
    topic: quizShort.topic?.title,
    channelName: brandIdentity?.channelName ?? channel.display_name,
  });
  assertMascotRevealOnly(prepared.html, prepared.compositionFiles);

  await writeCompositionFiles(renderRoot, compositionPath, prepared.html, prepared.compositionFiles);
  const { fontFingerprints } = await syncStaticMediaAssets(renderRoot, repository.rootDirectory);
  const renderDependencies = [
    ...fontFingerprints,
    `mascot-media-mode:${effectiveMediaMode}`,
    `product-kind:quiz_short`,
    ...buildMascotRenderDependencies(mascotProfile, quizShort),
  ];
  const sourceFingerprint = renderSourceFingerprint(
    prepared.html,
    narration.modified_at,
    narration.size,
    assetResolution?.assets ?? [],
    renderDependencies,
    prepared.compositionFiles,
  );

  return {
    renderRoot,
    compositionPath,
    outputPath,
    checkpointPath: path.join(renderRoot, "render-checkpoint.json"),
    sourceFingerprint,
    html: prepared.html,
    selectedBgmTrackId,
    selectedBgmFilename,
    assetResolution,
    preflightAssessment,
    introOutro: NO_BOOKENDS,
  };
}

function assertMascotRevealOnly(html: string, files: Record<string, string>): void {
  const violations = findQuizShortMascotViolations({ html, files, transitionInstances: {} });
  if (violations.length === 0) return;
  const detail = violations.map((violation) => `${violation.clipId}: ${violation.reason}`).join("; ");
  throw new RepositoryError(
    `Quiz Short mascot may only think and celebrate in question clips and appear on the score CTA (${detail})`,
    "QUIZ_SHORT_MASCOT_VISIBILITY",
  );
}
