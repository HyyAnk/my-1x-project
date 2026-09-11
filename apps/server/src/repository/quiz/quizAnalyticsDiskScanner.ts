import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { RepositoryRuntime } from "../runtime.js";

const IMAGE_FILE_PATTERN = /\.(png|jpe?g|webp)$/i;
const QUIZ_IMAGE_FALLBACK_PRICE_VND = 50;
const QUIZ_IMAGE_FALLBACK_MODEL = "gpt-image-2";
const SECONDARY_IMAGE_ASSET_SUBDIRS = ["thumbnails", "bundles"] as const;

export interface VoiceDiskMetrics {
  characters: number;
  durationSeconds: number;
  segments: number;
  hasRenderedVoice: boolean;
}

export interface ImageDiskMetrics {
  count: number;
  spendVnd: number;
  spendUsd: number;
  byProvider: Record<string, number>;
  byModel: Record<string, number>;
}

/**
 * Scans persisted voice plans and scene audio metadata for one episode and
 * aggregates the rendered voice/TTS metrics found on disk.
 */
export async function scanEpisodeVoiceMetrics(runtime: RepositoryRuntime, channelId: string, episodeId: string): Promise<VoiceDiskMetrics> {
  let characters = 0;
  let durationSeconds = 0;
  let segments = 0;
  let hasRenderedVoice = false;

  const voicePlan = await runtime.readVoicePlan(channelId, episodeId).catch(() => null);
  if (voicePlan?.segments?.length) {
    for (const segment of voicePlan.segments) {
      if (segment.duration_seconds && segment.duration_seconds > 0) {
        characters += (segment.text || "").length;
        durationSeconds += segment.duration_seconds;
        segments += 1;
        hasRenderedVoice = true;
      }
    }
  }

  const scenes = await runtime.readScenes(channelId, episodeId).catch(() => []);
  if (scenes?.length) {
    for (const scene of scenes) {
      if (scene.audio_asset_path && scene.audio_duration_seconds && scene.audio_duration_seconds > 0) {
        characters += (scene.dialogue || "").length;
        durationSeconds += scene.audio_duration_seconds;
        segments += 1;
        hasRenderedVoice = true;
      }
    }
  }

  return { characters, durationSeconds, segments, hasRenderedVoice };
}

/**
 * Scans persisted image assets (quiz-images with meta.json pricing, plus
 * thumbnails/bundles) for one episode and aggregates the image spend found on disk.
 */
export async function scanEpisodeImageMetrics(
  runtime: RepositoryRuntime,
  channelSlug: string,
  episodeSlug: string,
): Promise<ImageDiskMetrics> {
  let count = 0;
  let spendVnd = 0;
  let spendUsd = 0;
  const byProvider: Record<string, number> = {};
  const byModel: Record<string, number> = {};

  const recordImage = (priceVnd: number, model: string, provider?: string): void => {
    const costUsd = Number((priceVnd / 25500).toFixed(4));
    count += 1;
    spendVnd += priceVnd;
    spendUsd += costUsd;
    let providerKey = "gpti2";
    if (
      provider === "imgstudio" ||
      model.startsWith("imgstudio") ||
      model.includes("qwen") ||
      model === "2d059365-a09a-4fd5-aa9e-b5335d09bbe9"
    ) {
      providerKey = "imgstudio";
    } else if (model.startsWith("gemini")) {
      providerKey = "google";
    }
    byProvider[providerKey] = (byProvider[providerKey] || 0) + 1;
    byModel[model] = (byModel[model] || 0) + 1;
  };

  try {
    const quizImagesDir = runtime.resolvePath("channels", channelSlug, "episodes", episodeSlug, "assets", "quiz-images");
    const entries = await readdir(quizImagesDir, { withFileTypes: true }).catch(() => []);
    const imageFiles = entries.filter((e) => e.isFile() && IMAGE_FILE_PATTERN.test(e.name));

    for (const file of imageFiles) {
      const meta = await readQuizImageMeta(quizImagesDir, file.name);
      recordImage(meta.priceVnd, meta.model, meta.provider);
    }
  } catch {
    // directory may not exist
  }

  for (const assetSubdir of SECONDARY_IMAGE_ASSET_SUBDIRS) {
    try {
      const dir = runtime.resolvePath("channels", channelSlug, "episodes", episodeSlug, "assets", assetSubdir);
      const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
      const files = entries.filter((e) => e.isFile() && IMAGE_FILE_PATTERN.test(e.name));
      for (const _ of files) {
        recordImage(QUIZ_IMAGE_FALLBACK_PRICE_VND, QUIZ_IMAGE_FALLBACK_MODEL);
      }
    } catch {
      // directory may not exist
    }
  }

  return { count, spendVnd, spendUsd, byProvider, byModel };
}

async function readQuizImageMeta(
  quizImagesDir: string,
  imageFilename: string,
): Promise<{ priceVnd: number; model: string; provider?: string }> {
  const metaFilename = imageFilename.replace(IMAGE_FILE_PATTERN, ".meta.json");
  const metaPath = path.join(quizImagesDir, metaFilename);

  try {
    const rawMeta = JSON.parse(await readFile(metaPath, "utf8")) as {
      price_vnd?: number;
      model?: string;
      provider?: string;
    };
    const isImgStudio =
      rawMeta.provider === "imgstudio" ||
      (typeof rawMeta.model === "string" &&
        (rawMeta.model.startsWith("imgstudio") ||
          rawMeta.model.includes("qwen") ||
          rawMeta.model === "2d059365-a09a-4fd5-aa9e-b5335d09bbe9"));
    const fallbackPrice = isImgStudio ? 150 : QUIZ_IMAGE_FALLBACK_PRICE_VND;

    return {
      priceVnd: typeof rawMeta.price_vnd === "number" ? rawMeta.price_vnd : fallbackPrice,
      model: typeof rawMeta.model === "string" && rawMeta.model ? rawMeta.model : QUIZ_IMAGE_FALLBACK_MODEL,
      provider: typeof rawMeta.provider === "string" ? rawMeta.provider : isImgStudio ? "imgstudio" : undefined,
    };
  } catch {
    return { priceVnd: QUIZ_IMAGE_FALLBACK_PRICE_VND, model: QUIZ_IMAGE_FALLBACK_MODEL };
  }
}
