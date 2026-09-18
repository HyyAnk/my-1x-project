import type { AntigravityClient } from "../../antigravity.js";
import type { CodexAppServerClient } from "../../codex.js";
import type { TaskManager } from "../../tasks.js";
import type { AppState } from "../state.js";

/**
 * Dependencies required for settings routes registration.
 */
export type SettingsRouteDeps = {
  rootDirectory: string;
  tasks: TaskManager;
  codex: CodexAppServerClient;
  antigravity: AntigravityClient;
  state: AppState;
};
