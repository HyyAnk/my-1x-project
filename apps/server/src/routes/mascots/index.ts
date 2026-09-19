import type { FastifyPluginCallback } from "fastify";
import type { MascotsRouteDeps } from "./mascotTypes.js";
import { registerMascotCrudRoutes } from "./mascotCrudRoutes.js";
import { registerMascotUploadRoutes } from "./mascotUploadRoutes.js";
import { registerMascotStyleRoutes } from "./mascotStyleRoutes.js";
import { registerMascotSlotRoutes } from "./mascotSlotRoutes.js";
import { registerMascotPackageRoutes } from "./mascotPackageRoutes.js";
import { registerMascotMigrationRoutes } from "./mascotMigrationRoutes.js";
import { registerMascotAnimationRoutes } from "./mascotAnimationRoutes.js";

export type { MascotsRouteDeps } from "./mascotTypes.js";
export { registerMascotCrudRoutes } from "./mascotCrudRoutes.js";
export { registerMascotUploadRoutes } from "./mascotUploadRoutes.js";
export { registerMascotStyleRoutes } from "./mascotStyleRoutes.js";
export { registerMascotSlotRoutes, registerMascotSlotJobRoutes } from "./mascotSlotRoutes.js";
export { registerMascotPackageRoutes } from "./mascotPackageRoutes.js";
export { registerMascotMigrationRoutes } from "./mascotMigrationRoutes.js";
export { registerMascotAnimationRoutes } from "./mascotAnimationRoutes.js";

/**
 * Registers all mascot modular route plugins onto the Fastify instance.
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
