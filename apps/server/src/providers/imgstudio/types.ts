export type ImgStudioAspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "2:3" | "3:2";

export interface ImgStudioGenerationRequest {
  provider_id: string;
  prompt: string;
  aspect_ratio: string;
  resolution: string;
  quality: "standard" | "high" | (string & {});
  /** Raw base64 PNG or an image data URL. Requests with this field use the native edit endpoint. */
  image?: string;
}

export interface ImgStudioGenerationResponseItem {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
  price_vnd?: number;
}

export interface ImgStudioGenerationResponse {
  id?: string;
  status?: "completed" | "processing" | "failed" | (string & {});
  prompt?: string;
  provider_name?: string;
  model?: string;
  aspect_ratio?: string;
  resolution?: string;
  quality?: string;
  cost_vnd?: number;
  balance_vnd?: number;
  created_at?: string;
  reused?: boolean;
  code?: number;
  message?: string;
  data?: ImgStudioGenerationResponseItem | ImgStudioGenerationResponseItem[];
  url?: string;
  b64_json?: string;
  price_vnd?: number;
  error?: {
    message?: string;
    code?: string | number;
  };
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
  quality?: "standard" | "high" | (string & {});
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
  taskId?: string;
}
