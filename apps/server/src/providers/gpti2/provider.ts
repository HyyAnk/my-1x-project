import type { ImageProvider } from "../index.js";
import { type RepositoryService } from "../../repository.js";
import { generateIdempotencyKey } from "../gpti2Dimensions.js";
import { generateGpti2ImageBytes } from "./generator.js";

export type Gpti2ImageTarget = {
  channelId: string;
  episodeId: string;
  bundleNumber?: number;
  variant?: number;
  assetId?: string;
  fingerprint?: string;
};

export class Gpti2ImageProvider implements ImageProvider {
  static isConfigured(apiKey?: string): boolean {
    return Boolean((apiKey || process.env.GPTI2_API_KEY || process.env.SHOPAIKEY_API_KEY || "").trim());
  }

  constructor(
    private readonly repository: RepositoryService,
    private readonly target: Gpti2ImageTarget,
    private readonly options: { apiKey?: string; model?: string; aspectRatio?: string } = {},
  ) {}

  async generateReference(
    prompt: string,
    cancellationSignal?: AbortSignal,
  ): Promise<{ asset_path: string; price_vnd?: number; price_breakdown?: Record<string, number>; model?: string; aspect_ratio?: string }> {
    const bundleNumber = this.target.bundleNumber ?? 1;
    const variant = this.target.variant ?? 0;
    const aspectRatio = this.options.aspectRatio || "16:9";
    const idempotencyKey = generateIdempotencyKey(
      "bundle",
      `${this.target.channelId}:${this.target.episodeId}:bundle-${bundleNumber}:${variant}:${aspectRatio}:${prompt}`,
    );

    const result = await generateGpti2ImageBytes(prompt, {
      apiKey: this.options.apiKey,
      model: this.options.model,
      aspect_ratio: aspectRatio,
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
        price_vnd: result.price_vnd,
        price_breakdown: result.price_breakdown,
        model: result.model,
        aspect_ratio: result.aspect_ratio || aspectRatio,
        size: result.size,
      },
    );

    return {
      asset_path: assetPath,
      price_vnd: result.price_vnd,
      price_breakdown: result.price_breakdown,
      model: result.model,
      aspect_ratio: result.aspect_ratio || aspectRatio,
    };
  }
}

export class Gpti2QuizImageProvider {
  static isConfigured(apiKey?: string): boolean {
    return Boolean((apiKey || process.env.GPTI2_API_KEY || process.env.SHOPAIKEY_API_KEY || "").trim());
  }

  constructor(
    private readonly repository: RepositoryService,
    private readonly target: { channelId: string; episodeId: string },
    private readonly options: { apiKey?: string; model?: string } = {},
  ) {}

  async generateAsset(
    input: { assetId: string; fingerprint: string; prompt: string; aspect_ratio?: string },
    cancellationSignal?: AbortSignal,
  ): Promise<{ path: string; price_vnd?: number; price_breakdown?: Record<string, number>; model?: string; aspect_ratio?: string }> {
    const aspectRatio = input.aspect_ratio || "1:1";
    const idempotencyKey = generateIdempotencyKey(
      "quiz",
      `${this.target.channelId}:${this.target.episodeId}:${input.assetId}:${input.fingerprint}:${aspectRatio}`,
    );

    const result = await generateGpti2ImageBytes(input.prompt, {
      apiKey: this.options.apiKey,
      model: this.options.model,
      aspect_ratio: aspectRatio,
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
        price_vnd: result.price_vnd,
        price_breakdown: result.price_breakdown,
        model: result.model,
        aspect_ratio: result.aspect_ratio || aspectRatio,
        size: result.size,
      },
    );

    return {
      path: assetPath,
      price_vnd: result.price_vnd,
      price_breakdown: result.price_breakdown,
      model: result.model,
      aspect_ratio: result.aspect_ratio || aspectRatio,
    };
  }
}
