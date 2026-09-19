import { GenerationError } from "../../shortReel/generationErrors.js";
import { resolveImgStudioFallbackModels } from "../imgstudio/fallbackModels.js";
import { Gpti2PortraitAdapter } from "./gpti2PortraitAdapter.js";
import { ImgStudioPortraitAdapter } from "./imgstudioPortraitAdapter.js";
import type { GeneratedImageBytes, PortraitImageClient, PortraitImageRequest } from "./imageGeneration.types.js";

export interface PortraitImageClientConfig {
  enabled?: boolean;
  provider?: string;
  api_key?: string;
  model?: string;
  quality?: string;
  base_url?: string;
  images_per_bundle?: number;
  max_concurrent_tasks?: number;
}

export interface PortraitFallbackConfig {
  enabled?: boolean;
  provider?: "imgstudio";
  api_key?: string;
  base_url?: string;
  model?: string;
  resolution?: "1K" | "2K" | "4K";
  quality?: "standard" | "high";
}

class UnsupportedPortraitAdapter implements PortraitImageClient {
  public readonly supportsReferenceImage = false;

  constructor(private readonly provider: string) {}

  generate(_request: PortraitImageRequest): Promise<GeneratedImageBytes> {
    return Promise.reject(
      new GenerationError(
        "REFERENCE_INPUT_UNSUPPORTED",
        `Image provider "${this.provider}" does not support reference image conditioning. Configure gpti2 in Settings to generate Short-Reel visual assets.`,
      ),
    );
  }
}

class FallbackResilientPortraitAdapter implements PortraitImageClient {
  public readonly supportsReferenceImage: boolean;

  constructor(
    private readonly primary: PortraitImageClient,
    private readonly fallbackLevel1?: PortraitImageClient,
    private readonly fallbackLevel2?: PortraitImageClient,
  ) {
    this.supportsReferenceImage =
      primary.supportsReferenceImage ||
      (fallbackLevel1?.supportsReferenceImage ?? false) ||
      (fallbackLevel2?.supportsReferenceImage ?? false);
  }

  async generate(request: PortraitImageRequest): Promise<GeneratedImageBytes> {
    try {
      return await this.primary.generate(request);
    } catch (primaryError) {
      if (isPortraitGenerationCancelled(primaryError, request.signal) || !this.fallbackLevel1) {
        throw primaryError;
      }
      try {
        return await this.fallbackLevel1.generate(request);
      } catch (fallback1Error) {
        if (isPortraitGenerationCancelled(fallback1Error, request.signal) || !this.fallbackLevel2) {
          throw fallback1Error;
        }
        return this.fallbackLevel2.generate(request);
      }
    }
  }
}

function isPortraitGenerationCancelled(error: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (error instanceof GenerationError && error.code === "OPERATION_CANCELLED");
}

export function createPortraitImageClient(
  config?: PortraitImageClientConfig | null,
  fallbackConfig?: PortraitFallbackConfig | null,
): PortraitImageClient {
  const provider = (config?.provider || "gpti2").toLowerCase().trim();

  let primaryAdapter: PortraitImageClient;
  if (provider === "gpti2") {
    primaryAdapter = new Gpti2PortraitAdapter({
      apiKey: config?.api_key,
      model: config?.model,
      quality: config?.quality,
    });
  } else if (provider === "imgstudio") {
    primaryAdapter = new ImgStudioPortraitAdapter({
      apiKey: config?.api_key,
      baseUrl: config?.base_url,
      model: config?.model,
      quality: config?.quality as "standard" | "high",
      idempotencyScope: "primary",
    });
  } else {
    primaryAdapter = new UnsupportedPortraitAdapter(provider || "unknown");
  }

  const isFallbackEnabled =
    fallbackConfig?.enabled !== false && Boolean((fallbackConfig?.api_key || process.env.IMGSTUDIO_API_KEY || "").trim());

  if (isFallbackEnabled) {
    const fallbackModels = resolveImgStudioFallbackModels(fallbackConfig?.model);
    const fallbackAdapter1 = new ImgStudioPortraitAdapter({
      apiKey: fallbackConfig?.api_key,
      baseUrl: fallbackConfig?.base_url,
      model: fallbackModels.level1,
      resolution: fallbackConfig?.resolution,
      quality: fallbackConfig?.quality,
      idempotencyScope: "fallback-level-1",
    });
    const fallbackAdapter2 = new ImgStudioPortraitAdapter({
      apiKey: fallbackConfig?.api_key,
      baseUrl: fallbackConfig?.base_url,
      model: fallbackModels.level2,
      resolution: fallbackConfig?.resolution,
      quality: fallbackConfig?.quality,
      idempotencyScope: "fallback-level-2",
    });
    return new FallbackResilientPortraitAdapter(primaryAdapter, fallbackAdapter1, fallbackAdapter2);
  }

  return new FallbackResilientPortraitAdapter(primaryAdapter);
}

export type { GeneratedImageBytes, ImageReferenceInput, PortraitImageClient, PortraitImageRequest } from "./imageGeneration.types.js";
