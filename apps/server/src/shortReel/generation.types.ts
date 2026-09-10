import type { PortraitImageClient } from "../providers/imageGeneration/imageGeneration.types.js";
import type { LLMClient } from "../utils/promptSanitizer.js";

export type ReelGenerationStage = "preflight" | "script" | "style" | "cover" | "publishing" | "finalize";

export type ReelGenerationStageState = "pending" | "running" | "completed" | "failed" | "cancelled" | "skipped";

export interface ReelGenerationProgress {
  stage: ReelGenerationStage;
  state: ReelGenerationStageState;
  message: string;
  recordRevision?: number;
}

export type ReelGenerationMode = "repair" | "regenerate";

export interface ReelGenerationDependencies {
  imageClient: PortraitImageClient;
  llmClient: LLMClient;
  signal: AbortSignal;
  onProgress: (progress: ReelGenerationProgress) => Promise<void>;
}

export interface PlannedReelStage {
  stage: ReelGenerationStage;
  action: "run" | "reuse";
  dependsOn: ReelGenerationStage[];
}
