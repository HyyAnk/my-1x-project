import type { FastifyInstance } from "fastify";
import { EngineSettingsInputSchema } from "@studio/shared";
import { saveEngineSettings } from "../../config.js";
import { RepositoryError } from "../../repository.js";
import type { SettingsRouteDeps } from "./settingsTypes.js";

/**
 * Registers engine configuration and status routes.
 *
 * Endpoints:
 * - GET  /api/engine: Returns active engine, status, and model lists for Codex & Antigravity.
 * - POST /api/engine: Updates active engine and model selection (rejects if tasks are running).
 */
export function registerEngineSettingsRoutes(server: FastifyInstance, deps: SettingsRouteDeps): void {
  const { rootDirectory, tasks, codex, antigravity, state } = deps;

  server.get("/api/engine", async () => {
    const activeEngine = tasks.getActiveEngine();
    return {
      active_engine: activeEngine,
      status: tasks.getStatus(),
      model: activeEngine === "antigravity" ? state.config.antigravity.model : state.config.codex.model,
      codex: {
        status: tasks.getCodexStatus(),
        model: state.config.codex.model,
        models: await codex.getModels().catch(() => []),
      },
      antigravity: {
        status: tasks.getAntigravityStatus(),
        model: state.config.antigravity.model,
        models: await antigravity.getModels().catch(() => []),
      },
    };
  });

  server.post("/api/engine", async (request) => {
    const input = EngineSettingsInputSchema.parse(request.body);
    if (tasks.hasActiveWork()) {
      throw new RepositoryError("Finish active tasks before changing engine", "ENGINE_BUSY");
    }
    state.config = await saveEngineSettings(rootDirectory, input);
    tasks.setActiveEngine(state.config.active_engine);
    codex.updateConfig(state.config);
    antigravity.updateConfig(state.config);
    return {
      active_engine: state.config.active_engine,
      status: tasks.getStatus(),
      model: state.config.active_engine === "antigravity" ? state.config.antigravity.model : state.config.codex.model,
    };
  });
}
