import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ThumbnailManifestSchema,
  nowIso,
  type Channel,
  type Episode,
  type ThumbnailHistoryItem,
  type ThumbnailManifest,
} from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { syncLegacyEpisodeThumbnailPaths } from "./thumbnailLegacyMigrator.js";
import type { QuizThumbnailPlan } from "./thumbnailTypes.js";

const MANIFEST_FILENAME = "thumbnail.json";
const ASSETS_DIRECTORY_NAME = "assets";
const ACTIVE_16_9_FILENAME = "thumbnail_16_9.jpg";
const ACTIVE_9_16_FILENAME = "thumbnail_9_16.jpg";

type WriteEpisodeThumbnailParams = {
  repository: RepositoryService;
  channelId: string;
  episodeId: string;
};

type PersistThumbnailManifestParams = {
  repository: RepositoryService;
  channel: Channel;
  episode: Episode;
  plan: QuizThumbnailPlan;
  history: ThumbnailHistoryItem[];
  existingManifest: ThumbnailManifest | null;
  assetPath169: string | null;
  assetPath916: string | null;
  prompt169: string | null;
  prompt916: string | null;
  active169Id?: string;
  active916Id?: string;
};

function resolveEpisodeDirectory(params: WriteEpisodeThumbnailParams): Promise<string> {
  const { repository, channelId, episodeId } = params;
  return repository.getEpisode(channelId, episodeId).then(async (episode) => {
    const channel = await repository.getChannel(channelId);
    return repository.resolvePath("channels", channel.slug, "episodes", episode.slug);
  });
}

function resolveActiveFilename(aspectRatio: ThumbnailHistoryItem["aspect_ratio"]): string {
  return aspectRatio === "16:9" ? ACTIVE_16_9_FILENAME : ACTIVE_9_16_FILENAME;
}

/**
 * Prunes thumbnail history to avoid unbounded file accumulation per aspect ratio.
 */
export function pruneVersionHistory(history: ThumbnailHistoryItem[], maxPerRatio = 20): ThumbnailHistoryItem[] {
  const items169 = history.filter((h) => h.aspect_ratio === "16:9").slice(0, maxPerRatio);
  const items916 = history.filter((h) => h.aspect_ratio === "9:16").slice(0, maxPerRatio);
  return [...items169, ...items916].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Reads existing Thumbnail manifest from episode directory if present.
 */
export async function getEpisodeThumbnailManifest(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
): Promise<ThumbnailManifest | null> {
  const episodeDirectory = await resolveEpisodeDirectory({ repository, channelId, episodeId });
  const manifestPath = path.join(episodeDirectory, MANIFEST_FILENAME);

  try {
    const raw = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;
    return ThumbnailManifestSchema.parse(raw);
  } catch {
    return null;
  }
}

async function writeManifestFile(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  manifest: ThumbnailManifest,
): Promise<void> {
  const episodeDirectory = await resolveEpisodeDirectory({ repository, channelId, episodeId });
  await writeFile(path.join(episodeDirectory, MANIFEST_FILENAME), JSON.stringify(manifest, null, 2), "utf8");
}

async function writeActiveThumbnail(
  episodeDirectory: string,
  aspectRatio: ThumbnailHistoryItem["aspect_ratio"],
  variantData: Buffer,
): Promise<void> {
  const activeAbsolute = path.join(episodeDirectory, ASSETS_DIRECTORY_NAME, resolveActiveFilename(aspectRatio));
  await mkdir(path.dirname(activeAbsolute), { recursive: true });
  await writeFile(activeAbsolute, variantData);
}

async function readVariantFile(repository: RepositoryService, filePath: string): Promise<Buffer | null> {
  try {
    const variantAbsolute = path.resolve(repository.storageRoot, filePath);
    return await readFile(variantAbsolute);
  } catch {
    return null;
  }
}

/**
 * Sets a specific thumbnail version from history as the active thumbnail for the episode.
 */
export async function setActiveThumbnailVersion(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  versionId: string,
): Promise<ThumbnailManifest> {
  const manifest = await getEpisodeThumbnailManifest(repository, channelId, episodeId);
  if (!manifest?.history || manifest.history.length === 0) {
    throw new Error("No thumbnail manifest or history found");
  }

  const targetItem = manifest.history.find((h) => h.id === versionId);
  if (!targetItem) {
    throw new Error(`Thumbnail version ${versionId} not found in history`);
  }

  const episodeDirectory = await resolveEpisodeDirectory({ repository, channelId, episodeId });
  const variantData = await readVariantFile(repository, targetItem.file_path);
  if (variantData) {
    await writeActiveThumbnail(episodeDirectory, targetItem.aspect_ratio, variantData);
  }

  const updatedHistory = manifest.history.map((h) => {
    if (h.aspect_ratio === targetItem.aspect_ratio) {
      return { ...h, is_active: h.id === versionId };
    }
    return h;
  });

  const is169 = targetItem.aspect_ratio === "16:9";
  const updatedManifest: ThumbnailManifest = ThumbnailManifestSchema.parse({
    ...manifest,
    layout: is169 ? targetItem.layout : manifest.layout,
    hook_text: is169 ? targetItem.hook_text : manifest.hook_text,
    active_16_9_id: is169 ? versionId : manifest.active_16_9_id,
    active_9_16_id: !is169 ? versionId : manifest.active_9_16_id,
    history: updatedHistory,
    updated_at: nowIso(),
  });

  await writeManifestFile(repository, channelId, episodeId, updatedManifest);
  return updatedManifest;
}

/**
 * Deletes a specific thumbnail version from history and disk.
 */
export async function deleteThumbnailVersion(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  versionId: string,
): Promise<ThumbnailManifest> {
  const manifest = await getEpisodeThumbnailManifest(repository, channelId, episodeId);
  if (!manifest?.history || manifest.history.length === 0) {
    throw new Error("No thumbnail manifest found");
  }

  const targetItem = manifest.history.find((h) => h.id === versionId);
  if (!targetItem) {
    throw new Error(`Thumbnail version ${versionId} not found in history`);
  }

  const episodeDirectory = await resolveEpisodeDirectory({ repository, channelId, episodeId });
  await removeVariantFile(repository, targetItem.file_path);
  await promoteNextActiveVariant(repository, episodeDirectory, manifest.history, targetItem);

  const remainingHistory = manifest.history.filter((h) => h.id !== versionId);
  const updatedManifest: ThumbnailManifest = ThumbnailManifestSchema.parse({
    ...manifest,
    history: remainingHistory,
    updated_at: nowIso(),
  });

  await writeManifestFile(repository, channelId, episodeId, updatedManifest);
  return updatedManifest;
}

async function removeVariantFile(repository: RepositoryService, filePath: string): Promise<void> {
  try {
    const variantAbsolute = path.resolve(repository.storageRoot, filePath);
    await unlink(variantAbsolute);
  } catch {
    // File already deleted or missing
  }
}

async function promoteNextActiveVariant(
  repository: RepositoryService,
  episodeDirectory: string,
  history: ThumbnailHistoryItem[],
  deletedItem: ThumbnailHistoryItem,
): Promise<void> {
  if (!deletedItem.is_active) {
    return;
  }

  const nextActive = history.find((h) => h.id !== deletedItem.id && h.aspect_ratio === deletedItem.aspect_ratio);
  if (!nextActive) {
    return;
  }

  nextActive.is_active = true;
  const variantData = await readVariantFile(repository, nextActive.file_path);
  if (variantData) {
    try {
      await writeActiveThumbnail(episodeDirectory, nextActive.aspect_ratio, variantData);
    } catch {
      // Fallback: keep manifest history promotion even when active file copy fails
    }
  }
}

/**
 * Persists thumbnail manifest and updates episode records atomically.
 */
export async function persistThumbnailManifest(params: PersistThumbnailManifestParams): Promise<ThumbnailManifest> {
  const {
    repository,
    channel,
    episode,
    plan,
    history,
    existingManifest,
    assetPath169,
    assetPath916,
    prompt169,
    prompt916,
    active169Id,
    active916Id,
  } = params;
  const episodeDirectory = repository.resolvePath("channels", channel.slug, "episodes", episode.slug);

  const manifest: ThumbnailManifest = ThumbnailManifestSchema.parse({
    episode_id: episode.episode_id,
    channel_id: channel.channel_id,
    layout: plan.layout,
    hook_text: plan.hookText,
    mascot_persona: `${plan.mascotPersona.role}: ${plan.mascotPersona.costume} with ${plan.mascotPersona.prop}`,
    asset_path_16_9: assetPath169,
    asset_path_9_16: assetPath916,
    prompt_16_9: prompt169,
    prompt_9_16: prompt916,
    active_16_9_id: active169Id,
    active_9_16_id: active916Id,
    history,
    created_at: existingManifest?.created_at || nowIso(),
    updated_at: nowIso(),
  });

  await writeFile(path.join(episodeDirectory, MANIFEST_FILENAME), JSON.stringify(manifest, null, 2), "utf8");

  await syncLegacyEpisodeThumbnailPaths({ repository, channel, episode, manifest });
  return manifest;
}

export type { PersistThumbnailManifestParams };
