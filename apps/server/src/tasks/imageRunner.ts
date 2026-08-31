import { nowIso, type Task } from "@studio/shared";
import { RepositoryError } from "../repository.js";
import { CodexImageProvider } from "../providers/codexImage.js";
import { ShopAiKeyImageProvider } from "../providers/shopAiKeyImage.js";
import { AntigravityImageChainProvider } from "../providers/antigravityImageChain.js";
import { Gpti2ImageProvider } from "../providers/gpti2Image.js";
import type { ImageProvider } from "../providers/index.js";
import { parseContinuityBundles, replaceBundleAnchorPrompt } from "../visualBundles.js";
import { isContentFilterError, extractFilterReason, sanitizeImagePromptWithLLM } from "../utils/promptSanitizer.js";
import type { TaskManagerRuntime } from "./runtime.js";

export function createImageProvider(
  this: TaskManagerRuntime,
  imageTarget: { channelId: string; episodeId: string; bundleNumber: number; variant: number; theme?: string },
  output?: string,
): ImageProvider {
  const providerType = this.imageConfig.provider ?? "gpti2";
  if (providerType === "gpti2" && Gpti2ImageProvider.isConfigured(this.imageConfig.api_key)) {
    return new Gpti2ImageProvider(this.repository, imageTarget, {
      apiKey: this.imageConfig.api_key,
      model: this.imageConfig.model,
    });
  }
  if (providerType === "shopaikey" && (this.imageConfig.api_key || ShopAiKeyImageProvider.isConfigured())) {
    return new ShopAiKeyImageProvider(this.repository, imageTarget, {
      apiKey: this.imageConfig.api_key || process.env.SHOPAIKEY_API_KEY,
      baseUrl: this.imageConfig.base_url || "https://direct.shopaikey.com/v1",
      model: this.imageConfig.model || "gpt-image-2",
      quality: this.imageConfig.quality,
    });
  }
  if (providerType === "custom" && this.imageConfig.api_key) {
    return new ShopAiKeyImageProvider(this.repository, imageTarget, {
      apiKey: this.imageConfig.api_key,
      baseUrl: this.imageConfig.base_url || "https://api.openai.com/v1",
      model: this.imageConfig.model || "gpt-image-2",
      quality: this.imageConfig.quality,
    });
  }
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
  visualBibleContent?: string,
): Promise<{ image: { asset_path: string }; updatedPrompt?: string }> {
  let currentPrompt = initialPrompt;
  const maxAttempts = 2;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxAttempts; attempt++) {
    try {
      const provider = this.createImageProvider(imageTarget, output);
      const image = await provider.generateReference(currentPrompt, signal);
      return { image, updatedPrompt: currentPrompt !== initialPrompt ? currentPrompt : undefined };
    } catch (err) {
      lastError = err;
      if (signal?.aborted || this.get(task.task_id).status === "CANCELLED") throw err;
      if (isContentFilterError(err) && attempt < maxAttempts) {
        const reason = extractFilterReason(err);
        const client = this.activeEngine === "antigravity" && this.antigravity ? this.antigravity : this.codex;
        const engineLabel = this.activeEngine === "antigravity" ? "Antigravity" : "Codex";
        this.logger.warn(
          `Style anchor ${imageTarget.bundleNumber} prompt rejected by content filter (${reason}). Auto-rephrasing with ${engineLabel} (attempt ${attempt + 1}/${maxAttempts})...`,
          {
            profileId: imageTarget.channelId,
            step: "image_safety_rephrase",
          },
        );
        await this.update(task.task_id, {
          progress_message: `Prompt rejected by safety filter. Auto-rephrasing with ${engineLabel} (${attempt + 1}/${maxAttempts})...`,
        });
        const rephrased = await sanitizeImagePromptWithLLM({
          client,
          originalPrompt: currentPrompt,
          rejectionReason: reason,
          context: `Style anchor continuity bundle CB-${String(imageTarget.bundleNumber).padStart(2, "0")}`,
          signal,
        });
        if (rephrased && rephrased !== currentPrompt) {
          currentPrompt = rephrased;
          if (visualBibleContent) {
            const updated = replaceBundleAnchorPrompt(visualBibleContent, imageTarget.bundleNumber, rephrased);
            if (updated !== visualBibleContent) {
              await this.repository
                .saveEpisodeFile(imageTarget.channelId, imageTarget.episodeId, "visual_bible.md", updated)
                .catch(() => undefined);
              visualBibleContent = updated;
            }
          }
          await this.update(task.task_id, {
            progress_message: `Retrying continuity image with sanitized prompt (${attempt + 1}/${maxAttempts})`,
            progress_percent: 45,
          });
          continue;
        }
      }
      throw err;
    }
  }
  throw lastError ?? new Error("Failed to generate continuity image");
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
