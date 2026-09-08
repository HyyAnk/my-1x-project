import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { EpisodeSchema, type Channel, type Episode, type MascotProfile, type QuizAssetResolution, type Scene, type IntroOutroTransitionType } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../repository.js";
import { buildQuizComposition } from "../../quiz/render/buildComposition.js";
import { preflightQuizRender } from "../../quiz/qa/preflight.js";
import { prepareLocalizedMascot } from "./mascotLocalization.js";
import { prepareSoundtrack } from "./soundtrackPreparation.js";
import { prepareVideoAssets } from "./videoAssetPreparation.js";
import { prepareQuizVideoRender } from "./quizVideoRenderPreparation.js";
import { syncStaticMediaAssets } from "./videoStaticAssets.js";
import { renderSourceFingerprint } from "../fingerprints.js";
import type { TaskManagerRuntime } from "../runtime.js";
import { getActiveStyleSnapshot } from "../../quiz/visual/styleModules/activation.js";

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
  completeQuizV2: boolean;
  preflightAssessment: ReturnType<typeof preflightQuizRender>["assessment"] | null;
};

async function validateQuizPreflight(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  artifacts: {
    quiz: NonNullable<Awaited<ReturnType<RepositoryService["readQuiz"]>>>;
    director: NonNullable<Awaited<ReturnType<RepositoryService["readDirectorPlan"]>>>;
    assetPlan: NonNullable<Awaited<ReturnType<RepositoryService["readAssetPlan"]>>>;
    voicePlan: NonNullable<Awaited<ReturnType<RepositoryService["readVoicePlan"]>>>;
    timeline: NonNullable<Awaited<ReturnType<RepositoryService["readQuizTimeline"]>>>;
  },
  resolvedAssets: QuizAssetResolution["assets"],
  hasMeasuredAudio: boolean,
) {
  const preflight = preflightQuizRender({
    quiz: artifacts.quiz,
    director: artifacts.director,
    assetPlan: artifacts.assetPlan,
    resolvedAssets,
    voicePlan: artifacts.voicePlan,
    timeline: artifacts.timeline,
    measuredAudio: hasMeasuredAudio,
  });
  await repository.writeQuizAssessment(channelId, episodeId, preflight.assessment);
  if (!preflight.ok) {
    const blocker = preflight.assessment.issues.find((issue) => issue.severity === "blocker");
    throw new RepositoryError(
      "Quiz V2 preflight blocked render: " + (blocker?.message ?? "Resolve the reported QA blockers before rendering."),
      "QUIZ_PREFLIGHT_BLOCKED",
    );
  }
  return preflight.assessment;
}

async function writeCompositionFiles(
  renderRoot: string,
  compositionPath: string,
  html: string,
  compositionFiles: Record<string, string> = {},
): Promise<void> {
  await writeFile(compositionPath, html, "utf8");
  for (const [relativePath, content] of Object.entries(compositionFiles)) {
    const filePath = path.join(renderRoot, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
  }
}

export async function prepareVideoComposition(options: {
  runtime: TaskManagerRuntime;
  repository: RepositoryService;
  taskId: string;
  channel: Channel;
  episode: Episode;
  scenes: Scene[];
  renderAspectRatio: "16:9" | "9:16" | "1:1";
  onProgress: (message: string, percent: number) => Promise<void>;
}): Promise<VideoCompositionContext> {
  const { runtime, repository, channel, scenes, renderAspectRatio, onProgress } = options;
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

  const [quizV2, directorPlan, assetPlan, voicePlan, timeline] = await Promise.all([
    repository.readQuiz(channel.channel_id, episode.episode_id),
    repository.readDirectorPlan(channel.channel_id, episode.episode_id),
    repository.readAssetPlan(channel.channel_id, episode.episode_id),
    repository.readVoicePlan(channel.channel_id, episode.episode_id),
    repository.readQuizTimeline(channel.channel_id, episode.episode_id),
  ]);

  const completeQuizV2 =
    quizV2 && directorPlan && assetPlan && voicePlan && timeline
      ? { quiz: quizV2, director: directorPlan, assetPlan, voicePlan, timeline }
      : null;

  if (!completeQuizV2 && !episode.video_asset_path) {
    throw new RepositoryError("Quiz V2 artifacts are required before rendering a new Quiz video", "QUIZ_V2_REQUIRED");
  }

  let assetSources: Record<string, string> = {};
  let assetResolution = await repository.readQuizAssetResolution(channel.channel_id, episode.episode_id);
  if (completeQuizV2) {
    const mascotAspectRatio = renderAspectRatio === "9:16" ? "9:16" : "16:9";
    const assetPrep = await prepareVideoAssets({
      runtime,
      channelId: channel.channel_id,
      episodeId: episode.episode_id,
      renderRoot,
      assetPlan: completeQuizV2.assetPlan,
      assetResolution,
      quiz: completeQuizV2.quiz,
      director: completeQuizV2.director,
      aspectRatio: mascotAspectRatio,
      onProgress,
    });
    assetResolution = assetPrep.assetResolution;
    assetSources = assetPrep.assetSources;
  }

  let preflightAssessment: ReturnType<typeof preflightQuizRender>["assessment"] | null = null;
  if (completeQuizV2) {
    preflightAssessment = await validateQuizPreflight(
      repository,
      channel.channel_id,
      episode.episode_id,
      completeQuizV2,
      assetResolution?.assets ?? [],
      episode.narration_duration_seconds !== null,
    );
  }

  const bgmHistory = await repository.readBgmHistory(channel.channel_id);
  const mascotProfile: MascotProfile | null = await prepareLocalizedMascot(channel, repository, renderRoot);

  let selectedBgmTrackId: string | null = null;
  let selectedBgmFilename: string | null = null;

  if (completeQuizV2) {
    const soundtrackResult = await prepareSoundtrack({
      renderRoot,
      narration,
      timeline: completeQuizV2.timeline,
      episode,
      bgmHistory,
      assetSources,
      onProgressMessage: async (message) => {
        await onProgress(message, 15);
      },
    });
    selectedBgmTrackId = soundtrackResult.selectedBgmTrackId;
    selectedBgmFilename = soundtrackResult.selectedBgmFilename;
  }

  const styleId = episode.quiz_config?.intro_outro_style_id !== undefined
    ? episode.quiz_config.intro_outro_style_id
    : (channel.default_intro_outro_style_id ?? null);

  let introVideoPath: string | undefined;
  let outroVideoPath: string | undefined;
  let transitionType: IntroOutroTransitionType | undefined;

  if (styleId && styleId !== "none") {
    const style = await repository.getChannelIntroOutroStyle(channel.channel_id, styleId).catch(() => null);
    if (style) {
      const sourceIntroPath = repository.resolvePath("channels", channel.slug, "intro_outro_styles", style.style_id, "intro.mp4");
      const sourceOutroPath = repository.resolvePath("channels", channel.slug, "intro_outro_styles", style.style_id, "outro.mp4");
      const targetIntroPath = path.join(renderRoot, "intro.mp4");
      const targetOutroPath = path.join(renderRoot, "outro.mp4");

      try {
        await copyFile(sourceIntroPath, targetIntroPath);
        introVideoPath = "./intro.mp4";
      } catch {
        // Fallback if file not found
      }
      try {
        await copyFile(sourceOutroPath, targetOutroPath);
        outroVideoPath = "./outro.mp4";
      } catch {
        // Fallback if file not found
      }
      transitionType = style.transition_type;
    }
  }

  const mascotAspectRatio = renderAspectRatio === "9:16" ? "9:16" : "16:9";
  const renderFps = runtime.videoConfig?.fps ?? 30;
  const preparedQuizRender = completeQuizV2
    ? await prepareQuizVideoRender({
        channel,
        episodeQuizConfig: episode.quiz_config,
        quiz: completeQuizV2.quiz,
        director: completeQuizV2.director,
        timeline: completeQuizV2.timeline,
        scenes,
        audioPath: "./soundtrack.wav",
        premixedAudio: true,
        aspectRatio: mascotAspectRatio,
        narrationDurationSeconds: episode.narration_duration_seconds ?? undefined,
        assets: assetSources,
        bgmOptions: {
          recentTrackIds: bgmHistory.map((entry) => entry.track_id),
          seed: episode.episode_id,
        },
        mascot: mascotProfile,
        mascotConfig: channel.mascot_config,
        fps: renderFps,
        introVideoPath,
        outroVideoPath,
        transitionType,
      })
    : null;

  const html =
    preparedQuizRender?.html ??
    buildQuizComposition(episode.quiz_config, scenes, "./narration.wav", episode.narration_duration_seconds ?? undefined, {
      aspectRatio: mascotAspectRatio,
      fps: renderFps,
    });
  await writeCompositionFiles(renderRoot, compositionPath, html, preparedQuizRender?.compositionFiles);

  const { fontFingerprints } = await syncStaticMediaAssets(renderRoot, repository.rootDirectory);
  const sourceFingerprint = renderSourceFingerprint(
    html,
    narration.modified_at,
    narration.size,
    assetResolution?.assets ?? [],
    fontFingerprints,
    preparedQuizRender?.compositionFiles ?? {},
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
    completeQuizV2: Boolean(completeQuizV2),
    preflightAssessment,
  };
}

export async function pinEpisodeStyleRevision(repository: RepositoryService, channel: Channel, episode: Episode): Promise<Episode> {
  if (episode.quiz_config.style_catalog_revision) return episode;
  const next = EpisodeSchema.parse({
    ...episode,
    quiz_config: { ...episode.quiz_config, style_catalog_revision: getActiveStyleSnapshot().revision },
  });
  const writer = (repository as unknown as { writeJsonAtomic?: (target: string, value: unknown) => Promise<void> }).writeJsonAtomic;
  if (typeof writer === "function") {
    await writer.call(repository, repository.resolvePath("channels", channel.slug, "episodes", episode.slug, "episode.json"), next);
  }
  return next;
}
