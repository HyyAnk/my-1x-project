import { IMGSTUDIO_DEFAULT_MODEL_ID } from "@studio/shared";
import type { ImageProvider } from "../index.js";
import { type RepositoryService } from "../../repository.js";
import { resolveImgStudioAspectRatio, resolveImgStudioResolution } from "./dimensions.js";
import { generateImgStudioImageBytes } from "./generator.js";
import { createImgStudioIdempotencyKey, createImgStudioRunId } from "./idempotency.js";
import { validateReturnedImageDimensions } from "../../quiz/assets/imageDimensionValidator.js";
import type { ImgStudioImageTarget } from "./types.js";

export { type ImgStudioImageTarget };

export class ImgStudioQuizImageProvider {
  private readonly runId: string;

  static isConfigured(apiKey?: string): boolean {
    return Boolean((apiKey || process.env.IMGSTUDIO_API_KEY || "").trim());
  }

  constructor(
    private readonly repository: RepositoryService,
    private readonly target: { channelId: string; episodeId: string },
    private readonly options: {
      apiKey?: string;
      baseUrl?: string;
      model?: string;
      resolution?: string;
      quality?: string;
      runId?: string;
      idempotencyScope?: string;
    } = {},
  ) {
    this.runId = options.runId?.trim() || createImgStudioRunId();
  }

  async generateAsset(
    input: { assetId: string; fingerprint: string; prompt: string; aspect_ratio?: string },
    cancellationSignal?: AbortSignal,
  ): Promise<{
    path: string;
    price_vnd?: number;
    model?: string;
    aspect_ratio?: string;
    resolution?: string;
  }> {
    const aspectRatio = resolveImgStudioAspectRatio(input.aspect_ratio);
    const model = (this.options.model || IMGSTUDIO_DEFAULT_MODEL_ID).trim();
    const resolution = resolveImgStudioResolution(model, this.options.resolution);
    const quality = this.options.quality || "standard";
    const idempotencyKey = createImgStudioIdempotencyKey({
      workflow: "quiz-image",
      runId: this.runId,
      resource: JSON.stringify({
        channelId: this.target.channelId,
        episodeId: this.target.episodeId,
        assetId: input.assetId,
        fingerprint: input.fingerprint,
        aspectRatio,
        resolution,
        quality,
      }),
      tier: this.options.idempotencyScope || "primary",
      model,
    });

    const result = await generateImgStudioImageBytes(input.prompt, {
      apiKey: this.options.apiKey,
      baseUrl: this.options.baseUrl,
      model,
      aspect_ratio: aspectRatio,
      resolution,
      quality,
      idempotencyKey,
      cancellationSignal,
    });
    cancellationSignal?.throwIfAborted();

    validateReturnedImageDimensions(result.bytes, aspectRatio, result.resolution);
    cancellationSignal?.throwIfAborted();

    const assetPath = await this.repository.writeQuizImageAsset(
      this.target.channelId,
      this.target.episodeId,
      input.assetId,
      input.fingerprint,
      result.bytes,
      {
        price_vnd: result.price_vnd ?? 150,
        model: result.model,
        aspect_ratio: result.aspect_ratio || aspectRatio,
        size: result.resolution,
        provider: "imgstudio",
      },
    );
    cancellationSignal?.throwIfAborted();

    const costVnd = result.price_vnd ?? 150;
    const costUsd = Number((costVnd / 25000).toFixed(4));
    await this.repository
      .recordImageUsage({
        channelId: this.target.channelId,
        episodeId: this.target.episodeId,
        provider: "imgstudio",
        model: result.model,
        count: 1,
        costVnd,
        costUsd,
        note: `Quiz asset ${input.assetId}`,
      })
      .catch(() => undefined);

    return {
      path: assetPath,
      price_vnd: result.price_vnd,
      model: result.model,
      aspect_ratio: result.aspect_ratio || aspectRatio,
      resolution: result.resolution,
    };
  }
}

export class ImgStudioImageProvider implements ImageProvider {
  private readonly runId: string;

  static isConfigured(apiKey?: string): boolean {
    return Boolean((apiKey || process.env.IMGSTUDIO_API_KEY || "").trim());
  }

  constructor(
    private readonly repository: RepositoryService,
    private readonly target: ImgStudioImageTarget,
    private readonly options: {
      apiKey?: string;
      baseUrl?: string;
      model?: string;
      aspectRatio?: string;
      resolution?: string;
      quality?: string;
      runId?: string;
      idempotencyScope?: string;
    } = {},
  ) {
    this.runId = options.runId?.trim() || target.taskId?.trim() || createImgStudioRunId();
  }

  async generateReference(
    prompt: string,
    cancellationSignal?: AbortSignal,
  ): Promise<{
    asset_path: string;
    price_vnd?: number;
    model?: string;
    aspect_ratio?: string;
    resolution?: string;
  }> {
    const bundleNumber = this.target.bundleNumber ?? 1;
    const variant = this.target.variant ?? 0;
    const aspectRatio = resolveImgStudioAspectRatio(this.options.aspectRatio, "16:9");
    const model = (this.options.model || IMGSTUDIO_DEFAULT_MODEL_ID).trim();
    const resolution = resolveImgStudioResolution(model, this.options.resolution);
    const quality = this.options.quality || "standard";
    const idempotencyKey = createImgStudioIdempotencyKey({
      workflow: "bundle-image",
      runId: this.runId,
      resource: JSON.stringify({
        channelId: this.target.channelId,
        episodeId: this.target.episodeId,
        bundleNumber,
        variant,
        aspectRatio,
        prompt,
        resolution,
        quality,
      }),
      tier: this.options.idempotencyScope || "primary",
      model,
    });

    const result = await generateImgStudioImageBytes(prompt, {
      apiKey: this.options.apiKey,
      baseUrl: this.options.baseUrl,
      model,
      aspect_ratio: aspectRatio,
      resolution,
      quality,
      idempotencyKey,
      cancellationSignal,
    });
    cancellationSignal?.throwIfAborted();

    const assetPath = await this.repository.writeBundleImage(
      this.target.channelId,
      this.target.episodeId,
      bundleNumber,
      result.bytes,
      variant,
      {
        price_vnd: result.price_vnd ?? 150,
        model: result.model,
        aspect_ratio: result.aspect_ratio || aspectRatio,
        size: result.resolution,
        provider: "imgstudio",
      },
    );
    cancellationSignal?.throwIfAborted();

    const costVnd = result.price_vnd ?? 150;
    const costUsd = Number((costVnd / 25000).toFixed(4));
    await this.repository
      .recordImageUsage({
        channelId: this.target.channelId,
        episodeId: this.target.episodeId,
        provider: "imgstudio",
        model: result.model,
        count: 1,
        costVnd,
        costUsd,
        note: `Bundle ${bundleNumber} variant ${variant}`,
      })
      .catch(() => undefined);

    return {
      asset_path: assetPath,
      price_vnd: result.price_vnd,
      model: result.model,
      aspect_ratio: result.aspect_ratio || aspectRatio,
      resolution: result.resolution,
    };
  }
}
