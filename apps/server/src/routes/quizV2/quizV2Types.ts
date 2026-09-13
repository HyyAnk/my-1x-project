import type { RepositoryService } from "../../repository.js";
import type { TaskManager } from "../../tasks.js";
import type { CodexAppServerClient } from "../../codex.js";
import type { AntigravityClient } from "../../antigravity.js";
import type { AppState } from "../state.js";

/**
 * Dependency bundle required for Quiz V2 routes.
 */
export type QuizV2RouteDeps = {
  repository: RepositoryService;
  tasks: TaskManager;
  codex: CodexAppServerClient;
  antigravity: AntigravityClient;
  state: AppState;
};
