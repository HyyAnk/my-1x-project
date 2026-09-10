import { rm } from "node:fs/promises";
import path from "node:path";
import { EpisodeSchema, nowIso } from "@studio/shared";
import type { RepositoryRuntime } from "../runtime.js";

export async function invalidateQuizArtifacts(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  stages: string[],
): Promise<string[]> {
  // Serialized per episode so concurrent pipeline stages (e.g. assets + voice) cannot
  // interleave artifact removals or the episode.json read-modify-write below.
  return this.queueEpisodeArtifactMutation(channelId, episodeId, () =>
    invalidateQuizArtifactsLocked.call(this, channelId, episodeId, stages),
  );
}

async function invalidateQuizArtifactsLocked(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  stages: string[],
): Promise<string[]> {
  const filenames: Record<
    string,
    "quiz-v2.json" | "director-plan.json" | "asset-plan.json" | "asset-resolution.json" | "voice-plan.json" | "timeline.json" | "qa.json"
  > = {
    quiz: "quiz-v2.json",
    director: "director-plan.json",
    assets: "asset-plan.json",
    asset_resolution: "asset-resolution.json",
    voice: "voice-plan.json",
    timeline: "timeline.json",
    qa: "qa.json",
  };
  const removed: string[] = [];
  const shouldDestroyRender = stages.includes("render");
  const shouldMarkStyleStale = stages.includes("style") && !shouldDestroyRender;
  const hasQuizV2Artifact = shouldDestroyRender || shouldMarkStyleStale ? Boolean(await this.readQuiz(channelId, episodeId)) : false;

  for (const stage of stages) {
    const filename = filenames[stage];
    if (!filename) continue;
    const target = await this.quizArtifactTarget(channelId, episodeId, filename);
    await rm(target.absolutePath, { force: true });
    removed.push(target.relativePath);
  }

  if (hasQuizV2Artifact) {
    const episode = await this.getEpisode(channelId, episodeId);
    const channel = await this.getChannel(channelId);
    if (shouldDestroyRender) {
      await destroyRenderArtifacts(this, channel, episode);
    } else if (shouldMarkStyleStale) {
      await markRenderStale(this, channel, episode);
    }
  }

  return removed;
}

async function destroyRenderArtifacts(
  runtime: RepositoryRuntime,
  channel: { slug: string; channel_id: string },
  episode: { slug: string; stage: string; video_asset_path: string | null },
): Promise<void> {
  const assetsDirectory = runtime.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
  const videoFilename = episode.video_asset_path ? path.basename(episode.video_asset_path) : "quiz-video.mp4";
  if (/^[a-z0-9][a-z0-9._-]*\.mp4$/i.test(videoFilename)) {
    await rm(path.join(assetsDirectory, videoFilename), { force: true });
  }
  await rm(path.join(assetsDirectory, "render-manifest.json"), { force: true });
  const next = EpisodeSchema.parse({
    ...episode,
    stage: episode.stage === "VIDEO_READY" ? "SCENE_READY" : episode.stage,
    video_asset_path: null,
    video_generated_at: null,
    video_duration_seconds: null,
    render_manifest_path: null,
    render_stale: false,
    updated_at: nowIso(),
  });
  await runtime.writeJsonAtomic(runtime.resolvePath("channels", channel.slug, "episodes", episode.slug, "episode.json"), next);
  runtime.entityIdResolver.setEpisodeSlug(channel.channel_id, next.episode_id, next.slug);
}

async function markRenderStale(
  runtime: RepositoryRuntime,
  channel: { slug: string; channel_id: string },
  episode: { slug: string; stage: string; video_asset_path: string | null; render_stale?: boolean },
): Promise<void> {
  if (!episode.video_asset_path || episode.render_stale) return;
  const next = EpisodeSchema.parse({
    ...episode,
    render_stale: true,
    updated_at: nowIso(),
  });
  await runtime.writeJsonAtomic(runtime.resolvePath("channels", channel.slug, "episodes", episode.slug, "episode.json"), next);
  runtime.entityIdResolver.setEpisodeSlug(channel.channel_id, next.episode_id, next.slug);
}
