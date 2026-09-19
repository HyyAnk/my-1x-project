import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Channel, Episode, MascotProfile, QuizAssetResolution, Scene } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import type { TaskManagerRuntime } from "../runtime.js";
import { renderSourceFingerprint } from "../fingerprints.js";
import { loadRequiredQuizRenderArtifacts } from "./quizRenderArtifacts.js";
import { prepareLocalizedMascot } from "./mascotLocalization.js";
import { prepareSoundtrack } from "./soundtrackPreparation.js";
import { prepareVideoAssets } from "./videoAssetPreparation.js";
import { syncStaticMediaAssets } from "./videoStaticAssets.js";
import { ensureCurrentAssetSizing, validateQuizPreflight, type QuizPreflightAssessment } from "./quizPreflightValidator.js";
import { resolveAndCopyIntroOutro, type IntroOutroMediaResolution } from "./introOutroMediaResolver.js";
import { writeCompositionFiles } from "./compositionFileWriter.js";
import { pinEpisodeStyleRevision } from "./episodeStylePinning.js";
import { compileCompositionHtml } from "./compositionHtmlCompiler.js";

export {
  resolveAndCopyIntroOutro,
  validateQuizPreflight,
  writeCompositionFiles,
  pinEpisodeStyleRevision,
  type IntroOutroMediaResolution,
  type QuizPreflightAssessment,
};

export type VideoCompositionContext = {
  renderRoot: string;
  compositionPath: string;
  outputPath: string;
  checkpointPath: string;
  sourceFingerprint: string;
  html: string;
  selectedBgmTrackId: string | null;
  selectedBgmFilename: string | null;
  assetResolution: QuizAssetResolution | null;
  preflightAssessment: QuizPreflightAssessment;
};

export async function prepareVideoComposition(options: {
  runtime: TaskManagerRuntime;
  repository: RepositoryService;
  taskId: string;
  signal: AbortSignal;
  channel: Channel;
  episode: Episode;
  scenes: Scene[];
  renderAspectRatio: "16:9" | "9:16" | "1:1";
  onProgress: (message: string, percent: number) => Promise<void>;
}): Promise<VideoCompositionContext> {
  const { runtime, repository, channel, scenes, renderAspectRatio, onProgress } = options;

  const artifacts = await loadRequiredQuizRenderArtifacts(repository, channel.channel_id, options.episode.episode_id);
  await ensureCurrentAssetSizing(repository, channel.channel_id, options.episode.episode_id, artifacts);
  const episode = await pinEpisodeStyleRevision(repository, channel, options.episode);

  const narration = await repository.getEpisodeAudioFile(
    channel.channel_id,
    episode.episode_id,
    path.basename(episode.narration_asset_path!),
  );
  const renderRoot = repository.resolvePath("runtime", "hyperframes", episode.episode_id);
  await mkdir(renderRoot, { recursive: true });
  const compositionPath = path.join(renderRoot, "index.html");
  const outputPath = path.join(renderRoot, "quiz-video.mp4");
  const renderAudioPath = path.join(renderRoot, "narration.wav");
  await copyFile(narration.absolutePath, renderAudioPath);

  const mascotAspectRatio = renderAspectRatio === "9:16" ? "9:16" : "16:9";
  const initialAssetResolution = await repository.readQuizAssetResolution(channel.channel_id, episode.episode_id);
  const { assetResolution, assetSources } = await prepareVideoAssets({
    runtime,
    channelId: channel.channel_id,
    episodeId: episode.episode_id,
    renderRoot,
    assetPlan: artifacts.assetPlan,
    assetResolution: initialAssetResolution,
    quiz: artifacts.quiz,
    director: artifacts.director,
    aspectRatio: mascotAspectRatio,
    signal: options.signal,
    onProgress,
  });

  const preflightAssessment = await validateQuizPreflight(
    repository,
    channel.channel_id,
    episode.episode_id,
    artifacts,
    assetResolution?.assets ?? [],
    episode.narration_duration_seconds !== null,
  );

  const bgmHistory = await repository.readBgmHistory(channel.channel_id);
  const mascotProfile: MascotProfile | null = await prepareLocalizedMascot(channel, repository, renderRoot);
  const introOutro = await resolveAndCopyIntroOutro(repository, channel, episode, renderRoot);

  const { selectedBgmTrackId, selectedBgmFilename } = await prepareSoundtrack({
    renderRoot,
    narration,
    timeline: artifacts.timeline,
    episode,
    bgmHistory,
    assetSources,
    introOutro,
    onProgressMessage: async (message) => onProgress(message, 15),
  });

  const renderFps = runtime.videoConfig?.fps ?? 30;

  const { html, compositionFiles } = await compileCompositionHtml({
    artifacts,
    channel,
    episode,
    scenes,
    renderAspectRatio,
    renderFps,
    assetSources,
    bgmHistory,
    mascotProfile,
    introOutro,
  });

  await writeCompositionFiles(renderRoot, compositionPath, html, compositionFiles);

  const { fontFingerprints } = await syncStaticMediaAssets(renderRoot, repository.rootDirectory);
  const sourceFingerprint = renderSourceFingerprint(
    html,
    narration.modified_at,
    narration.size,
    assetResolution?.assets ?? [],
    fontFingerprints,
    compositionFiles ?? {},
  );
  const checkpointPath = path.join(renderRoot, "render-checkpoint.json");

  return {
    renderRoot,
    compositionPath,
    outputPath,
    checkpointPath,
    sourceFingerprint,
    html,
    selectedBgmTrackId,
    selectedBgmFilename,
    assetResolution,
    preflightAssessment,
  };
}
