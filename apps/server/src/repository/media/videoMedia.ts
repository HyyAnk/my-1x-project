import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "../errors.js";
import type { QuizProductId, QuizProductRecord, RepositoryRuntime } from "../runtime.js";

const VIDEO_FILENAME_PATTERN = /^[a-z0-9][a-z0-9._-]*\.mp4$/i;

export async function writeVideoArtifact(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  content: Uint8Array,
  filename = "quiz-video.mp4",
): Promise<string> {
  if (!VIDEO_FILENAME_PATTERN.test(filename)) throw new RepositoryError("Unsupported video file", "FILE_NOT_ALLOWED");
  const location = await this.locateQuizProduct(channelId, product);
  const assetsDirectory = path.join(location.directory, "assets");
  await mkdir(assetsDirectory, { recursive: true });
  await this.assertRealPathInside(location.directory, assetsDirectory);
  await this.writeBinaryAtomic(path.join(assetsDirectory, filename), content);
  return `${location.relativeDirectory}/assets/${filename}`;
}

export async function getEpisodeVideoFile(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  filename = "quiz-video.mp4",
): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }> {
  if (!VIDEO_FILENAME_PATTERN.test(filename)) throw new RepositoryError("Unsupported video file", "FILE_NOT_ALLOWED");
  const location = await this.locateQuizProduct(channelId, product);
  const assetsDirectory = path.join(location.directory, "assets");
  const absolutePath = path.join(assetsDirectory, filename);
  try {
    await this.assertRealPathInside(assetsDirectory, absolutePath);
    const metadata = await stat(absolutePath);
    return {
      absolutePath,
      path: `${location.relativeDirectory}/assets/${filename}`,
      size: metadata.size,
      modified_at: metadata.mtime.toISOString(),
    };
  } catch {
    throw new RepositoryError("Video asset not found", "VIDEO_NOT_FOUND");
  }
}

export async function writeRenderManifest(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  content: string,
): Promise<string> {
  const location = await this.locateQuizProduct(channelId, product);
  const assetsDirectory = path.join(location.directory, "assets");
  await mkdir(assetsDirectory, { recursive: true });
  await this.writeTextAtomic(path.join(assetsDirectory, "render-manifest.json"), content.endsWith("\n") ? content : `${content}\n`);
  return `${location.relativeDirectory}/assets/render-manifest.json`;
}

/** Persists the rendered video onto whichever record kind the product resolves to. */
export async function saveVideoMetadata(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  assetPath: string,
  durationSeconds: number,
  renderManifestPath: string,
): Promise<QuizProductRecord> {
  return this.queueEpisodeArtifactMutation(channelId, product, async () => {
    const location = await this.locateQuizProduct(channelId, product);
    return this.writeQuizProductRecordPatch(location, {
      stage: "VIDEO_READY",
      video_asset_path: assetPath,
      video_generated_at: new Date().toISOString(),
      video_duration_seconds: durationSeconds,
      render_manifest_path: renderManifestPath,
      render_stale: false,
    });
  });
}
