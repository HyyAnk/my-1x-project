import type { ThumbnailAspectRatio, ThumbnailManifest } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { StudioLogger } from "../../logger.js";
import { generateEpisodeThumbnail, resolveTargetThumbnailRatio } from "./thumbnailService.js";
import { loadChannelMascotVisualAnchor } from "./thumbnailLoaders.js";
import { getEpisodeThumbnailManifest } from "./thumbnailManifestStore.js";
import type { GenerateEpisodeThumbnailOptions } from "./thumbnailVariantGenerator.js";
import {
  isReusableThumbnail,
  readThumbnailReuseCheckpoint,
  thumbnailInputFingerprint,
  writeThumbnailReuseCheckpoint,
} from "./thumbnailReuseStore.js";

// Only coalesce automatic generation; explicit Generate remains an intentional
// new version. Repository identity isolates independent storage roots in tests.
const pending = new WeakMap<RepositoryService, Map<string, Promise<ThumbnailManifest | null>>>();

export function ensureEpisodeThumbnail(
  repository: RepositoryService,
  options: GenerateEpisodeThumbnailOptions,
): Promise<ThumbnailManifest | null> {
  let operations = pending.get(repository);
  if (!operations) pending.set(repository, (operations = new Map<string, Promise<ThumbnailManifest | null>>()));
  const key = `${options.channelId}:${options.episodeId}`;
  const previous = operations.get(key) ?? Promise.resolve(null);
  const operation = previous.catch(() => null).then(() => ensureThumbnailVariants(repository, options));
  operations.set(key, operation);
  return operation.finally(() => {
    if (operations.get(key) === operation) operations.delete(key);
  });
}

async function ensureThumbnailVariants(
  repository: RepositoryService,
  options: GenerateEpisodeThumbnailOptions,
): Promise<ThumbnailManifest | null> {
  const { channelId, episodeId } = options;
  const logger = new StudioLogger(repository.rootDirectory);
  const [episode, channel, quiz] = await Promise.all([
    repository.getEpisode(channelId, episodeId),
    repository.getChannel(channelId),
    repository.readQuiz(channelId, episodeId),
  ]);
  const visualAnchor = await loadChannelMascotVisualAnchor(repository, channelId, episodeId, channel.mascot_id, logger);
  const ratio = resolveTargetThumbnailRatio(episode, options.aspectRatio);
  const ratios: ThumbnailAspectRatio[] = ratio === "both" ? ["16:9", "9:16"] : [ratio];
  const fingerprint = thumbnailInputFingerprint({
    version: 1,
    topic: episode.topic,
    questions: quiz?.questions.map(({ question, choices, correct_choice_id }) => ({ question, choices, correct_choice_id })),
    language: channel.language,
    style: episode.quiz_config.resolved_visual_style ?? episode.quiz_config.visual_style,
    mascotId: channel.mascot_id,
    mascotAnchorFingerprint: visualAnchor?.fingerprint,
    layout: options.layoutOverride,
    hook: options.customHookText,
    badge: options.badgeOverride,
  });
  const checkpointPath = repository.resolvePath("channels", channel.slug, "episodes", episode.slug, "thumbnail-reuse.json");
  const checkpoint = await readThumbnailReuseCheckpoint(checkpointPath);
  let manifest = await getEpisodeThumbnailManifest(repository, channelId, episodeId);
  for (const target of ratios) {
    const assetPath =
      target === "16:9"
        ? (manifest?.asset_path_16_9 ?? episode.thumbnail_asset_path_16_9)
        : (manifest?.asset_path_9_16 ?? episode.thumbnail_asset_path_9_16);
    const previousFingerprint = checkpoint.fingerprints[target];
    const current = !previousFingerprint || previousFingerprint === fingerprint;
    if (current && (await isReusableThumbnail(repository, assetPath, target))) {
      logger.info(`Thumbnail ${target} reused`, { profileId: channelId, workerId: episodeId, step: "thumbnail_reuse" });
    } else {
      manifest = await generateEpisodeThumbnail(repository, { ...options, aspectRatio: target, throwOnError: true });
      const generatedPath = target === "16:9" ? manifest.asset_path_16_9 : manifest.asset_path_9_16;
      if (!(await isReusableThumbnail(repository, generatedPath, target))) {
        throw new Error(`Generated thumbnail ${target} failed image validation. Retry thumbnail generation.`);
      }
    }
    checkpoint.fingerprints[target] = fingerprint;
    await writeThumbnailReuseCheckpoint(checkpointPath, checkpoint);
  }
  return manifest;
}
