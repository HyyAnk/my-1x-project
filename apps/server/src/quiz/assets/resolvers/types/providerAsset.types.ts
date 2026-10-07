import type { QuizAssetPlan, QuizAssetResolution } from "@studio/shared";
import type { RepositoryService } from "../../../../repository.js";
import type { StudioLogger } from "../../../../logger.js";
import type { AntigravityClient } from "../../../../antigravity.js";
import type { ProviderCircuitBreaker } from "../circuitBreaker.js";

export interface ProviderAssetImageConfig {
  api_key?: string;
  model?: string;
  provider?: "gpti2" | "shopaikey" | "custom" | "google" | "imgstudio";
  base_url?: string;
  quality?: string;
  gpti2_api_key?: string;
  gpti2_model?: string;
}

export interface ProviderAssetImageFallbackConfig {
  enabled?: boolean;
  provider?: "imgstudio";
  base_url?: string;
  api_key?: string;
  model?: string;
  resolution?: "1K" | "2K" | "4K";
  quality?: "standard" | "high";
  gpti2_api_key?: string;
  gpti2_model?: string;
  level1_model?: string;
  level2_model?: string;
  level3_model?: string;
}

export interface ProviderAssetInput {
  repository: RepositoryService;
  channelId: string;
  episodeId: string;
  request: QuizAssetPlan["assets"][number];
  fingerprint: string;
  compiledPrompt: string;
  configuredProvider: string;
  activeEngine: "codex" | "antigravity";
  antigravityClient?: AntigravityClient;
  imageConfig?: ProviderAssetImageConfig;
  imageFallbackConfig?: ProviderAssetImageFallbackConfig;
  imgStudioRunId?: string;
  circuitBreaker?: ProviderCircuitBreaker;
  cancellationSignal?: AbortSignal;
  logger: StudioLogger;
  referenceImageBase64?: string;
}

export interface ProviderAssetOutput {
  entry: QuizAssetResolution["assets"][number];
  tier3Fallback: boolean;
}

export type AssetGenerationStrategy = (input: ProviderAssetInput) => Promise<ProviderAssetOutput>;
