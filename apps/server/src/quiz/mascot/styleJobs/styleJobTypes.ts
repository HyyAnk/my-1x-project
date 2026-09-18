/**
 * Mascot Style Concept Generation Job Types and Interfaces
 *
 * Defines contracts for style job persistence, background runner options,
 * runtime batches, and style generator integration.
 */

import type {
  AppConfig,
  CancelStyleGenerationInput,
  MascotProfile,
  MascotStyleBatchJob,
  MascotStyleConceptJob,
  QueueStyleGenerationInput,
  StyleBatchStatusResponse,
} from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import type { StudioLogger } from "../../../logger.js";
import type { MascotStyleJobRepository } from "./mascotStyleJobRepository.js";

export interface MascotStyleBatchStoreData {
  batches: Record<string, MascotStyleBatchJob>;
}

export type StyleConceptGeneratorFn = (
  repository: RepositoryService,
  mascot: MascotProfile,
  styleId: string,
  imageConfig: AppConfig["image_generation"],
  options?: {
    prompt?: string;
    signal?: AbortSignal;
    imageFallbackConfig?: AppConfig["image_fallback"];
  },
  logger?: StudioLogger,
) => Promise<{
  anchor_image_url: string;
  raw_anchor_image_url?: string;
  raw_image_url: string;
  prompt_used: string;
  placeholder: boolean;
}>;

export interface MascotStyleJobManagerOptions {
  repository: RepositoryService;
  jobRepository: MascotStyleJobRepository;
  imageConfig?: AppConfig["image_generation"];
  imageFallbackConfig?: AppConfig["image_fallback"];
  logger?: StudioLogger;
  styleGenerator?: StyleConceptGeneratorFn;
  concurrency?: number;
}

export interface StyleBatchRuntime {
  batch: MascotStyleBatchJob;
  abortController: AbortController;
  waiters: Array<(batch: MascotStyleBatchJob) => void>;
}

export const DEFAULT_STYLE_IMAGE_CONFIG: AppConfig["image_generation"] = {
  enabled: false,
  provider: "shopaikey",
  base_url: "",
  api_key: "",
  model: "gpt-image-2",
  quality: "standard",
  max_concurrent_tasks: 2,
  images_per_bundle: 1,
};

export type { MascotStyleBatchJob, MascotStyleConceptJob, QueueStyleGenerationInput, CancelStyleGenerationInput, StyleBatchStatusResponse };
