import type { RepositoryService } from "../../repository/service.js";
import type { TaskManager } from "../../tasks/manager.js";
import type { StudioLogger } from "../../logger.js";
import type { LLMClient } from "../../utils/promptSanitizer.js";
import type { PortraitImageClient } from "../../providers/imageGeneration/imageGeneration.types.js";
import type { executeReelGeneration } from "../../shortReel/generationWorkflow.js";

export type ShortReelsRouteDeps = {
  repository: RepositoryService;
  tasks?: TaskManager;
  logger: StudioLogger;
  llmClient?: LLMClient | null;
  imageClient?: PortraitImageClient | null;
  executor?: typeof executeReelGeneration;
};

export type RouteErrorResponse = {
  status: number;
  body: {
    error: string;
    code: string;
  };
};
