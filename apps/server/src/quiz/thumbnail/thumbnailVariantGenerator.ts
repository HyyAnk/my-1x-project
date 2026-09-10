import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  nowIso,
  type Channel,
  type Episode,
  type ThumbnailAspectRatio,
  type ThumbnailHistoryItem,
  type ThumbnailLayoutType,
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
  imageFallbackConfig?: {
    enabled?: boolean;
    provider?: "imgstudio";
    base_url?: string;
    api_key?: string;
    model?: string;
    resolution?: "1K" | "2K" | "4K";
    quality?: "standard" | "high";
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

type VariantFileTargets = {
  variantAbsolute: string;
  activeAbsolute: string;
  variantRelativePath: string;
  activeRelativePath: string;
};

const ACTIVE_16_9_FILENAME = "thumbnail_16_9.jpg";
const ACTIVE_9_16_FILENAME = "thumbnail_9_16.jpg";

/**
 * Generates and stores a single thumbnail variant (16:9 or 9:16) on disk.
 */
export async function generateThumbnailVariant(params: GenerateVariantParams): Promise<VariantGenerationResult> {
  const { repository, channel, episode, ratio, prompt, plan, options, logger, nowTimestamp } = params;
  const versionId = `thumb_${ratio.replace(":", "_")}_${nowTimestamp}`;
  const variantFilename = `${versionId}.jpg`;
  const targets = resolveVariantFileTargets(repository, channel, episode, ratio, variantFilename);
  await mkdir(path.dirname(targets.variantAbsolute), { recursive: true });

  try {
    if (options.imageProvider) {
      await copyProviderGeneratedImage({ repository, channel, episode, ratio, prompt, options, targets });
    } else {
      await generateProviderAsset({ repository, channel, episode, ratio, prompt, options, logger, versionId, nowTimestamp, targets });
    }

    return buildVariantResult({ versionId, variantFilename, ratio, prompt, plan, channel, episode, targets });
  } catch (err) {
    return recoverFromVariantGenerationFailure({
      channel,
      episode,
      ratio,
      prompt,
      plan,
      options,
      logger,
      versionId,
      variantFilename,
      targets,
      err,
    });
  }
}

function resolveVariantFileTargets(
  repository: RepositoryService,
  channel: Channel,
  episode: Episode,
  ratio: "16:9" | "9:16",
  variantFilename: string,
): VariantFileTargets {
  const episodeDirectory = repository.resolvePath("channels", channel.slug, "episodes", episode.slug);
  const assetsDirectory = path.join(episodeDirectory, "assets");
  const activeFilename = ratio === "16:9" ? ACTIVE_16_9_FILENAME : ACTIVE_9_16_FILENAME;
  const episodeRelativePath = `channels/${channel.slug}/episodes/${episode.slug}`;

  return {
    variantAbsolute: path.join(assetsDirectory, "thumbnails", variantFilename),
    activeAbsolute: path.join(assetsDirectory, activeFilename),
    variantRelativePath: `${episodeRelativePath}/assets/thumbnails/${variantFilename}`,
    activeRelativePath: `${episodeRelativePath}/assets/${activeFilename}`,
  };
}

type CopyProviderGeneratedImageParams = {
  repository: RepositoryService;
  channel: Channel;
  episode: Episode;
  ratio: "16:9" | "9:16";
  prompt: string;
  options: GenerateEpisodeThumbnailOptions;
  targets: VariantFileTargets;
};

async function copyProviderGeneratedImage(params: CopyProviderGeneratedImageParams): Promise<void> {
  const { repository, channel, episode, ratio, prompt, options, targets } = params;
  const generated = await options.imageProvider!.generateReference(prompt);
  const sourceAbsolute = path.isAbsolute(generated.asset_path)
    ? generated.asset_path
    : path.resolve(repository.storageRoot, generated.asset_path);
  const fileData = await readFile(sourceAbsolute);
  await writeFile(targets.variantAbsolute, fileData);
  await writeFile(targets.activeAbsolute, fileData);
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
}

type GenerateProviderAssetParams = {
  repository: RepositoryService;
  channel: Channel;
  episode: Episode;
  ratio: "16:9" | "9:16";
  prompt: string;
  options: GenerateEpisodeThumbnailOptions;
  logger: StudioLogger;
  versionId: string;
  nowTimestamp: number;
  targets: VariantFileTargets;
};

async function generateProviderAsset(params: GenerateProviderAssetParams): Promise<void> {
  const { repository, channel, episode, ratio, prompt, options, logger, versionId, nowTimestamp, targets } = params;
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
    imageFallbackConfig: options.imageFallbackConfig,
    logger,
  });

  if (generated.entry.path) {
    const sourceAbsolute = path.isAbsolute(generated.entry.path)
      ? generated.entry.path
      : path.resolve(repository.storageRoot, generated.entry.path);
    const fileData = await readFile(sourceAbsolute);
    await writeFile(targets.variantAbsolute, fileData);
    await writeFile(targets.activeAbsolute, fileData);
  }
}

type BuildVariantResultParams = {
  versionId: string;
  variantFilename: string;
  ratio: "16:9" | "9:16";
  prompt: string;
  plan: QuizThumbnailPlan;
  channel: Channel;
  episode: Episode;
  targets: VariantFileTargets;
};

function buildVariantResult(params: BuildVariantResultParams): VariantGenerationResult {
  const { versionId, variantFilename, ratio, prompt, plan, targets } = params;
  return {
    versionId,
    variantFilename,
    assetPath: targets.activeRelativePath,
    historyItem: {
      id: versionId,
      aspect_ratio: ratio,
      layout: plan.layout,
      hook_text: plan.hookText,
      badge_text: plan.badgeText,
      prompt,
      file_path: targets.variantRelativePath,
      created_at: nowIso(),
      is_active: true,
    },
  };
}

type VariantGenerationFailureParams = {
  channel: Channel;
  episode: Episode;
  ratio: "16:9" | "9:16";
  prompt: string;
  plan: QuizThumbnailPlan;
  options: GenerateEpisodeThumbnailOptions;
  logger: StudioLogger;
  versionId: string;
  variantFilename: string;
  targets: VariantFileTargets;
  err: unknown;
};

async function recoverFromVariantGenerationFailure(params: VariantGenerationFailureParams): Promise<VariantGenerationResult> {
  const { channel, episode, ratio, prompt, plan, options, logger, versionId, variantFilename, targets, err } = params;
  logger.warn(`Failed to generate ${ratio} thumbnail via AI provider: ${(err as Error).message}`, {
    profileId: channel.channel_id,
    workerId: episode.episode_id,
  });
  if (options.throwOnError) {
    throw new Error(`Failed to generate ${ratio} thumbnail: ${(err as Error).message}`, { cause: err });
  }
  try {
    await readFile(targets.activeAbsolute);
  } catch {
    await writeFile(targets.activeAbsolute, Buffer.from(`AI_QUIZ_THUMBNAIL_${ratio.replace(":", "_")}_PLACEHOLDER`));
  }

  return buildVariantResult({ versionId, variantFilename, ratio, prompt, plan, channel, episode, targets });
}
