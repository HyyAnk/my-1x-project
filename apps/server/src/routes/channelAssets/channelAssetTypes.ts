import type { RepositoryService } from "../../repository.js";
import type { StudioLogger } from "../../logger.js";

export interface ChannelAssetsRouteDeps {
  repository: RepositoryService;
  logger?: StudioLogger;
}
