import { GenerationError } from "../../shortReel/generationErrors.js";
import { Gpti2PortraitAdapter } from "./gpti2PortraitAdapter.js";
import { ImgStudioPortraitAdapter } from "./imgstudioPortraitAdapter.js";
import type {
  GeneratedImageBytes,
  PortraitImageClient,
  PortraitImageRequest,
} from "./imageGeneration.types.js";

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

  async generate(_request: PortraitImageRequest): Promise<GeneratedImageBytes> {
    throw new GenerationError(
      "REFERENCE_INPUT_UNSUPPORTED",
      `Image provider "${this.provider}" does not support reference image conditioning. Configure gpti2 in Settings to generate Short-Reel visual assets.`,
    );
  }
}

class FallbackResilientPortraitAdapter implements PortraitImageClient {
  public readonly supportsReferenceImage: boolean;

  constructor(
    private readonly primary: PortraitImageClient,
    private readonly fallback?: PortraitImageClient,
  ) {
    this.supportsReferenceImage =
      primary.supportsReferenceImage || (fallback?.supportsReferenceImage ?? false);
  }

  async generate(request: PortraitImageRequest): Promise<GeneratedImageBytes> {
    try {
      return await this.primary.generate(request);
    } catch (primaryError) {
      if (request.signal.aborted || !this.fallback) {
        throw primaryError;
      }
      return await this.fallback.generate(request);
    }
  }
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
    });
  } else {
    primaryAdapter = new UnsupportedPortraitAdapter(provider || "unknown");
  }

  const isFallbackEnabled =
    fallbackConfig?.enabled !== false &&
    Boolean((fallbackConfig?.api_key || process.env.IMGSTUDIO_API_KEY || "").trim());

  if (isFallbackEnabled) {
    const fallbackAdapter = new ImgStudioPortraitAdapter({
      apiKey: fallbackConfig?.api_key,
      baseUrl: fallbackConfig?.base_url,
      model: fallbackConfig?.model,
      resolution: fallbackConfig?.resolution,
      quality: fallbackConfig?.quality,
    });
    return new FallbackResilientPortraitAdapter(primaryAdapter, fallbackAdapter);
  }

  return primaryAdapter;
}

export type {
  GeneratedImageBytes,
  ImageReferenceInput,
  PortraitImageClient,
  PortraitImageRequest,
} from "./imageGeneration.types.js";
