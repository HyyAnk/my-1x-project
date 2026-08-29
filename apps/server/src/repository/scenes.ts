import { mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { EpisodeSchema, SceneSchema, nowIso, quizChoiceCountForFormat, type Episode, type Scene } from "@studio/shared";
import { invalidateQuizArtifacts as quizInvalidationStages } from "../quiz/pipeline/invalidation.js";
import { RepositoryError } from "./errors.js";
import { isValidImageBuffer } from "./helpers.js";
import type { BundleImageAsset, BundleImageMeta } from "./types.js";
import { parseScenes, serializeDialogue, serializePrompts, serializeScenes } from "./sceneCodec.js";

function clearSceneAudio(scene: Scene): Scene {
  return { ...scene, audio_asset_path: null, audio_generated_at: null, audio_duration_seconds: null };
}

function assertQuizSceneChoicePolicy(scenes: Scene[], episode: Episode, isQuizChannel: boolean): void {
  if (!isQuizChannel) return;
  const normalizedFormat = episode.quiz_config.quiz_format === "knowledge" ? "multiple_choice" : episode.quiz_config.quiz_format;
  const requiredChoiceCount = quizChoiceCountForFormat(normalizedFormat);
  for (const scene of scenes) {
    if (!scene.quiz || !scene.quiz.question_number || ["intro", "outro"].includes(scene.quiz.phase)) continue;
    if (scene.quiz.choices.length !== requiredChoiceCount) {
      throw new RepositoryError(
        `Question ${scene.quiz.question_number} must have exactly ${requiredChoiceCount} choices; received ${scene.quiz.choices.length}`,
        "QUIZ_CHOICE_COUNT_INVALID",
      );
    }
  }
}
import type { RepositoryRuntime } from "./runtime.js";

export async function readScenes(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<Scene[]> {
  const [file, episode, channel] = await Promise.all([
    this.getEpisodeFile(channelId, episodeId, "scene_plan.md"),
    this.getEpisode(channelId, episodeId),
    this.getChannel(channelId),
  ]);
  const scenes = parseScenes(file.content, episodeId);
  assertQuizSceneChoicePolicy(scenes, episode, channel.engine === "quiz");
  return scenes;
}

export async function listBundleImages(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<BundleImageAsset[]> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const directory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", "bundles");
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  const images: BundleImageAsset[] = [];
  for (const entry of entries.filter((item) => item.isFile())) {
    const match = /^CB-(\d{2,})(-alt)?\.png$/i.exec(entry.name);
    if (!match) continue;
    const absolutePath = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", "bundles", entry.name);
    try {
      const metadata = await stat(absolutePath);
      let meta: BundleImageMeta = {};
      const metaPath = absolutePath.replace(/\.png$/i, ".meta.json");
      try {
        meta = JSON.parse(await readFile(metaPath, "utf8")) as BundleImageMeta;
      } catch {
        // No meta file
      }
      images.push({
        bundle_id: `CB-${String(Number(match[1])).padStart(2, "0")}`,
        bundle_number: Number(match[1]),
        variant: match[2] ? 1 : 0,
        filename: entry.name,
        path: `channels/${channel.slug}/episodes/${episode.slug}/assets/bundles/${entry.name}`,
        absolutePath,
        size: metadata.size,
        modified_at: metadata.mtime.toISOString(),
        price_vnd: meta.price_vnd,
        price_breakdown: meta.price_breakdown,
        model: meta.model,
        aspect_ratio: meta.aspect_ratio,
      });
    } catch {
      // Ignore an image that disappeared during a refresh.
    }
  }
  return images.sort((a, b) => a.bundle_number - b.bundle_number || a.variant - b.variant);
}

export async function getBundleImagePath(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  bundleNumber: number,
  variant = 0,
): Promise<{ bundle_id: string; filename: string; path: string; absolutePath: string }> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const filename = `CB-${String(this.assertBundleNumber(bundleNumber)).padStart(2, "0")}${variant === 1 ? "-alt" : ""}.png`;
  const absolutePath = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", "bundles", filename);
  return {
    bundle_id: `CB-${String(bundleNumber).padStart(2, "0")}`,
    filename,
    path: `channels/${channel.slug}/episodes/${episode.slug}/assets/bundles/${filename}`,
    absolutePath,
  };
}

export async function getBundleImageFile(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  filename: string,
): Promise<BundleImageAsset> {
  if (!/^CB-\d{2,}(?:-alt)?\.png$/i.test(filename)) throw new RepositoryError("Unsupported image asset", "FILE_NOT_ALLOWED");
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const absolutePath = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", "bundles", filename);
  try {
    await this.assertRealPathInside(path.dirname(absolutePath), absolutePath);
    const metadata = await stat(absolutePath);
    const bundleNumber = Number(/^CB-(\d+)/i.exec(filename)?.[1] ?? 0);
    let meta: BundleImageMeta = {};
    const metaPath = absolutePath.replace(/\.png$/i, ".meta.json");
    try {
      meta = JSON.parse(await readFile(metaPath, "utf8")) as BundleImageMeta;
    } catch {
      // No meta file
    }
    return {
      bundle_id: `CB-${String(bundleNumber).padStart(2, "0")}`,
      bundle_number: bundleNumber,
      variant: /-alt\.png$/i.test(filename) ? 1 : 0,
      filename,
      path: `channels/${channel.slug}/episodes/${episode.slug}/assets/bundles/${filename}`,
      absolutePath,
      size: metadata.size,
      modified_at: metadata.mtime.toISOString(),
      price_vnd: meta.price_vnd,
      price_breakdown: meta.price_breakdown,
      model: meta.model,
      aspect_ratio: meta.aspect_ratio,
    };
  } catch {
    throw new RepositoryError("Image asset not found", "IMAGE_NOT_FOUND");
  }
}

export async function writeBundleImage(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  bundleNumber: number,
  content: Uint8Array,
  variant = 0,
  meta?: BundleImageMeta,
): Promise<string> {
  if (!isValidImageBuffer(content)) throw new RepositoryError("Image output is not a valid image file", "INVALID_IMAGE");
  const target = await this.getBundleImagePath(channelId, episodeId, bundleNumber, variant);
  const directory = path.dirname(target.absolutePath);
  const episodeDirectory = path.dirname(directory);
  await mkdir(directory, { recursive: true });
  await this.assertRealPathInside(episodeDirectory, directory);
  await this.writeBinaryAtomic(target.absolutePath, content);
  if (meta) {
    const metaPath = target.absolutePath.replace(/\.png$/i, ".meta.json");
    await this.writeJsonAtomic(metaPath, meta);
  }
  return target.path;
}

export async function writeBundleImageFromFile(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  bundleNumber: number,
  sourcePath: string,
  variant = 0,
  meta?: BundleImageMeta,
): Promise<string> {
  const resolvedSource = path.resolve(sourcePath);
  const sourceRoot = [this.rootDirectory, this.storageRoot].find((root) => this.isInside(root, resolvedSource));
  if (!sourceRoot) throw new RepositoryError("Codex image path is outside the studio workspace", "UNSAFE_PATH");
  await this.assertRealPathInside(sourceRoot, resolvedSource);
  return this.writeBundleImage(channelId, episodeId, bundleNumber, await readFile(resolvedSource), variant, meta);
}

export async function clearBundleImages(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  bundleNumber: number,
): Promise<void> {
  const images = await this.listBundleImages(channelId, episodeId);
  const id = `CB-${String(this.assertBundleNumber(bundleNumber)).padStart(2, "0")}`;
  await Promise.all(
    images
      .filter((image) => image.bundle_id === id)
      .flatMap((image) => [
        rm(image.absolutePath, { force: true }),
        rm(image.absolutePath.replace(/\.png$/i, ".meta.json"), { force: true }),
      ]),
  );
}

export async function attachBundleReference(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  bundleId: string,
  assetPath: string,
): Promise<number> {
  const scenes = await this.readScenes(channelId, episodeId);
  const matching = scenes.filter((scene) => scene.continuity_bundle_id.toUpperCase() === bundleId.toUpperCase());
  if (matching.length === 0) return 0;
  const next = scenes.map((scene) =>
    scene.continuity_bundle_id.toUpperCase() === bundleId.toUpperCase()
      ? SceneSchema.parse({ ...scene, reference_asset_ids: [...new Set([...scene.reference_asset_ids, assetPath])] })
      : scene,
  );
  await this.saveScenes(channelId, episodeId, next);
  return matching.length;
}

export async function saveScenes(this: RepositoryRuntime, channelId: string, episodeId: string, scenes: Scene[]): Promise<void> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const previousScenes = await this.readScenes(channelId, episodeId);
  const normalized = scenes.map((scene, index) => SceneSchema.parse({ ...scene, scene_number: index + 1, episode_id: episodeId }));
  assertQuizSceneChoicePolicy(normalized, episode, channel.engine === "quiz");
  const withFreshAudio = normalized.map((scene) => {
    const previous = previousScenes.find((item) => item.scene_number === scene.scene_number);
    if (previous && previous.dialogue !== scene.dialogue) return clearSceneAudio(scene);
    return scene;
  });
  const scenesChanged = JSON.stringify(withFreshAudio) !== JSON.stringify(previousScenes);
  const episodeDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug);
  await this.writeTextAtomic(path.join(episodeDirectory, "scene_plan.md"), serializeScenes(withFreshAudio));
  await this.writeTextAtomic(path.join(episodeDirectory, "dialogue_script.md"), serializeDialogue(withFreshAudio));
  await this.writeTextAtomic(path.join(episodeDirectory, "video_prompts.md"), serializePrompts(withFreshAudio));
  await this.writeJsonAtomic(
    path.join(episodeDirectory, "episode.json"),
    EpisodeSchema.parse({ ...episode, stage: "SCENE_READY", updated_at: nowIso() }),
  );
  if (scenesChanged) await this.invalidateQuizSourceArtifacts(channelId, episodeId);
}

export async function invalidateQuizSourceArtifacts(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<void> {
  const channel = await this.getChannel(channelId);
  if (channel.engine !== "quiz") return;
  await this.invalidateQuizArtifacts(channelId, episodeId, quizInvalidationStages("research"));
}
