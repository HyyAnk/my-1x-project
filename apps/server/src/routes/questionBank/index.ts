import type { FastifyPluginCallback } from "fastify";
import type { RepositoryService } from "../../repository.js";
import type { TaskManager } from "../../tasks.js";
import type { LLMClient } from "../../utils/promptSanitizer.js";
import type { AntigravityClient } from "../../antigravity.js";
import type { CodexAppServerClient } from "../../codex.js";
import type { AppState } from "../state.js";

import { registerQueryRoutes } from "./queryRoutes.js";
import { registerCrudRoutes } from "./crudRoutes.js";
import { registerBatchRoutes } from "./batchRoutes.js";
import { registerBuildRoutes } from "./buildRoutes.js";

export type QuestionBankRouteDeps = {
  repository: RepositoryService;
  tasks?: TaskManager;
  llmClient?: LLMClient;
  codex?: CodexAppServerClient;
  antigravity?: AntigravityClient;
  state?: AppState;
};

/**
 * Registers all Question Bank sub-route modules into a Fastify plugin.
 */
export function registerQuestionBankRoutes(deps: QuestionBankRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    registerQueryRoutes(server, deps);
    registerCrudRoutes(server, deps);
    registerBatchRoutes(server, deps);
    registerBuildRoutes(server, deps);
    done();
  };
}

export * from "./queryRoutes.js";
export * from "./crudRoutes.js";
export * from "./batchRoutes.js";
export * from "./buildRoutes.js";
