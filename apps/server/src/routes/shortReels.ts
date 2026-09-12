import type { FastifyPluginCallback } from "fastify";
import type { ShortReelsRouteDeps } from "./shortReels/shortReelsTypes.js";
import { registerShortReelsCrudRoutes } from "./shortReels/shortReelsCrudRoutes.js";
import { registerShortReelsActionRoutes } from "./shortReels/shortReelsActionRoutes.js";

export type { ShortReelsRouteDeps, RouteErrorResponse } from "./shortReels/shortReelsTypes.js";
export { knownErrorResponse, handleRouteError } from "./shortReels/shortReelsErrorMapper.js";
export { registerShortReelsCrudRoutes } from "./shortReels/shortReelsCrudRoutes.js";
export { registerShortReelsActionRoutes } from "./shortReels/shortReelsActionRoutes.js";

/**
 * Fastify plugin orchestrating all Short-Reel routes.
 * Registers CRUD endpoints and lifecycle/generation actions across modular sub-route modules.
 */
export function registerShortReelsRoutes(deps: ShortReelsRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    registerShortReelsCrudRoutes(server, deps);
    registerShortReelsActionRoutes(server, deps);
    done();
  };
}
