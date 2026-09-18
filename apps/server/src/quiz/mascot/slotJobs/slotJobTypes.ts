/**
 * Mascot Slot Generation Job Types and Interfaces
 *
 * Defines contracts for job persistence, runner options, runtime batches,
 * and slot generator integration.
 */

import type {
  AppConfig,
  CancelSlotGenerationInput,
  MascotProfile,
  MascotSlotBatchJob,
  MascotSlotGenerationJob,
  MascotStateVariant,
  QueueSlotGenerationInput,
  SlotBatchStatusResponse,
} from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import type { StudioLogger } from "../../../logger.js";
import type { MascotSlotJobRepository } from "./mascotSlotJobRepository.js";

export interface MascotSlotBatchStoreData {
  batches: Record<string, MascotSlotBatchJob>;
}

export type SlotGeneratorFn = (
  repository: RepositoryService,
  mascot: MascotProfile,
  styleId: string,
  input: {
    style_id: string;
    state: "thinking" | "celebrate";
    slot_index: number;
    prompt_modifier?: string;
    composition?: "full_body" | "half_body_16_9";
  },
  imageConfig: AppConfig["image_generation"],
  logger?: StudioLogger,
  options?: {
    signal?: AbortSignal;
    composition?: "full_body" | "half_body_16_9";
    imageFallbackConfig?: AppConfig["image_fallback"];
  },
) => Promise<{
  mascot: MascotProfile;
  slot: MascotStateVariant;
  prompt_used: string;
  placeholder: boolean;
}>;

export interface MascotSlotJobManagerOptions {
  repository: RepositoryService;
  jobRepository: MascotSlotJobRepository;
  imageConfig?: AppConfig["image_generation"];
  imageFallbackConfig?: AppConfig["image_fallback"];
  logger?: StudioLogger;
  slotGenerator?: SlotGeneratorFn;
  concurrency?: number;
}

export interface BatchRuntime {
  batch: MascotSlotBatchJob;
  abortController: AbortController;
  waiters: Array<(batch: MascotSlotBatchJob) => void>;
}

export const DEFAULT_IMAGE_CONFIG: AppConfig["image_generation"] = {
  enabled: false,
  provider: "shopaikey",
  base_url: "",
  api_key: "",
  model: "gpt-image-2",
  quality: "standard",
  max_concurrent_tasks: 2,
  images_per_bundle: 1,
};

export type { MascotSlotBatchJob, MascotSlotGenerationJob, QueueSlotGenerationInput, CancelSlotGenerationInput, SlotBatchStatusResponse };
