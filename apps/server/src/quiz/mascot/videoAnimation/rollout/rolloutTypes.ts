import type {
  AnimationState,
  MascotAnimationManifest,
  MascotAnimationRevision,
  MascotProfile,
  MascotSlotProjection,
  MascotSlotState,
  MascotStyle,
} from "@studio/shared";
import type { VideoProcessingRepository } from "../videoProcessingRepository.js";
import type { AnimationStorageAdapter } from "../adapters/animationStorageAdapter.js";
import type { AnimationPackagingService } from "../animationPackagingService.js";

export interface MissingSlotDetail {
  state: AnimationState;
  slotIndex: number;
  status: MascotSlotState;
  errorMessage?: string | null;
}

export interface StyleVideoReadinessResult {
  eligible: boolean;
  readyCount: number;
  totalRequired: number;
  failedCount: number;
  emptyCount: number;
  missingSlots: MissingSlotDetail[];
}

export interface StyleBatchRolloutReport {
  mascotId: string;
  styleId: string;
  totalSlots: number;
  readySlots: number;
  failedSlots: number;
  emptySlots: number;
  processingSlots: number;
  slots: MascotSlotProjection[];
  isPublishEligible: boolean;
  published: boolean;
  publishedAt?: string;
}

export interface AllStylesRolloutReport {
  mascotId: string;
  totalStyles: number;
  completedStyles: number;
  styleReports: Record<string, StyleBatchRolloutReport>;
  allEligible: boolean;
  allPublished: boolean;
}

export interface VideoRolloutServiceDeps {
  videoProcessingRepository: VideoProcessingRepository;
  storageAdapter: AnimationStorageAdapter;
  packagingService: AnimationPackagingService;
}

export interface PublishStyleVideoAnimationsResult {
  updatedStyle: MascotStyle;
  publishedCount: number;
  publishedAt: string;
}

export interface BuildPublishedAssetParams {
  mascotId: string;
  styleId: string;
  state: AnimationState;
  slotIndex: number;
  now: string;
  revision: MascotAnimationRevision;
  manifest: MascotAnimationManifest;
}

export interface VideoRolloutService {
  getStyleReadiness: (mascotId: string, styleId: string) => Promise<StyleVideoReadinessResult>;
  getStyleRolloutReport: (mascotId: string, styleId: string) => Promise<StyleBatchRolloutReport>;
  getAllStylesRolloutReport: (mascot: MascotProfile) => Promise<AllStylesRolloutReport>;
  publishStyleVideoAnimations: (mascot: MascotProfile, styleId: string) => Promise<PublishStyleVideoAnimationsResult>;
}
