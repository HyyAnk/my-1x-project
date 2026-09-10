import { createHash } from "node:crypto";
import { generateImgStudioImageBytes } from "../imgstudio/generator.js";
import { GenerationError } from "../../shortReel/generationErrors.js";
import { IMGSTUDIO_DEFAULT_MODEL_ID } from "@studio/shared";
import type {
  GeneratedImageBytes,
  PortraitImageClient,
  PortraitImageRequest,
} from "./imageGeneration.types.js";

export interface ImgStudioPortraitAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  resolution?: "1K" | "2K" | "4K";
  quality?: "standard" | "high";
}

export class ImgStudioPortraitAdapter implements PortraitImageClient {
  public readonly supportsReferenceImage = true;

  constructor(private readonly options: ImgStudioPortraitAdapterOptions = {}) {}

  async generate(request: PortraitImageRequest): Promise<GeneratedImageBytes> {
    if (request.signal.aborted) {
      throw new GenerationError("OPERATION_CANCELLED", "Image generation cancelled before dispatch.");
    }

    const apiKey = (this.options.apiKey || process.env.IMGSTUDIO_API_KEY || "").trim();
    if (!apiKey) {
      throw new GenerationError(
        "IMAGE_PROVIDER_NOT_CONFIGURED",
        "API key for ImgStudio is not configured. Please enter your API key in Settings.",
      );
    }

    const model = (this.options.model || IMGSTUDIO_DEFAULT_MODEL_ID).trim();
    const promptHash = createHash("sha256").update(request.prompt).digest("hex").slice(0, 16);
    const refHash = createHash("sha256").update(request.reference.bytes).digest("hex").slice(0, 16);
    const seed = `${request.operationId}:${request.dependencyFingerprint}:${model}:${request.aspectRatio}:${refHash}:${promptHash}`;
    const idempotencyKey = `ptrt_img_${createHash("sha256").update(seed).digest("hex").slice(0, 24)}`;
    const referenceImage = Buffer.from(request.reference.bytes).toString("base64");

    try {
      const result = await generateImgStudioImageBytes(request.prompt, {
        apiKey,
        baseUrl: this.options.baseUrl,
        model,
        resolution: this.options.resolution || "2K",
        quality: this.options.quality || "standard",
        aspect_ratio: request.aspectRatio,
        referenceImage,
        idempotencyKey,
        cancellationSignal: request.signal,
      });

      if (request.signal.aborted) {
        throw new GenerationError("OPERATION_CANCELLED", "Image generation cancelled.");
      }

      return {
        bytes: result.bytes,
        provider: "imgstudio",
        model: result.model || model,
        costVnd: result.price_vnd,
      };
    } catch (error) {
      if (request.signal.aborted) {
        throw new GenerationError("OPERATION_CANCELLED", "Image generation cancelled.");
      }
      if (error instanceof GenerationError) throw error;
      throw new GenerationError(
        "IMAGE_PROVIDER_FAILED",
        `ImgStudio portrait generation failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }
}
