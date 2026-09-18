import type { FastifyPluginCallback } from "fastify";
import type { SettingsRouteDeps } from "./settings/index.js";
import { registerEngineSettingsRoutes, registerAiClientsRoutes, registerServiceSettingsRoutes } from "./settings/index.js";

export type { SettingsRouteDeps } from "./settings/index.js";
export { registerEngineSettingsRoutes, registerAiClientsRoutes, registerServiceSettingsRoutes } from "./settings/index.js";

/**
 * Fastify plugin orchestrating all settings routes across modular sub-modules:
 * - Engine settings (switching & active model)
 * - AI clients (Codex & Antigravity settings/diagnostics)
 * - Service settings (media generation, stage, and history)
 */
export function registerSettingsRoutes(deps: SettingsRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    registerEngineSettingsRoutes(server, deps);
    registerAiClientsRoutes(server, deps);
    registerServiceSettingsRoutes(server, deps);
    done();
  };
}
