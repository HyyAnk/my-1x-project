import type { ImageProvider } from "../index.js";
import { type RepositoryService } from "../../repository.js";
import { generateIdempotencyKey } from "../gpti2Dimensions.js";
import { resolveImgStudioAspectRatio } from "./dimensions.js";
import { generateImgStudioImageBytes } from "./generator.js";
import type { ImgStudioImageTarget } from "./types.js";

export { type ImgStudioImageTarget };

export class ImgStudioQuizImageProvider {
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
    } = {},
  ) {}

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
    const idempotencyKey = generateIdempotencyKey(
      "quiz_std",
      `${this.target.channelId}:${this.target.episodeId}:${input.assetId}:${input.fingerprint}:${aspectRatio}`,
    );

    const result = await generateImgStudioImageBytes(input.prompt, {
      apiKey: this.options.apiKey,
      baseUrl: this.options.baseUrl,
      model: this.options.model,
      aspect_ratio: aspectRatio,
      resolution: this.options.resolution,
      quality: this.options.quality,
      idempotencyKey,
      cancellationSignal,
    });

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
    } = {},
  ) {}

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
    const idempotencyKey = generateIdempotencyKey(
      "bundle_std",
      `${this.target.channelId}:${this.target.episodeId}:bundle-${bundleNumber}:${variant}:${aspectRatio}:${prompt}`,
    );

    const result = await generateImgStudioImageBytes(prompt, {
      apiKey: this.options.apiKey,
      baseUrl: this.options.baseUrl,
      model: this.options.model,
      aspect_ratio: aspectRatio,
      resolution: this.options.resolution,
      quality: this.options.quality,
      idempotencyKey,
      cancellationSignal,
    });

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
