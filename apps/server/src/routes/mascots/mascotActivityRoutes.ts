import type { FastifyInstance } from "fastify";
import { createMascotStudioActivityService } from "../../quiz/mascot/activity/index.js";
import { resolveMascotAnimationServices } from "./animation/index.js";
import { resolveStyleJobManager } from "./mascotStyleJobRoutes.js";
import { resolveSlotJobManager } from "./slots/mascotSlotJobRoutes.js";
import type { MascotsRouteDeps } from "./mascotTypes.js";

export function registerMascotActivityRoutes(server: FastifyInstance, deps: MascotsRouteDeps): void {
  const animationServices = resolveMascotAnimationServices(deps);
  const activityService = createMascotStudioActivityService({
    repository: deps.repository,
    slotJobManager: resolveSlotJobManager(deps),
    styleJobManager: resolveStyleJobManager(deps),
    videoProcessingRepository: animationServices.video.videoProcessingRepo,
  });

  server.get("/api/mascots/:mascotId/activity", async (request, reply) => {
    const { mascotId } = request.params as { mascotId: string };
    const status = await activityService.getStatus(mascotId);
    return reply.code(200).send(status);
  });
}
