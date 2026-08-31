import { readFile } from "node:fs/promises";
import { nowIso, type Episode, type QuizAssetResolution } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import type { inspectRenderedVideo } from "../../quiz/qa/postRenderQa.js";
import type { preflightQuizRender } from "../../quiz/qa/preflight.js";

export async function persistVideoRenderArtifacts(options: {
  repository: RepositoryService;
  channelId: string;
  episodeId: string;
  episode: Episode;
  outputPath: string;
  html: string;
  duration: number;
  renderAspectRatio: "16:9" | "9:16" | "1:1";
  renderCanvas: { width: number; height: number };
  fps: number;
  selectedBgmTrackId: string | null;
  selectedBgmFilename: string | null;
  assetResolution: QuizAssetResolution | null;
  completeQuizV2: boolean;
  preflightAssessment: ReturnType<typeof preflightQuizRender>["assessment"] | null;
  probe: Awaited<ReturnType<typeof inspectRenderedVideo>>;
}): Promise<{ videoPath: string; manifestPath: string }> {
  const {
    repository,
    channelId,
    episodeId,
    episode,
    outputPath,
    html,
    duration,
    renderAspectRatio,
    renderCanvas,
    fps,
    assetResolution,
    completeQuizV2,
    preflightAssessment,
    probe,
  } = options;

  let bgmFilename = options.selectedBgmFilename;
  let bgmTrackId = options.selectedBgmTrackId;

  if (!bgmFilename) {
    const bgmMatch = html.match(/src=["']\.\/bgm\/([^"']+)["']/);
    bgmFilename = bgmMatch ? bgmMatch[1] : null;
    bgmTrackId = bgmFilename ? bgmFilename.replace(/\.mp3$/i, "") : null;
  }

  const degradedAssets = (assetResolution?.assets ?? []).filter((a) => a.degraded || a.fallback_tier === 3 || a.source === "fallback");
  const hasDegradedFallback = degradedAssets.length > 0;

  const manifestPath = await repository.writeRenderManifest(
    channelId,
    episodeId,
    JSON.stringify({
      engine: "hyperframes",
      quiz_engine_version: completeQuizV2 ? 2 : 1,
      schema_version: completeQuizV2 ? 2 : 1,
      composition: "runtime/hyperframes/" + episode.episode_id + "/index.html",
      source_fingerprints: {},
      question_count: episode.quiz_config.question_count,
      format: episode.quiz_config.quiz_format,
      duration_seconds: Number(duration.toFixed(3)),
      aspect_ratio: renderAspectRatio,
      resolution: { width: renderCanvas.width, height: renderCanvas.height },
      fps,
      bgm_track_id: bgmTrackId ?? undefined,
      bgm_filename: bgmFilename ?? undefined,
      degraded: hasDegradedFallback,
      fallback_tier: hasDegradedFallback ? 3 : undefined,
      degraded_assets: hasDegradedFallback ? degradedAssets.map((a) => a.asset_id) : undefined,
      preflight: preflightAssessment
        ? {
            status: "passed",
            score: preflightAssessment.score,
            blockers: preflightAssessment.issues.filter((issue) => issue.severity === "blocker").length,
          }
        : { status: "legacy_skipped" },
      check: { status: "passed" },
      render: { status: "passed", output: "quiz-video.mp4" },
      post_render: {
        status: "passed",
        issues: probe.issues.length,
        streams:
          probe.probe.streams?.map((stream) => ({
            codec_type: stream.codec_type,
            width: stream.width,
            height: stream.height,
            r_frame_rate: stream.r_frame_rate,
          })) ?? [],
      },
      generated_at: nowIso(),
    }),
  );

  const videoPath = await repository.writeVideoArtifact(channelId, episodeId, await readFile(outputPath));
  await repository.saveVideoMetadata(channelId, episodeId, videoPath, Number(duration.toFixed(3)), manifestPath);

  return { videoPath, manifestPath };
}
