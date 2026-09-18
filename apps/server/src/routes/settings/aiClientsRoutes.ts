import type { FastifyInstance } from "fastify";
import { AntigravitySettingsInputSchema, CodexSettingsInputSchema } from "@studio/shared";
import { saveAntigravitySettings, saveCodexSettings } from "../../config.js";
import { RepositoryError } from "../../repository.js";
import type { SettingsRouteDeps } from "./settingsTypes.js";

/**
 * Registers Codex and Antigravity AI client configuration and diagnostic routes.
 *
 * Endpoints:
 * - GET  /api/codex/info: Checks Codex installation status.
 * - GET  /api/codex/settings: Returns current Codex configuration, models, and installation status.
 * - GET  /api/codex/models: Returns list of available Codex models.
 * - POST /api/codex/settings: Updates Codex configuration (re-establishes connection if previously connected).
 * - GET  /api/antigravity/info: Checks Antigravity CLI installation status.
 * - GET  /api/antigravity/settings: Returns current Antigravity configuration, models, and installation status.
 * - GET  /api/antigravity/models: Returns list of available Antigravity models.
 * - POST /api/antigravity/settings: Updates Antigravity configuration (re-establishes connection if previously connected).
 */
export function registerAiClientsRoutes(server: FastifyInstance, deps: SettingsRouteDeps): void {
  const { rootDirectory, tasks, codex, antigravity, state } = deps;

  server.get("/api/codex/info", async () => codex.detectInstallation());

  server.get("/api/codex/settings", async () => ({
    settings: {
      transport: state.config.codex.transport,
      model: state.config.codex.model,
      api_base_url: state.config.codex.api_base_url,
      has_api_key: Boolean(state.config.codex.api_key),
      app_server_endpoint: state.config.codex.app_server_endpoint,
      command: state.config.codex.command,
    },
    models: await codex.getModels(),
    installation: await codex.detectInstallation(),
  }));

  server.get("/api/codex/models", async () => ({ models: await codex.getModels() }));

  server.post("/api/codex/settings", async (request) => {
    const input = CodexSettingsInputSchema.parse(request.body);
    if (tasks.hasActiveWork()) {
      throw new RepositoryError("Finish active tasks before changing Codex settings", "CODEX_SETTINGS_BUSY");
    }
    const wasConnected = codex.isConnected;
    if (wasConnected) await codex.close();
    state.config = await saveCodexSettings(rootDirectory, input);
    codex.updateConfig(state.config);
    if (wasConnected) await codex.connect().catch(() => undefined);
    return {
      settings: {
        transport: state.config.codex.transport,
        model: state.config.codex.model,
        api_base_url: state.config.codex.api_base_url,
        has_api_key: Boolean(state.config.codex.api_key),
        app_server_endpoint: state.config.codex.app_server_endpoint,
        command: state.config.codex.command,
      },
      models: await codex.getModels(),
      installation: await codex.detectInstallation(),
    };
  });

  server.get("/api/antigravity/info", async () => antigravity.detectInstallation());

  server.get("/api/antigravity/settings", async () => ({
    settings: {
      model: state.config.antigravity.model,
      command: state.config.antigravity.command,
      api_base_url: state.config.antigravity.api_base_url,
      has_api_key: Boolean(state.config.antigravity.api_key),
    },
    models: await antigravity.getModels().catch(() => []),
    installation: await antigravity.detectInstallation(),
  }));

  server.get("/api/antigravity/models", async () => {
    try {
      const models = await antigravity.getModels();
      return { models };
    } catch (error) {
      throw new RepositoryError(error instanceof Error ? error.message : "Failed to load Antigravity models", "ANTIGRAVITY_MODELS_FAILED");
    }
  });

  server.post("/api/antigravity/settings", async (request) => {
    const input = AntigravitySettingsInputSchema.parse(request.body);
    if (tasks.hasActiveWork()) {
      throw new RepositoryError("Finish active tasks before changing Antigravity settings", "ANTIGRAVITY_SETTINGS_BUSY");
    }
    const wasConnected = antigravity.isConnected;
    if (wasConnected) await antigravity.close();
    state.config = await saveAntigravitySettings(rootDirectory, input);
    antigravity.updateConfig(state.config);
    if (wasConnected) await antigravity.connect().catch(() => undefined);
    return {
      settings: {
        model: state.config.antigravity.model,
        command: state.config.antigravity.command,
        api_base_url: state.config.antigravity.api_base_url,
        has_api_key: Boolean(state.config.antigravity.api_key),
      },
      models: await antigravity.getModels().catch(() => []),
      installation: await antigravity.detectInstallation(),
    };
  });
}
