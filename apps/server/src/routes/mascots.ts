import type { FastifyPluginCallback } from "fastify";
import type { MascotsRouteDeps } from "./mascots/index.js";
import {
  registerMascotCrudRoutes,
  registerMascotUploadRoutes,
  registerMascotStyleRoutes,
  registerMascotSlotRoutes,
  registerMascotPackageRoutes,
  registerMascotMigrationRoutes,
  registerMascotAnimationRoutes,
} from "./mascots/index.js";

export type { MascotsRouteDeps } from "./mascots/index.js";
export {
  registerMascotCrudRoutes,
  registerMascotUploadRoutes,
  registerMascotStyleRoutes,
  registerMascotSlotRoutes,
  registerMascotSlotJobRoutes,
  registerMascotPackageRoutes,
  registerMascotMigrationRoutes,
  registerMascotAnimationRoutes,
} from "./mascots/index.js";

/**
 * Fastify plugin orchestrating all Mascot routes across modular sub-modules.
 */
export function registerMascotsRoutes(deps: MascotsRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    registerMascotCrudRoutes(server, deps);
    registerMascotUploadRoutes(server, deps);
    registerMascotStyleRoutes(server, deps);
    registerMascotSlotRoutes(server, deps);
    registerMascotPackageRoutes(server, deps);
    registerMascotMigrationRoutes(server, deps);
    registerMascotAnimationRoutes(server, deps);
    done();
  };
}
