import type { FastifyPluginCallback } from "fastify";
import { registerContextRoutes } from "./introOutroScripts/contextRoutes.js";
import { registerResourceRoutes } from "./introOutroScripts/resourceRoutes.js";
import { registerProjectRoutes } from "./introOutroScripts/projectRoutes.js";
import { registerSeedRoutes } from "./introOutroScripts/seedRoutes.js";
import type { IntroOutroScriptRouteDeps } from "./introOutroScripts/types.js";
import { registerWorkflowRoutes } from "./introOutroScripts/workflowRoutes.js";
import { registerScriptExportRoutes } from "./introOutroScripts/exportRoutes.js";

export function registerIntroOutroScriptRoutes(deps: IntroOutroScriptRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    registerContextRoutes(server, deps);
    registerResourceRoutes(server, deps);
    registerSeedRoutes(server, deps);
    registerProjectRoutes(server, deps);
    registerWorkflowRoutes(server, deps);
    registerScriptExportRoutes(server, deps);
    done();
  };
}
