import type { AnimationState, MascotSlotProjection, MascotVideoProcessingJob } from "@studio/shared";
import type { AnimationStorageAdapter } from "../adapters/animationStorageAdapter.js";
import type { FrameExtractionService } from "../frameExtractionService.js";
import type { FrameMattingService } from "../frameMattingService.js";
import type { FrameRegistrationService } from "../frameRegistrationService.js";
import type { AnimationPackagingService } from "../animationPackagingService.js";
import type { VideoUploadService } from "../videoUploadService.js";
import type { VideoProcessingRepository } from "../videoProcessingRepository.js";

export interface VideoProcessingOrchestratorDeps {
  storageAdapter: AnimationStorageAdapter;
  repository: VideoProcessingRepository;
  uploadService: VideoUploadService;
  extractionService: FrameExtractionService;
  mattingService: FrameMattingService;
  registrationService: FrameRegistrationService;
  packagingService: AnimationPackagingService;
  maxConcurrentJobs?: number;
}

export interface ReplaceSlotParams {
  mascotId: string;
  styleId: string;
  state: AnimationState;
  slotIndex: number;
  filename: string;
  buffer: Buffer;
  mimeType: string;
}

export interface QueueStatus {
  runningCount: number;
  queuedCount: number;
}

export interface VideoProcessingOrchestrator {
  scheduleJob: (job: MascotVideoProcessingJob) => Promise<MascotVideoProcessingJob>;
  runJobSync: (jobId: string) => Promise<MascotVideoProcessingJob>;
  cancelJob: (jobId: string, reason?: string) => Promise<MascotVideoProcessingJob>;
  retrySlot: (mascotId: string, styleId: string, state: AnimationState, slotIndex: number) => Promise<MascotVideoProcessingJob>;
  replaceSlot: (params: ReplaceSlotParams) => Promise<{
    job: MascotVideoProcessingJob;
    slotProjection: MascotSlotProjection;
  }>;
  getQueueStatus: () => QueueStatus;
}

export interface ActiveJobContext {
  job: MascotVideoProcessingJob;
  abortController: AbortController;
  promise: Promise<MascotVideoProcessingJob>;
}
