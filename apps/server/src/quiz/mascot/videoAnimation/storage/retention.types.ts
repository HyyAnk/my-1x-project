export interface FrameInventory {
  directory: string;
  files: { path: string; size: number; modifiedMs: number }[];
  bytes: number;
}

export interface AttemptRetentionPlan {
  attemptDirectory: string;
  source: FrameInventory;
  matted: FrameInventory;
  mattedProtected: boolean;
  imageArtifacts: string[];
  reason: string;
}

export interface CleanupResult {
  files: number;
  bytes: number;
}
