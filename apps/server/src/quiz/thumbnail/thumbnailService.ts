import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  EpisodeSchema,
  ThumbnailManifestSchema,
  nowIso,
  type MascotProfile,
  type ThumbnailAspectRatio,
  type ThumbnailLayoutType,
  type ThumbnailManifest,
  type ThumbnailRatioMode,
  type Episode,
} from "@studio/shared";
import { StudioLogger } from "../../logger.js";
import type { RepositoryService } from "../../repository.js";
import type { ImageProvider } from "../../providers/index.js";
import { generateAssetWithProvider } from "../assets/resolvers/providerAssetResolver.js";


import { resolveThumbnailLayout } from "./thumbnailLayoutResolver.js";
import { compileThumbnailPrompt } from "./thumbnailPromptCompiler.js";
import type { AntigravityClient } from "../../antigravity.js";

export type GenerateEpisodeThumbnailOptions = {
  channelId: string;
  episodeId: string;
  layoutOverride?: ThumbnailLayoutType;
  aspectRatio?: ThumbnailAspectRatio | "both" | "auto";
  customHookText?: string;
  imageProvider?: ImageProvider;
  activeEngine?: "codex" | "antigravity";
  antigravityClient?: AntigravityClient;
  imageConfig?: {
    api_key?: string;
    model?: string;
    provider?: "google" | "gpti2" | "shopaikey" | "custom";
    base_url?: string;
  };
};

/**
 * Resolves the effective thumbnail ratio based on episode video configuration and user preference.
 */
export function resolveTargetThumbnailRatio(
  episode: Episode,
  requestedRatio?: ThumbnailAspectRatio | "both" | "auto",
): ThumbnailAspectRatio | "both" {
  // 1. Explicit override in request
  if (requestedRatio && requestedRatio !== "auto") {
    return requestedRatio;
  }

  // 2. Configured mode in episode settings
  const configMode = episode.quiz_config?.thumbnail_aspect_ratio || "auto";
  if (configMode === "16:9" || configMode === "9:16" || configMode === "both") {
    return configMode;
  }

  // 3. "auto" Mode: Detect matching video render mode (defaults to 16:9 unless video is Shorts 9:16)
  const isShortsVideo =
    (episode.quiz_config as any)?.render_aspect_ratio === "9:16" ||
    (episode.topic?.title && episode.topic.title.toLowerCase().includes("shorts"));

  return isShortsVideo ? "9:16" : "16:9";
}

/**
 * End-to-end service for planning, compiling, generating, and persisting Episode Thumbnails.
 */
export async function generateEpisodeThumbnail(
  repository: RepositoryService,
  options: GenerateEpisodeThumbnailOptions,
): Promise<ThumbnailManifest> {
  const { channelId, episodeId, layoutOverride, customHookText } = options;
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

  // 3. Resolve Thumbnail Plan
  const plan = resolveThumbnailLayout({
    topicTitle: episode.topic?.title || "Quiz Episode",
    topicSummary: episode.topic?.premise || episode.topic?.hook || "",
    questionCount: episode.quiz_config?.question_count || (questions.length > 0 ? questions.length : 10),
    questionFormat: episode.quiz_config?.quiz_format,
    questions,
    visualStyle: episode.quiz_config?.resolved_visual_style || episode.quiz_config?.visual_style || "pixar_3d",
    colorTheme: mascotProfile?.color_theme,
    layoutOverride,
    customHookText,
    mascotProfile,
  });

  const shouldGenerate169 = targetRatio === "16:9" || targetRatio === "both";
  const shouldGenerate916 = targetRatio === "9:16" || targetRatio === "both";

  const prompt169 = shouldGenerate169 ? compileThumbnailPrompt(plan, "16:9", mascotProfile) : null;
  const prompt916 = shouldGenerate916 ? compileThumbnailPrompt(plan, "9:16", mascotProfile) : null;

  // 4. Resolve Image Provider
  const episodeDirectory = repository.resolvePath("channels", channel.slug, "episodes", episode.slug);
  const assetsDirectory = path.join(episodeDirectory, "assets");
  await mkdir(assetsDirectory, { recursive: true });

  let assetPath169: string | null = episode.thumbnail_asset_path_16_9;
  let assetPath916: string | null = episode.thumbnail_asset_path_9_16;

  // 4. Generate 16:9 Thumbnail using unified provider system
  if (shouldGenerate169 && prompt169) {
    const filename = "thumbnail_16_9.jpg";
    const targetAbsolute = path.join(assetsDirectory, filename);
    try {
      if (options.imageProvider) {
        const generated = await options.imageProvider.generateReference(prompt169);
        if (generated.asset_path && generated.asset_path !== targetAbsolute) {
          const sourceAbsolute = path.isAbsolute(generated.asset_path)
            ? generated.asset_path
            : path.resolve(repository.storageRoot, generated.asset_path);
          try {
            const fileData = await readFile(sourceAbsolute);
            await writeFile(targetAbsolute, fileData);
          } catch {
            // Target created directly by provider
          }
        }
      } else {
        const fingerprint169 = createHash("sha256").update(prompt169).digest("hex");
        const generated = await generateAssetWithProvider({
          repository,
          channelId,
          episodeId,
          request: {
            asset_id: "thumb_16_9",
            question_id: null,
            subject: `YouTube Thumbnail 16:9 for ${episode.slug}`,
            purpose: "hero_question_image",
            style: "cute_illustration",
            aspect_ratio: "16:9",
            transparent_background: false,
            required: true,
            semantic_key: `thumbnail_16_9_${episode.slug}`,
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
          try {
            const fileData = await readFile(sourceAbsolute);
            await writeFile(targetAbsolute, fileData);
          } catch {
            // Target created directly
          }
        }
      }
      assetPath169 = `channels/${channel.slug}/episodes/${episode.slug}/assets/${filename}`;
    } catch (err) {
      logger.warn(`Failed to generate 16:9 thumbnail via AI provider: ${(err as Error).message}`, {
        profileId: channelId,
        workerId: episodeId,
      });
      try {
        await readFile(targetAbsolute);
      } catch {
        await writeFile(targetAbsolute, Buffer.from("AI_QUIZ_THUMBNAIL_16_9_PLACEHOLDER"));
      }
      assetPath169 = `channels/${channel.slug}/episodes/${episode.slug}/assets/${filename}`;
    }
  }

  // 5. Generate 9:16 Thumbnail using unified provider system
  if (shouldGenerate916 && prompt916) {
    const filename = "thumbnail_9_16.jpg";
    const targetAbsolute = path.join(assetsDirectory, filename);
    try {
      if (options.imageProvider) {
        const generated = await options.imageProvider.generateReference(prompt916);
        if (generated.asset_path && generated.asset_path !== targetAbsolute) {
          const sourceAbsolute = path.isAbsolute(generated.asset_path)
            ? generated.asset_path
            : path.resolve(repository.storageRoot, generated.asset_path);
          try {
            const fileData = await readFile(sourceAbsolute);
            await writeFile(targetAbsolute, fileData);
          } catch {
            // Target created directly by provider
          }
        }
      } else {
        const fingerprint916 = createHash("sha256").update(prompt916).digest("hex");
        const generated = await generateAssetWithProvider({
          repository,
          channelId,
          episodeId,
          request: {
            asset_id: "thumb_9_16",
            question_id: null,
            subject: `YouTube Thumbnail 9:16 for ${episode.slug}`,
            purpose: "hero_question_image",
            style: "cute_illustration",
            aspect_ratio: "9:16",
            transparent_background: false,
            required: true,
            semantic_key: `thumbnail_9_16_${episode.slug}`,
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
          try {
            const fileData = await readFile(sourceAbsolute);
            await writeFile(targetAbsolute, fileData);
          } catch {
            // Target created directly
          }
        }
      }
      assetPath916 = `channels/${channel.slug}/episodes/${episode.slug}/assets/${filename}`;
    } catch (err) {
      logger.warn(`Failed to generate 9:16 thumbnail via AI provider: ${(err as Error).message}`, {
        profileId: channelId,
        workerId: episodeId,
      });
      try {
        await readFile(targetAbsolute);
      } catch {
        await writeFile(targetAbsolute, Buffer.from("AI_QUIZ_THUMBNAIL_9_16_PLACEHOLDER"));
      }
      assetPath916 = `channels/${channel.slug}/episodes/${episode.slug}/assets/${filename}`;
    }
  }

  // 6. Save Thumbnail Manifest & Update Episode metadata atomically
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
    created_at: nowIso(),
    updated_at: nowIso(),
  });

  await writeFile(path.join(episodeDirectory, "thumbnail.json"), JSON.stringify(manifest, null, 2), "utf8");

  // Fetch the latest fresh episode snapshot to avoid overwriting narration/voice fields in concurrent tasks
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



