import type { QuizAssetPlan, QuizAssetResolution } from "@studio/shared";
import type { RepositoryService } from "../../../../repository.js";
import type { StudioLogger } from "../../../../logger.js";
import type { AntigravityClient } from "../../../../antigravity.js";

export interface ProviderAssetImageConfig {
  api_key?: string;
  model?: string;
  provider?: "gpti2" | "shopaikey" | "custom" | "google" | "imgstudio";
  base_url?: string;
  quality?: string;
}

export interface ProviderAssetImageFallbackConfig {
  enabled?: boolean;
  provider?: "imgstudio";
  base_url?: string;
  api_key?: string;
  model?: string;
  resolution?: "1K" | "2K" | "4K";
  quality?: "standard" | "high";
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
  cancellationSignal?: AbortSignal;
  logger: StudioLogger;
  referenceImageBase64?: string;
}

export interface ProviderAssetOutput {
  entry: QuizAssetResolution["assets"][number];
  tier3Fallback: boolean;
}

export type AssetGenerationStrategy = (input: ProviderAssetInput) => Promise<ProviderAssetOutput>;
