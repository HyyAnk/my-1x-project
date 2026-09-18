import type { FastifyInstance } from "fastify";
import type { MascotsRouteDeps } from "./mascotTypes.js";
import {
  parseRangeHeader,
  registerMascotAnimationArtifactRoutes,
  registerMascotAnimationSpriteRoutes,
  registerMascotAnimationVideoRoutes,
  resolveMascotAnimationServices,
} from "./animation/index.js";

export { parseRangeHeader };

/**
 * Slim aggregator registering sprite, video, and artifact mascot animation sub-routers.
 */
export function registerMascotAnimationRoutes(server: FastifyInstance, deps: MascotsRouteDeps): void {
  const services = resolveMascotAnimationServices(deps);
  registerMascotAnimationSpriteRoutes(server, services.sprite);
  registerMascotAnimationVideoRoutes(server, services.video);
  registerMascotAnimationArtifactRoutes(server, services.artifact);
}
