import type { FastifyInstance } from "fastify";
import { CreateMascotInputSchema, UpdateMascotInputSchema } from "@studio/shared";
import type { MascotsRouteDeps } from "./mascotTypes.js";

/**
 * Registers mascot CRUD endpoints (list, get, create, update, delete).
 */
export function registerMascotCrudRoutes(server: FastifyInstance, deps: MascotsRouteDeps): void {
  const { repository } = deps;

  server.get("/api/mascots", async () => {
    return { mascots: await repository.listMascots() };
  });

  server.get("/api/mascots/:mascotId", async (request) => {
    const mascotId = (request.params as { mascotId: string }).mascotId;
    return { mascot: await repository.getMascot(mascotId) };
  });

  server.post("/api/mascots", async (request, reply) => {
    const input = CreateMascotInputSchema.parse(request.body);
    const mascot = await repository.saveMascot(input);
    return reply.code(201).send({ mascot });
  });

  server.put("/api/mascots/:mascotId", async (request) => {
    const mascotId = (request.params as { mascotId: string }).mascotId;
    const input = UpdateMascotInputSchema.parse(request.body);
    const current = await repository.getMascot(mascotId);
    const updated = await repository.saveMascot({ ...current, ...input, id: mascotId });
    return { mascot: updated };
  });

  server.delete("/api/mascots/:mascotId", async (request) => {
    const mascotId = (request.params as { mascotId: string }).mascotId;
    await repository.deleteMascot(mascotId);
    return { ok: true };
  });
}
