import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  resolveEffectiveMascotMediaMode,
  resolveMascotStyleIdForQuizConfig,
  type Channel,
  type Episode,
  type MascotProfile,
  type QuizAssetResolution,
  type Scene,
} from "@studio/shared";
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
import { resolveEpisodeIntroOutro } from "../../quiz/introOutro/episodeSelection.js";
import { prepareIntroOutroTiming } from "./introOutroTimingPreparation.js";
import { resolveChannelBrandIdentity } from "../../quiz/brand/channelBrandAssetResolver.js";
import { resolveEffectiveBridgeConfig, resolveBridgeChannelDisplayName } from "../../quiz/bridge/resolveBridgeConfig.js";

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
  introOutro: IntroOutroMediaResolution;
};

export function buildMascotRenderDependencies(mascot: MascotProfile | null, episode: Episode): string[] {
  if (!mascot) return [];
  const styleId = resolveMascotStyleIdForQuizConfig(mascot, episode.quiz_config);
  const selectedStyles = styleId === "cycle" ? (mascot.styles ?? []) : (mascot.styles ?? []).filter((style) => style.id === styleId);
  return [
    `mascot-profile:${mascot.id}:${mascot.updated_at}`,
    ...selectedStyles
      .map((style) => {
        const animationFingerprints = [...(style.states?.thinking ?? []), ...(style.states?.celebrate ?? [])]
          .map((variant) => `${variant.slot_index}:${variant.generation_revision ?? 0}:${variant.animation?.content_fingerprint ?? "none"}`)
          .sort()
          .join(",");
        return `mascot-style:${style.id}:${style.built_in_preset_id ?? "legacy"}:${style.style_revision ?? 1}:${animationFingerprints}`;
      })
      .sort(),
  ];
}

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

  let artifacts = await loadRequiredQuizRenderArtifacts(repository, channel.channel_id, options.episode.episode_id);
  await ensureCurrentAssetSizing(repository, channel.channel_id, options.episode.episode_id, artifacts);
  const episode = await pinEpisodeStyleRevision(repository, channel, options.episode);

  let narration = await repository.getEpisodeAudioFile(
    channel.channel_id,
    episode.episode_id,
    path.basename(episode.narration_asset_path!),
  );
  const renderRoot = repository.resolvePath("runtime", "hyperframes", episode.episode_id);
  await mkdir(renderRoot, { recursive: true });
  const { snapshot } = await resolveEpisodeIntroOutro(repository, channel, episode);
  const bridgeConfig = resolveEffectiveBridgeConfig(channel);
  const channelName = resolveBridgeChannelDisplayName(channel, bridgeConfig);
  const timing = await prepareIntroOutroTiming(repository, renderRoot, artifacts, snapshot, narration, {
    topic: episode.topic?.title,
    channelName,
    bridgeConfig,
  });
  artifacts = timing.artifacts;
  narration = { ...narration, ...timing.narration };
  episode.narration_duration_seconds = artifacts.timeline.duration_seconds;
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
  const introOutro = await resolveAndCopyIntroOutro(repository, channel, episode, renderRoot, options.taskId);

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
  const effectiveMediaMode = resolveEffectiveMascotMediaMode(channel.mascot_config, runtime.videoConfig?.mascot_media_mode);
  const brandIdentity = await resolveChannelBrandIdentity({ channel, repository, renderRoot });

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
    mascotMediaMode: effectiveMediaMode,
    brandIdentity,
  });

  await writeCompositionFiles(renderRoot, compositionPath, html, compositionFiles);

  const { fontFingerprints } = await syncStaticMediaAssets(renderRoot, repository.rootDirectory);
  const renderDependencies = [
    ...fontFingerprints,
    `mascot-media-mode:${effectiveMediaMode}`,
    ...buildMascotRenderDependencies(mascotProfile, episode),
    ...(introOutro.selectionFingerprint ? [`intro-outro:${introOutro.selectionFingerprint}`] : []),
  ];
  const sourceFingerprint = renderSourceFingerprint(
    html,
    narration.modified_at,
    narration.size,
    assetResolution?.assets ?? [],
    renderDependencies,
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
    introOutro,
  };
}
