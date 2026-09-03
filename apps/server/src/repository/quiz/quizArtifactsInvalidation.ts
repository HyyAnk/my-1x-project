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
  // Style activation invalidates generated video outputs, but leaves source artifacts intact.
  const shouldInvalidateRender = stages.includes("render") || stages.includes("style");
  const hasQuizV2Artifact = shouldInvalidateRender ? Boolean(await this.readQuiz(channelId, episodeId)) : false;

  for (const stage of stages) {
    const filename = filenames[stage];
    if (!filename) continue;
    const target = await this.quizArtifactTarget(channelId, episodeId, filename);
    await rm(target.absolutePath, { force: true });
    removed.push(target.relativePath);
  }

  if (shouldInvalidateRender && hasQuizV2Artifact) {
    const episode = await this.getEpisode(channelId, episodeId);
    const channel = await this.getChannel(channelId);
    const assetsDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
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
      updated_at: nowIso(),
    });
    await this.writeJsonAtomic(this.resolvePath("channels", channel.slug, "episodes", episode.slug, "episode.json"), next);
  }

  return removed;
}
