import { createHash } from "node:crypto";
import { generateGpti2ImageBytes } from "../gpti2Image.js";
import { GenerationError } from "../../shortReel/generationErrors.js";
import type {
  GeneratedImageBytes,
  PortraitImageClient,
  PortraitImageRequest,
} from "./imageGeneration.types.js";

export interface Gpti2PortraitAdapterOptions {
  apiKey?: string;
  model?: string;
  quality?: string;
}

export class Gpti2PortraitAdapter implements PortraitImageClient {
  public readonly supportsReferenceImage = true;

  constructor(private readonly options: Gpti2PortraitAdapterOptions = {}) {}

  async generate(request: PortraitImageRequest): Promise<GeneratedImageBytes> {
    if (request.signal.aborted) {
      throw new GenerationError("OPERATION_CANCELLED", "Image generation cancelled before dispatch.");
    }

    const apiKey = (
      this.options.apiKey ||
      process.env.GPTI2_API_KEY ||
      process.env.SHOPAIKEY_API_KEY ||
      ""
    ).trim();

    if (!apiKey) {
      throw new GenerationError(
        "IMAGE_PROVIDER_NOT_CONFIGURED",
        "API key for gpti2.store is not configured. Please enter your API key in Settings.",
      );
    }

    const model = (this.options.model || "gpt-image-2").trim();
    const promptHash = createHash("sha256").update(request.prompt).digest("hex").slice(0, 16);
    const refHash = createHash("sha256").update(request.reference.bytes).digest("hex").slice(0, 16);
    const seed = `${request.operationId}:${request.dependencyFingerprint}:${model}:${request.aspectRatio}:${refHash}:${promptHash}`;
    const idempotencyKey = `ptrt_${createHash("sha256").update(seed).digest("hex").slice(0, 24)}`;
    const referenceImageBase64 = Buffer.from(request.reference.bytes).toString("base64");

    try {
      const result = await generateGpti2ImageBytes(request.prompt, {
        apiKey,
        model,
        quality: this.options.quality || "low",
        aspect_ratio: request.aspectRatio,
        referenceImageBase64,
        idempotencyKey,
        cancellationSignal: request.signal,
      });

      if (request.signal.aborted) {
        throw new GenerationError("OPERATION_CANCELLED", "Image generation cancelled.");
      }

      return {
        bytes: result.bytes,
        provider: "gpti2",
        model: result.model || model,
        costVnd: result.price_vnd,
      };
    } catch (error: unknown) {
      if (error instanceof GenerationError) {
        throw error;
      }
      if (request.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
        throw new GenerationError("OPERATION_CANCELLED", "Image generation cancelled.", {
          cause: error,
        });
      }
      const rawMessage = error instanceof Error ? error.message : "Unknown image provider error";
      const sanitizedMessage = rawMessage.replaceAll(apiKey, "[REDACTED]");
      const isTimeout = /timeout|timed\s*out/i.test(sanitizedMessage);
      const isNotConfigured = /not\s*configured/i.test(sanitizedMessage);

      throw new GenerationError(
        isNotConfigured
          ? "IMAGE_PROVIDER_NOT_CONFIGURED"
          : isTimeout
            ? "IMAGE_TIMEOUT"
            : "IMAGE_PROVIDER_FAILED",
        sanitizedMessage,
        { cause: error },
      );
    }
  }
}
