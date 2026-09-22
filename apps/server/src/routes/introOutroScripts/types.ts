import type { StudioLogger } from "../../logger.js";
import type { LLMClient } from "../../utils/promptSanitizer.js";
import type { RepositoryService } from "../../repository.js";
import type { IntroOutroScriptJobManager } from "../../introOutroScripts/jobManager.js";
import type { IntroOutroScriptRepository } from "../../introOutroScripts/repository.js";

export type IntroOutroScriptRouteDeps = {
  repository: RepositoryService;
  scripts: IntroOutroScriptRepository;
  jobs: IntroOutroScriptJobManager;
  model: string;
  logger: StudioLogger;
  client: LLMClient | null;
};
