import { nowIso, type Task } from "@studio/shared";
import { RepositoryError } from "../repository.js";
import { CodexImageProvider } from "../providers/codexImage.js";
import { ShopAiKeyImageProvider } from "../providers/shopAiKeyImage.js";
import { AntigravityImageChainProvider } from "../providers/antigravityImageChain.js";
import { Gpti2ImageProvider } from "../providers/gpti2Image.js";
import { ImgStudioImageProvider } from "../providers/imgstudio/index.js";
import type { ImageProvider } from "../providers/index.js";
import { parseContinuityBundles } from "../visualBundles.js";
import { isContentFilterError } from "../utils/promptSanitizer.js";
import type { TaskManagerRuntime } from "./runtime.js";

function tryCreateExplicitProvider(
  runtime: TaskManagerRuntime,
  imageTarget: { channelId: string; episodeId: string; bundleNumber: number; variant: number; theme?: string },
): ImageProvider | null {
  const providerType: string = runtime.imageConfig.provider ?? "gpti2";
  const { api_key, model, quality, base_url } = runtime.imageConfig;

  if (providerType === "gpti2" && Gpti2ImageProvider.isConfigured(api_key)) {
    return new Gpti2ImageProvider(runtime.repository, imageTarget, { apiKey: api_key, model });
  }

  const fallbackKey = runtime.imageFallbackConfig?.api_key;
  if (providerType === "imgstudio" && (api_key || ImgStudioImageProvider.isConfigured(fallbackKey))) {
    return new ImgStudioImageProvider(runtime.repository, imageTarget, {
      apiKey: api_key || fallbackKey,
      baseUrl: base_url || runtime.imageFallbackConfig?.base_url,
      model: model || runtime.imageFallbackConfig?.model,
      quality: quality || runtime.imageFallbackConfig?.quality,
    });
  }

  if (providerType === "shopaikey" && (api_key || ShopAiKeyImageProvider.isConfigured())) {
    return new ShopAiKeyImageProvider(runtime.repository, imageTarget, {
      apiKey: api_key || process.env.SHOPAIKEY_API_KEY,
      baseUrl: base_url || "https://direct.shopaikey.com/v1",
      model: model || "gpt-image-2",
      quality,
    });
  }

  if (providerType === "custom" && api_key) {
    return new ShopAiKeyImageProvider(runtime.repository, imageTarget, {
      apiKey: api_key,
      baseUrl: base_url || "https://api.openai.com/v1",
      model: model || "gpt-image-2",
      quality,
    });
  }

  return null;
}

export function createImageProvider(
  this: TaskManagerRuntime,
  imageTarget: { channelId: string; episodeId: string; bundleNumber: number; variant: number; theme?: string },
  output?: string,
): ImageProvider {
  const explicit = tryCreateExplicitProvider(this, imageTarget);
  if (explicit) return explicit;

  if (this.activeEngine === "antigravity" && this.antigravity) {
    return new AntigravityImageChainProvider(this.repository, imageTarget, this.antigravity, { allowTier3Fallback: false });
  }
  if (ShopAiKeyImageProvider.isConfigured(this.imageConfig.api_key)) {
    return new ShopAiKeyImageProvider(this.repository, imageTarget, {
      apiKey: this.imageConfig.api_key || process.env.SHOPAIKEY_API_KEY,
      baseUrl: this.imageConfig.base_url || "https://direct.shopaikey.com/v1",
      model: this.imageConfig.model,
    });
  }
  return new CodexImageProvider(this.repository, imageTarget, output ?? "");
}

export async function generateBundleImageWithSafetyRetry(
  this: TaskManagerRuntime,
  task: Task,
  imageTarget: { channelId: string; episodeId: string; bundleNumber: number; variant: number; theme?: string },
  initialPrompt: string,
  signal?: AbortSignal,
  output?: string,
  _visualBibleContent?: string,
): Promise<{ image: { asset_path: string }; updatedPrompt?: string }> {
  const maxAttempts = 2;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxAttempts; attempt++) {
    try {
      const provider = this.createImageProvider(imageTarget, output);
      const image = await provider.generateReference(initialPrompt, signal);
      await this.repository
        .recordImageUsage({
          channelId: imageTarget.channelId,
          episodeId: imageTarget.episodeId,
          provider: this.imageConfig.provider ?? "gpti2",
          model: this.imageConfig.model,
          count: 1,
          note: `Continuity bundle image CB-${String(imageTarget.bundleNumber).padStart(2, "0")}`,
        })
        .catch(() => undefined);
      return { image };
    } catch (err) {
      lastError = err;
      if (signal?.aborted || this.get(task.task_id).status === "CANCELLED") throw err;
      if (isContentFilterError(err)) {
        throw err;
      }
      if (attempt < maxAttempts) {
        this.logger.warn(
          `Style anchor ${imageTarget.bundleNumber} generation attempt ${attempt + 1} failed (${err instanceof Error ? err.message : String(err)}). Retrying...`,
          {
            profileId: imageTarget.channelId,
            step: "image_transient_retry",
          },
        );
        continue;
      }
    }
  }

  const fallbackConfig = this.imageFallbackConfig;
  if (
    fallbackConfig &&
    fallbackConfig.enabled !== false &&
    ImgStudioImageProvider.isConfigured(fallbackConfig.api_key)
  ) {
    this.logger.warn(
      `Primary image provider failed for bundle CB-${String(imageTarget.bundleNumber).padStart(2, "0")} (${(lastError as Error)?.message}). Initiating fallback to ImgStudio...`,
      { profileId: imageTarget.channelId, step: "IMAGE_FALLBACK_TRIGGERED" },
    );
    try {
      const fallbackProvider = new ImgStudioImageProvider(this.repository, imageTarget, {
        apiKey: fallbackConfig.api_key,
        baseUrl: fallbackConfig.base_url,
        model: fallbackConfig.model,
        resolution: fallbackConfig.resolution,
        quality: fallbackConfig.quality,
      });
      const image = await fallbackProvider.generateReference(initialPrompt, signal);
      await this.repository
        .recordImageUsage({
          channelId: imageTarget.channelId,
          episodeId: imageTarget.episodeId,
          provider: "imgstudio",
          model: fallbackConfig.model,
          count: 1,
          note: `Continuity bundle image CB-${String(imageTarget.bundleNumber).padStart(2, "0")} (fallback)`,
        })
        .catch(() => undefined);
      return { image };
    } catch (fallbackErr) {
      this.logger.error(
        `ImgStudio fallback generation also failed for bundle CB-${String(imageTarget.bundleNumber).padStart(2, "0")}: ${(fallbackErr as Error)?.message}`,
        { profileId: imageTarget.channelId },
      );
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error(typeof lastError === "string" ? lastError : "Failed to generate continuity image");
}

export type BundleImageExecutionOptions = {
  step: string;
  progressMessage: string;
  withTheme?: boolean;
};

export async function executeBundleImageTask(this: TaskManagerRuntime, task: Task, options: BundleImageExecutionOptions): Promise<void> {
  const context = { profileId: task.channel_id, workerId: task.task_id, step: options.step };
  const controller = new AbortController();
  this.activeImageControllers.set(task.task_id, controller);
  try {
    await this.update(task.task_id, {
      status: "RUNNING",
      started_at: nowIso(),
      queue_position: null,
      progress_message: "Preparing continuity context",
      progress_percent: 10,
    });
    if (!task.episode_id) throw new RepositoryError("Episode is required", "EPISODE_REQUIRED");
    const bundleNumber = this.findSceneNumber(task.task_id);
    if (!bundleNumber) throw new RepositoryError("Bundle number is required", "BUNDLE_REQUIRED");

    const variant = this.imageVariants.get(task.task_id) ?? 0;
    const manifest = await this.contextEngine.build(task.task_type, task.channel_id, task.episode_id, bundleNumber, variant);

    await this.update(task.task_id, { progress_message: options.progressMessage, progress_percent: 35 });
    const visualBible = await this.repository.getEpisodeFile(task.channel_id, task.episode_id, "visual_bible.md").catch(() => null);
    let promptToUse = manifest.prompt;
    if (visualBible?.content) {
      const bundles = parseContinuityBundles(visualBible.content);
      const bundle = bundles.find((b) => b.bundle_number === bundleNumber);
      if (bundle?.anchor_prompt) {
        promptToUse = bundle.anchor_prompt;
      }
    }

    let theme: string | undefined;
    if (options.withTheme) {
      const episode = await this.repository.getEpisode(task.channel_id, task.episode_id).catch(() => null);
      theme = episode?.quiz_config?.visual_theme;
    }

    const imageTarget = {
      channelId: task.channel_id,
      episodeId: task.episode_id,
      bundleNumber,
      variant,
      theme,
    };

    const { image } = await this.generateBundleImageWithSafetyRetry(
      task,
      imageTarget,
      promptToUse,
      controller.signal,
      undefined,
      visualBible?.content,
    );
    if (controller.signal.aborted || this.get(task.task_id).status === "CANCELLED") return;
    const bundleId = `CB-${String(bundleNumber).padStart(2, "0")}`;
    await this.repository.attachBundleReference(task.channel_id, task.episode_id, bundleId, image.asset_path);
    await this.update(task.task_id, { progress_message: "Saving continuity image", progress_percent: 90 });
    await this.finish(task.task_id, "COMPLETED", null, [image.asset_path]);
  } catch (error) {
    if (this.get(task.task_id).status === "CANCELLED") return;
    const message = error instanceof Error ? error.message : "Image generation failed";
    await this.finish(task.task_id, "FAILED", message);
    this.logger.error(message, { ...context, step: options.step });
  } finally {
    this.activeImageControllers.delete(task.task_id);
  }
}

export function runGpti2BundleImageTask(this: TaskManagerRuntime, task: Task): Promise<void> {
  const imageModel = this.imageConfig.model || "gpt-image-2";
  return executeBundleImageTask.call(this, task, {
    step: "run_gpti2_image",
    progressMessage: `Generating continuity image (${imageModel})`,
  });
}

export function runAntigravityBundleImageTask(this: TaskManagerRuntime, task: Task): Promise<void> {
  return executeBundleImageTask.call(this, task, {
    step: "run_antigravity_image",
    progressMessage: "Generating continuity image (3-tier chain)",
    withTheme: true,
  });
}

export function runShopAiKeyImageTask(this: TaskManagerRuntime, task: Task): Promise<void> {
  return executeBundleImageTask.call(this, task, {
    step: "run_image",
    progressMessage: "Generating continuity image",
  });
}
