import type { AnimationState, MascotProfile } from "@studio/shared";
import type { AnimationJobService } from "./animationJobService.js";
import type { AnimationPublishService } from "./animationPublishService.js";
import type { AnimationRepository } from "./animationRepositoryTypes.js";
import type { SpriteGenAdapter } from "./spriteGen/spriteGenAdapter.js";

export interface RolloutSlotFailureDetail {
  state: AnimationState;
  slotIndex: number;
  recipeId: string;
  jobId?: string;
  status: "qa_failed" | "error" | "cancelled" | "missing";
  reasons: string[];
  failedChecks?: string[];
  retryable: boolean;
}

export interface StyleRolloutReport {
  styleId: string;
  styleName?: string;
  status: "published" | "pending" | "failed";
  published: boolean;
  publishedAt?: string;
  totalSlots: number;
  readySlots: number;
  failedSlots: number;
  skippedSlots: number;
  newlyExecutedSlots: number;
  batchId?: string;
  failureDetails: RolloutSlotFailureDetail[];
}

export interface RolloutReport {
  mascotId: string;
  totalStyles: number;
  publishedStyles: number;
  pendingStyles: number;
  totalSlots: number;
  readySlots: number;
  failedSlots: number;
  styleReports: Record<string, StyleRolloutReport>;
  completedAt: string;
}

export interface AnimationRolloutOptions {
  mascot?: MascotProfile;
  styleIds?: string[];
  storageRoot?: string;
  repository?: AnimationRepository;
  adapter?: SpriteGenAdapter;
  jobService?: AnimationJobService;
  publishService?: AnimationPublishService;
  outputBaseDir?: string;
  maxConcurrency?: number;
  maxStyleConcurrency?: number;
  fixtureMode?: boolean;
  force?: boolean;
  autoPublish?: boolean;
}
