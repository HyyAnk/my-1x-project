import { rm } from "node:fs/promises";
import path from "node:path";
import type { QuizArtifactFilename, QuizProductId, QuizProductLocation, RepositoryRuntime } from "../runtime.js";

const STAGE_FILENAMES: Record<string, QuizArtifactFilename> = {
  quiz: "quiz-v2.json",
  director: "director-plan.json",
  assets: "asset-plan.json",
  asset_resolution: "asset-resolution.json",
  voice: "voice-plan.json",
  timeline: "timeline.json",
  qa: "qa.json",
};

export async function invalidateQuizArtifacts(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  stages: string[],
): Promise<string[]> {
  // Serialized per product so concurrent pipeline stages (e.g. assets + voice) cannot
  // interleave artifact removals or the record read-modify-write below.
  return this.queueEpisodeArtifactMutation(channelId, product, () => invalidateQuizArtifactsLocked.call(this, channelId, product, stages));
}

async function invalidateQuizArtifactsLocked(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  stages: string[],
): Promise<string[]> {
  const removed: string[] = [];
  const shouldDestroyRender = stages.includes("render");
  const shouldMarkStyleStale = stages.includes("style") && !shouldDestroyRender;
  const hasQuizV2Artifact = shouldDestroyRender || shouldMarkStyleStale ? Boolean(await this.readQuiz(channelId, product)) : false;

  for (const stage of stages) {
    const filename = STAGE_FILENAMES[stage];
    if (!filename) continue;
    const target = await this.quizArtifactTarget(channelId, product, filename);
    await rm(target.absolutePath, { force: true });
    removed.push(target.relativePath);
  }

  if (hasQuizV2Artifact) {
    const location = await this.locateQuizProduct(channelId, product);
    if (shouldDestroyRender) {
      await destroyRenderArtifacts(this, location);
    } else if (shouldMarkStyleStale) {
      await markRenderStale(this, location);
    }
  }

  return removed;
}

async function destroyRenderArtifacts(runtime: RepositoryRuntime, location: QuizProductLocation): Promise<void> {
  const { record } = location;
  const assetsDirectory = path.join(location.directory, "assets");
  const videoFilename = record.video_asset_path ? path.basename(record.video_asset_path) : "quiz-video.mp4";
  if (/^[a-z0-9][a-z0-9._-]*\.mp4$/i.test(videoFilename)) {
    await rm(path.join(assetsDirectory, videoFilename), { force: true });
  }
  await rm(path.join(assetsDirectory, "render-manifest.json"), { force: true });
  await runtime.writeQuizProductRecordPatch(location, {
    stage: record.stage === "VIDEO_READY" ? "SCENE_READY" : record.stage,
    video_asset_path: null,
    video_generated_at: null,
    video_duration_seconds: null,
    render_manifest_path: null,
    render_stale: false,
  });
}

async function markRenderStale(runtime: RepositoryRuntime, location: QuizProductLocation): Promise<void> {
  const { record } = location;
  if (!record.video_asset_path || record.render_stale) return;
  await runtime.writeQuizProductRecordPatch(location, { render_stale: true });
}
