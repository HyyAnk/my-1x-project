import type { ReelGenerationProgress, ReelGenerationStage } from "../generation.types.js";

/**
 * Emits progress updates for short-reel pipeline generation stages.
 */
export type ProgressEmitter = (
  stage: ReelGenerationStage,
  state: ReelGenerationProgress["state"],
  message: string,
  recordRevision?: number,
) => Promise<void>;
