import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  EpisodeSchema,
  ThumbnailHistoryItemSchema,
  ThumbnailManifestSchema,
  nowIso,
  type Episode,
  type MascotProfile,
  type ThumbnailAspectRatio,
  type ThumbnailHistoryItem,
  type ThumbnailLayoutType,
  type ThumbnailManifest,
  type ThumbnailRatioMode,
} from "@studio/shared";
import { StudioLogger } from "../../logger.js";
import type { RepositoryService } from "../../repository.js";
import type { ImageProvider } from "../../providers/index.js";
import { generateAssetWithProvider } from "../assets/resolvers/providerAssetResolver.js";
import { resolveThumbnailLayout } from "./thumbnailLayoutResolver.js";
import { planThumbnailWithAI } from "./thumbnailAiPlanner.js";
import { compileThumbnailPrompt } from "./thumbnailPromptCompiler.js";
import type { AntigravityClient } from "../../antigravity.js";


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

/**
 * Resolves the effective thumbnail ratio based on episode video configuration and user preference.
 */
export function resolveTargetThumbnailRatio(
  episode: Episode,
  requestedRatio?: ThumbnailAspectRatio | "both" | "auto",
): ThumbnailAspectRatio | "both" {
  if (requestedRatio && requestedRatio !== "auto") {
    return requestedRatio;
  }

  const configMode = episode.quiz_config?.thumbnail_aspect_ratio || "auto";
  if (configMode === "16:9" || configMode === "9:16" || configMode === "both") {
    return configMode;
  }

  const isShortsVideo =
    (episode.quiz_config as any)?.render_aspect_ratio === "9:16" ||
    (episode.topic?.title && episode.topic.title.toLowerCase().includes("shorts"));

  return isShortsVideo ? "9:16" : "16:9";
}

/**
 * End-to-end service for planning, compiling, generating, and persisting Episode Thumbnails with full version history.
 */
export async function generateEpisodeThumbnail(
  repository: RepositoryService,
  options: GenerateEpisodeThumbnailOptions,
): Promise<ThumbnailManifest> {
  const { channelId, episodeId, layoutOverride, customHookText, badgeOverride } = options;
  const logger = new StudioLogger(repository.rootDirectory);

  const episode = await repository.getEpisode(channelId, episodeId);
  const channel = await repository.getChannel(channelId);

  const targetRatio = resolveTargetThumbnailRatio(episode, options.aspectRatio);

  // 1. Fetch Mascot Profile if assigned to channel
  let mascotProfile: MascotProfile | null = null;
  if (channel.mascot_id) {
    try {
      mascotProfile = await repository.getMascot(channel.mascot_id);
    } catch {
      logger.warn(`Assigned mascot ${channel.mascot_id} not found, proceeding with default persona`, {
        profileId: channelId,
        workerId: episodeId,
      });
    }
  }

  // 2. Read Scenes / Question Data for context
  let scenes: Array<{ dialogue: string; quiz?: any }> = [];
  try {
    scenes = await repository.readScenes(channelId, episodeId);
  } catch {
    // Empty scenes fallback
  }

  const questions = scenes
    .filter((s) => s.quiz && s.quiz.question)
    .map((s) => ({
      question: s.quiz.question,
      choices: s.quiz.choices,
      answer: s.quiz.answer,
    }));

  // 3. Resolve Thumbnail Plan with AI (Antigravity/Codex) or deterministic fallback
  const plan = await planThumbnailWithAI({
    topicTitle: episode.topic?.title || "Quiz Episode",
    topicSummary: episode.topic?.premise || episode.topic?.hook || "",
    questionCount: episode.quiz_config?.question_count || (questions.length > 0 ? questions.length : 10),
    questionFormat: episode.quiz_config?.quiz_format,
    questions,
    language: channel.language || "English",
    visualStyle: episode.quiz_config?.resolved_visual_style || episode.quiz_config?.visual_style || "pixar_3d",
    colorTheme: mascotProfile?.color_theme,
    layoutOverride,
    customHookText,
    badgeOverride,
    mascotProfile,
    llmClient: options.antigravityClient ?? null,
  });



  const shouldGenerate169 = targetRatio === "16:9" || targetRatio === "both";
  const shouldGenerate916 = targetRatio === "9:16" || targetRatio === "both";

  const prompt169 = shouldGenerate169 ? compileThumbnailPrompt(plan, "16:9", mascotProfile) : null;
  const prompt916 = shouldGenerate916 ? compileThumbnailPrompt(plan, "9:16", mascotProfile) : null;

  // 4. Resolve Storage Directories
  const episodeDirectory = repository.resolvePath("channels", channel.slug, "episodes", episode.slug);
  const assetsDirectory = path.join(episodeDirectory, "assets");
  const variantsDirectory = path.join(assetsDirectory, "thumbnails");
  await mkdir(variantsDirectory, { recursive: true });

  const existingManifest = await getEpisodeThumbnailManifest(repository, channelId, episodeId);
  let history: ThumbnailHistoryItem[] = existingManifest?.history ? [...existingManifest.history] : [];

  let assetPath169: string | null = episode.thumbnail_asset_path_16_9;
  let assetPath916: string | null = episode.thumbnail_asset_path_9_16;
  let active169Id: string | undefined = existingManifest?.active_16_9_id;
  let active916Id: string | undefined = existingManifest?.active_9_16_id;

  const nowTimestamp = Date.now();

  // 5. Generate 16:9 Thumbnail
  if (shouldGenerate169 && prompt169) {
    const versionId169 = `thumb_16_9_${nowTimestamp}`;
    const variantFilename = `${versionId169}.jpg`;
    const variantAbsolute = path.join(variantsDirectory, variantFilename);
    const activeAbsolute = path.join(assetsDirectory, "thumbnail_16_9.jpg");

    try {
      if (options.imageProvider) {
        const generated = await options.imageProvider.generateReference(prompt169);
        const sourceAbsolute = path.isAbsolute(generated.asset_path)
          ? generated.asset_path
          : path.resolve(repository.storageRoot, generated.asset_path);
        const fileData = await readFile(sourceAbsolute);
        await writeFile(variantAbsolute, fileData);
        await writeFile(activeAbsolute, fileData);
      } else {
        const fingerprint169 = createHash("sha256").update(prompt169).digest("hex");
        const generated = await generateAssetWithProvider({
          repository,
          channelId,
          episodeId,
          request: {
            asset_id: `thumb_16_9_${nowTimestamp}`,
            question_id: null,
            subject: `YouTube Thumbnail 16:9 for ${episode.slug}`,
            purpose: "hero_question_image",
            style: "cute_illustration",
            aspect_ratio: "16:9",
            transparent_background: false,
            required: true,
            semantic_key: `thumbnail_16_9_${episode.slug}_${nowTimestamp}`,
            consistency_group_id: null,
          },
          fingerprint: fingerprint169,
          compiledPrompt: prompt169,
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

      assetPath169 = `channels/${channel.slug}/episodes/${episode.slug}/assets/thumbnail_16_9.jpg`;
      active169Id = versionId169;

      // Mark other 16:9 history items inactive
      history = history.map((item) => (item.aspect_ratio === "16:9" ? { ...item, is_active: false } : item));
      history.unshift({
        id: versionId169,
        aspect_ratio: "16:9",
        layout: plan.layout,
        hook_text: plan.hookText,
        badge_text: plan.badgeText,
        prompt: prompt169,
        file_path: `channels/${channel.slug}/episodes/${episode.slug}/assets/thumbnails/${variantFilename}`,
        created_at: nowIso(),
        is_active: true,
      });
    } catch (err) {
      logger.warn(`Failed to generate 16:9 thumbnail via AI provider: ${(err as Error).message}`, {
        profileId: channelId,
        workerId: episodeId,
      });
      if (options.throwOnError) {
        throw new Error(`Failed to generate 16:9 thumbnail: ${(err as Error).message}`);
      }
      try {
        await readFile(activeAbsolute);
      } catch {
        await writeFile(activeAbsolute, Buffer.from("AI_QUIZ_THUMBNAIL_16_9_PLACEHOLDER"));
      }
      assetPath169 = `channels/${channel.slug}/episodes/${episode.slug}/assets/thumbnail_16_9.jpg`;
    }
  }

  // 6. Generate 9:16 Thumbnail
  if (shouldGenerate916 && prompt916) {
    const versionId916 = `thumb_9_16_${nowTimestamp}`;
    const variantFilename = `${versionId916}.jpg`;
    const variantAbsolute = path.join(variantsDirectory, variantFilename);
    const activeAbsolute = path.join(assetsDirectory, "thumbnail_9_16.jpg");

    try {
      if (options.imageProvider) {
        const generated = await options.imageProvider.generateReference(prompt916);
        const sourceAbsolute = path.isAbsolute(generated.asset_path)
          ? generated.asset_path
          : path.resolve(repository.storageRoot, generated.asset_path);
        const fileData = await readFile(sourceAbsolute);
        await writeFile(variantAbsolute, fileData);
        await writeFile(activeAbsolute, fileData);
      } else {
        const fingerprint916 = createHash("sha256").update(prompt916).digest("hex");
        const generated = await generateAssetWithProvider({
          repository,
          channelId,
          episodeId,
          request: {
            asset_id: `thumb_9_16_${nowTimestamp}`,
            question_id: null,
            subject: `YouTube Thumbnail 9:16 for ${episode.slug}`,
            purpose: "hero_question_image",
            style: "cute_illustration",
            aspect_ratio: "9:16",
            transparent_background: false,
            required: true,
            semantic_key: `thumbnail_9_16_${episode.slug}_${nowTimestamp}`,
            consistency_group_id: null,
          },
          fingerprint: fingerprint916,
          compiledPrompt: prompt916,
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

      assetPath916 = `channels/${channel.slug}/episodes/${episode.slug}/assets/thumbnail_9_16.jpg`;
      active916Id = versionId916;

      // Mark other 9:16 history items inactive
      history = history.map((item) => (item.aspect_ratio === "9:16" ? { ...item, is_active: false } : item));
      history.unshift({
        id: versionId916,
        aspect_ratio: "9:16",
        layout: plan.layout,
        hook_text: plan.hookText,
        badge_text: plan.badgeText,
        prompt: prompt916,
        file_path: `channels/${channel.slug}/episodes/${episode.slug}/assets/thumbnails/${variantFilename}`,
        created_at: nowIso(),
        is_active: true,
      });
    } catch (err) {
      logger.warn(`Failed to generate 9:16 thumbnail via AI provider: ${(err as Error).message}`, {
        profileId: channelId,
        workerId: episodeId,
      });
      if (options.throwOnError) {
        throw new Error(`Failed to generate 9:16 thumbnail: ${(err as Error).message}`);
      }
      try {
        await readFile(activeAbsolute);
      } catch {
        await writeFile(activeAbsolute, Buffer.from("AI_QUIZ_THUMBNAIL_9_16_PLACEHOLDER"));
      }
      assetPath916 = `channels/${channel.slug}/episodes/${episode.slug}/assets/thumbnail_9_16.jpg`;
    }
  }

  // 7. Save Thumbnail Manifest & Update Episode metadata atomically
  const manifest: ThumbnailManifest = ThumbnailManifestSchema.parse({
    episode_id: episodeId,
    channel_id: channelId,
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

  const latestEpisode = await repository.getEpisode(channelId, episodeId);
  const updatedEpisode = EpisodeSchema.parse({
    ...latestEpisode,
    thumbnail_asset_path_16_9: assetPath169 ?? latestEpisode.thumbnail_asset_path_16_9,
    thumbnail_asset_path_9_16: assetPath916 ?? latestEpisode.thumbnail_asset_path_9_16,
    updated_at: nowIso(),
  });

  await repository.writeJsonAtomic(path.join(episodeDirectory, "episode.json"), updatedEpisode);

  return manifest;
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
  if (!manifest || !manifest.history || manifest.history.length === 0) {
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

  // Update history items is_active flags
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
  if (!manifest || !manifest.history || manifest.history.length === 0) {
    throw new Error("No thumbnail manifest found");
  }

  const targetItem = manifest.history.find((h) => h.id === versionId);
  if (!targetItem) {
    throw new Error(`Thumbnail version ${versionId} not found in history`);
  }

  const episode = await repository.getEpisode(channelId, episodeId);
  const channel = await repository.getChannel(channelId);
  const episodeDirectory = repository.resolvePath("channels", channel.slug, "episodes", episode.slug);

  // Delete physical variant file if it exists
  try {
    const variantAbsolute = path.resolve(repository.storageRoot, targetItem.file_path);
    await unlink(variantAbsolute);
  } catch {
    // File already deleted or missing
  }

  let remainingHistory = manifest.history.filter((h) => h.id !== versionId);

  // If the deleted item was active, auto-activate the most recent remaining item of same ratio
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



