import type { FastifyPluginCallback } from "fastify";
import type { SettingsRouteDeps } from "./settingsTypes.js";
import { registerEngineSettingsRoutes } from "./engineSettingsRoutes.js";
import { registerAiClientsRoutes } from "./aiClientsRoutes.js";
import { registerServiceSettingsRoutes } from "./serviceSettingsRoutes.js";

export type { SettingsRouteDeps } from "./settingsTypes.js";
export { registerEngineSettingsRoutes } from "./engineSettingsRoutes.js";
export { registerAiClientsRoutes } from "./aiClientsRoutes.js";
export { registerServiceSettingsRoutes } from "./serviceSettingsRoutes.js";

/**
 * Fastify plugin orchestrating all settings routes across modular sub-modules:
 * - Engine configuration and status
 * - Codex & Antigravity AI client settings
 * - Media, stage, image generation, fallback, and history settings
 */
export function registerSettingsRoutes(deps: SettingsRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    registerEngineSettingsRoutes(server, deps);
    registerAiClientsRoutes(server, deps);
    registerServiceSettingsRoutes(server, deps);
    done();
  };
}
