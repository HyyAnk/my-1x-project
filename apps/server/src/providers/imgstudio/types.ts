import type { ImgStudioResolution } from "@studio/shared";

export type ImgStudioAspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "2:3" | "3:2";

export interface ImgStudioGenerationRequest {
  model: string;
  prompt: string;
  aspect_ratio: string;
  resolution: string;
  quality: "standard" | "high" | string;
  image?: string;
}

export interface ImgStudioGenerationResponseItem {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
  price_vnd?: number;
  [key: string]: unknown;
}

export interface ImgStudioGenerationResponse {
  code?: number;
  message?: string;
  data?: ImgStudioGenerationResponseItem | ImgStudioGenerationResponseItem[];
  url?: string;
  b64_json?: string;
  price_vnd?: number;
  error?: {
    message?: string;
    code?: string | number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ImgStudioImageResult {
  bytes: Uint8Array;
  model: string;
  aspect_ratio: string;
  resolution: string;
  price_vnd?: number;
  url?: string;
}

export interface ImgStudioCallOptions {
  apiKey: string;
  baseUrl?: string;
  idempotencyKey?: string;
  cancellationSignal?: AbortSignal;
}

export interface ImgStudioGenerationOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  aspect_ratio?: string;
  resolution?: string;
  quality?: "standard" | "high" | string;
  idempotencyKey?: string;
  referenceImage?: string;
  cancellationSignal?: AbortSignal;
  priceVnd?: number;
}

export interface ImgStudioConnectivityResult {
  ok: boolean;
  models?: unknown[];
  error?: string;
}

export interface ImgStudioImageTarget {
  channelId: string;
  episodeId: string;
  bundleNumber?: number;
  variant?: number;
  assetId?: string;
  fingerprint?: string;
}
