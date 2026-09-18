/**
 * Animation Pilot Types (Stage 16)
 *
 * Types for the twelve-frame pilot verification gate.
 */

import type { AnimationState, MascotProfile } from "@studio/shared";
import type { AnimationJobService } from "./animationJobService.js";
import type { AnimationPublishService } from "./animationPublishService.js";
import type { AnimationQaService } from "./animationQaService.js";
import type { AnimationRepository } from "./animationRepositoryTypes.js";
import type { SpriteGenAdapter } from "./spriteGen/spriteGenAdapter.js";

export interface PilotSlotFailureDetail {
  state: AnimationState;
  slotIndex: number;
  recipeId: string;
  failedChecks: string[];
  reasons: string[];
  metrics?: {
    alphaRatio?: number;
    duplicateRatio?: number;
    motionScore?: number;
    seamDifference?: number;
  };
}

export interface PilotReport {
  passed: boolean;
  mascotId: string;
  styleId: string;
  phase: "phase_a" | "phase_b" | "completed" | "failed";
  testedSlotsCount: number;
  passedSlotsCount: number;
  failedSlotsCount: number;
  phaseAResult?: {
    passed: boolean;
    testedSlots: number;
    passedSlots: number;
  };
  phaseBResult?: {
    passed: boolean;
    testedSlots: number;
    passedSlots: number;
  };
  failureDetails: PilotSlotFailureDetail[];
  published?: boolean;
  completedAt: string;
}

export interface AnimationPilotOptions {
  mascot?: MascotProfile;
  repository?: AnimationRepository;
  jobService?: AnimationJobService;
  qaService?: AnimationQaService;
  publishService?: AnimationPublishService;
  adapter?: SpriteGenAdapter;
  storageRoot?: string;
  outputBaseDir?: string;
  fixtureMode?: boolean;
  maxConcurrency?: number;
  twoRowOnly?: boolean;
  autoPublish?: boolean;
}
