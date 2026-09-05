import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  EpisodeSchema,
  ThumbnailManifestSchema,
  nowIso,
  type Channel,
  type Episode,
  type ThumbnailAspectRatio,
  type ThumbnailHistoryItem,
  type ThumbnailLayoutType,
  type ThumbnailManifest,
} from "@studio/shared";
import type { StudioLogger } from "../../logger.js";
import type { RepositoryService } from "../../repository.js";
import type { ImageProvider } from "../../providers/index.js";
import type { AntigravityClient } from "../../antigravity.js";
import { generateAssetWithProvider } from "../assets/resolvers/providerAssetResolver.js";
import type { QuizThumbnailPlan } from "./thumbnailTypes.js";

export type GenerateEpisodeThumbnailOptions = {
  channelId: string;
  episodeId: string;
  layoutOverride?: ThumbnailLayoutType;
  aspectRatio?: ThumbnailAspectRatio | "both" | "auto";
  customHookText?: string;
  badgeOverride?: string;
  imageProvider?: ImageProvider;
  activeEngine?: "codex" | "antigravity";
  antigravityClient?: AntigravityClient;
  imageConfig?: {
    api_key?: string;
    model?: string;
    provider?: "google" | "gpti2" | "shopaikey" | "custom";
    base_url?: string;
    quality?: string;
  };
  throwOnError?: boolean;
};

export type GenerateVariantParams = {
  repository: RepositoryService;
  channel: Channel;
  episode: Episode;
  ratio: "16:9" | "9:16";
  prompt: string;
  plan: QuizThumbnailPlan;
  options: GenerateEpisodeThumbnailOptions;
  logger: StudioLogger;
  nowTimestamp: number;
};

export type VariantGenerationResult = {
  versionId: string;
  variantFilename: string;
  assetPath: string;
  historyItem: ThumbnailHistoryItem;
};

/**
 * Prunes thumbnail history to avoid unbounded file accumulation per aspect ratio.
 */
export function pruneVersionHistory(history: ThumbnailHistoryItem[], maxPerRatio = 20): ThumbnailHistoryItem[] {
  const items169 = history.filter((h) => h.aspect_ratio === "16:9").slice(0, maxPerRatio);
  const items916 = history.filter((h) => h.aspect_ratio === "9:16").slice(0, maxPerRatio);
  return [...items169, ...items916].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/**
 * Reads existing Thumbnail manifest from episode directory if present.
 */
export async function getEpisodeThumbnailManifest(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
): Promise<ThumbnailManifest | null> {
  const episode = await repository.getEpisode(channelId, episodeId);
  const channel = await repository.getChannel(channelId);
  const manifestPath = repository.resolvePath("channels", channel.slug, "episodes", episode.slug, "thumbnail.json");

  try {
    const raw = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;
    return ThumbnailManifestSchema.parse(raw);
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

  const episode = await repository.getEpisode(channelId, episodeId);
  const channel = await repository.getChannel(channelId);
  const episodeDirectory = repository.resolvePath("channels", channel.slug, "episodes", episode.slug);
  const assetsDirectory = path.join(episodeDirectory, "assets");

  const variantAbsolute = path.resolve(repository.storageRoot, targetItem.file_path);
  const variantData = await readFile(variantAbsolute);

  const is169 = targetItem.aspect_ratio === "16:9";
  const activeFilename = is169 ? "thumbnail_16_9.jpg" : "thumbnail_9_16.jpg";
  const activeAbsolute = path.join(assetsDirectory, activeFilename);

  await writeFile(activeAbsolute, variantData);

  const updatedHistory = manifest.history.map((h) => {
    if (h.aspect_ratio === targetItem.aspect_ratio) {
      return { ...h, is_active: h.id === versionId };
    }
    return h;
  });

  const updatedManifest: ThumbnailManifest = ThumbnailManifestSchema.parse({
    ...manifest,
    layout: is169 ? targetItem.layout : manifest.layout,
    hook_text: is169 ? targetItem.hook_text : manifest.hook_text,
    active_16_9_id: is169 ? versionId : manifest.active_16_9_id,
    active_9_16_id: !is169 ? versionId : manifest.active_9_16_id,
    history: updatedHistory,
    updated_at: nowIso(),
  });

  await writeFile(path.join(episodeDirectory, "thumbnail.json"), JSON.stringify(updatedManifest, null, 2), "utf8");
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

  const episode = await repository.getEpisode(channelId, episodeId);
  const channel = await repository.getChannel(channelId);
  const episodeDirectory = repository.resolvePath("channels", channel.slug, "episodes", episode.slug);

  try {
    const variantAbsolute = path.resolve(repository.storageRoot, targetItem.file_path);
    await unlink(variantAbsolute);
  } catch {
    // File already deleted or missing
  }

  const remainingHistory = manifest.history.filter((h) => h.id !== versionId);

  if (targetItem.is_active) {
    const nextActive = remainingHistory.find((h) => h.aspect_ratio === targetItem.aspect_ratio);
    if (nextActive) {
      nextActive.is_active = true;
      try {
        const nextAbsolute = path.resolve(repository.storageRoot, nextActive.file_path);
        const activeFilename = targetItem.aspect_ratio === "16:9" ? "thumbnail_16_9.jpg" : "thumbnail_9_16.jpg";
        const activeAbsolute = path.join(episodeDirectory, "assets", activeFilename);
        const data = await readFile(nextAbsolute);
        await writeFile(activeAbsolute, data);
      } catch {
        // Fallback
      }
    }
  }

  const updatedManifest: ThumbnailManifest = ThumbnailManifestSchema.parse({
    ...manifest,
    history: remainingHistory,
    updated_at: nowIso(),
  });

  await writeFile(path.join(episodeDirectory, "thumbnail.json"), JSON.stringify(updatedManifest, null, 2), "utf8");
  return updatedManifest;
}

/**
 * Generates and stores a single thumbnail variant (16:9 or 9:16) on disk.
 */
export async function generateThumbnailVariant(params: GenerateVariantParams): Promise<VariantGenerationResult> {
  const { repository, channel, episode, ratio, prompt, plan, options, logger, nowTimestamp } = params;
  const versionId = `thumb_${ratio.replace(":", "_")}_${nowTimestamp}`;
  const variantFilename = `${versionId}.jpg`;
  const episodeDirectory = repository.resolvePath("channels", channel.slug, "episodes", episode.slug);
  const assetsDirectory = path.join(episodeDirectory, "assets");
  const variantsDirectory = path.join(assetsDirectory, "thumbnails");
  await mkdir(variantsDirectory, { recursive: true });

  const variantAbsolute = path.join(variantsDirectory, variantFilename);
  const activeFilename = ratio === "16:9" ? "thumbnail_16_9.jpg" : "thumbnail_9_16.jpg";
  const activeAbsolute = path.join(assetsDirectory, activeFilename);

  try {
    if (options.imageProvider) {
      const generated = await options.imageProvider.generateReference(prompt);
      const sourceAbsolute = path.isAbsolute(generated.asset_path)
        ? generated.asset_path
        : path.resolve(repository.storageRoot, generated.asset_path);
      const fileData = await readFile(sourceAbsolute);
      await writeFile(variantAbsolute, fileData);
      await writeFile(activeAbsolute, fileData);
      await repository
        .recordImageUsage({
          channelId: channel.channel_id,
          episodeId: episode.episode_id,
          provider: options.imageConfig?.provider ?? (options.activeEngine === "antigravity" ? "antigravity" : "gpti2"),
          model: options.imageConfig?.model || "gpt-image-2",
          count: 1,
          costVnd: 50,
          costUsd: 0.002,
          note: `Thumbnail ${ratio} for ${episode.slug}`,
        })
        .catch(() => undefined);
    } else {
      const fingerprint = createHash("sha256").update(prompt).digest("hex");
      const generated = await generateAssetWithProvider({
        repository,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        request: {
          asset_id: versionId,
          question_id: null,
          subject: `YouTube Thumbnail ${ratio} for ${episode.slug}`,
          purpose: "hero_question_image",
          style: "cute_illustration",
          aspect_ratio: ratio,
          transparent_background: false,
          required: true,
          semantic_key: `thumbnail_${ratio.replace(":", "_")}_${episode.slug}_${nowTimestamp}`,
          consistency_group_id: null,
        },
        fingerprint,
        compiledPrompt: prompt,
        configuredProvider: options.imageConfig?.provider ?? "gpti2",
        activeEngine: options.activeEngine ?? "codex",
        antigravityClient: options.antigravityClient,
        imageConfig: options.imageConfig,
        logger,
      });

      if (generated.entry.path) {
        const sourceAbsolute = path.isAbsolute(generated.entry.path)
          ? generated.entry.path
          : path.resolve(repository.storageRoot, generated.entry.path);
        const fileData = await readFile(sourceAbsolute);
        await writeFile(variantAbsolute, fileData);
        await writeFile(activeAbsolute, fileData);
      }
    }

    return {
      versionId,
      variantFilename,
      assetPath: `channels/${channel.slug}/episodes/${episode.slug}/assets/${activeFilename}`,
      historyItem: {
        id: versionId,
        aspect_ratio: ratio,
        layout: plan.layout,
        hook_text: plan.hookText,
        badge_text: plan.badgeText,
        prompt,
        file_path: `channels/${channel.slug}/episodes/${episode.slug}/assets/thumbnails/${variantFilename}`,
        created_at: nowIso(),
        is_active: true,
      },
    };
  } catch (err) {
    logger.warn(`Failed to generate ${ratio} thumbnail via AI provider: ${(err as Error).message}`, {
      profileId: channel.channel_id,
      workerId: episode.episode_id,
    });
    if (options.throwOnError) {
      throw new Error(`Failed to generate ${ratio} thumbnail: ${(err as Error).message}`);
    }
    try {
      await readFile(activeAbsolute);
    } catch {
      await writeFile(activeAbsolute, Buffer.from(`AI_QUIZ_THUMBNAIL_${ratio.replace(":", "_")}_PLACEHOLDER`));
    }

    return {
      versionId,
      variantFilename,
      assetPath: `channels/${channel.slug}/episodes/${episode.slug}/assets/${activeFilename}`,
      historyItem: {
        id: versionId,
        aspect_ratio: ratio,
        layout: plan.layout,
        hook_text: plan.hookText,
        badge_text: plan.badgeText,
        prompt,
        file_path: `channels/${channel.slug}/episodes/${episode.slug}/assets/thumbnails/${variantFilename}`,
        created_at: nowIso(),
        is_active: true,
      },
    };
  }
}

/**
 * Persists thumbnail manifest and updates episode records atomically.
 */
export async function persistThumbnailManifest(params: {
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
}): Promise<ThumbnailManifest> {
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

  await writeFile(path.join(episodeDirectory, "thumbnail.json"), JSON.stringify(manifest, null, 2), "utf8");

  const latestEpisode = await repository.getEpisode(channel.channel_id, episode.episode_id);
  const updatedEpisode = EpisodeSchema.parse({
    ...latestEpisode,
    thumbnail_asset_path_16_9: assetPath169 ?? latestEpisode.thumbnail_asset_path_16_9,
    thumbnail_asset_path_9_16: assetPath916 ?? latestEpisode.thumbnail_asset_path_9_16,
    updated_at: nowIso(),
  });

  await repository.writeJsonAtomic(path.join(episodeDirectory, "episode.json"), updatedEpisode);
  return manifest;
}
