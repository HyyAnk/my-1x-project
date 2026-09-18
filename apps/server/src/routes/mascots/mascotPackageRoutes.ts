import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { exportMascotPackage, importMascotPackage } from "../../quiz/mascotService.js";
import type { MascotsRouteDeps } from "./mascotTypes.js";

/**
 * Registers mascot package export and import endpoints.
 * Supports both canonical `/api/mascots/...` and `/api/mascots/.../package/...` paths for compatibility.
 */
export function registerMascotPackageRoutes(server: FastifyInstance, deps: MascotsRouteDeps): void {
  const { repository } = deps;

  const handleExport = async (request: FastifyRequest, reply: FastifyReply) => {
    const mascotId = (request.params as { mascotId: string }).mascotId;
    const { zipBuffer, filename } = await exportMascotPackage(repository, mascotId);
    return reply
      .header("content-type", "application/zip")
      .header("content-disposition", `attachment; filename="${filename}"`)
      .header("content-length", zipBuffer.length)
      .send(zipBuffer);
  };

  const handleImport = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { data: string };
    if (!body || !body.data) {
      return reply.code(400).send({ message: "Missing base64 data for import" });
    }
    const base64Data = body.data.replace(/^data:[^;]+;base64,/i, "");
    const zipBuffer = Buffer.from(base64Data, "base64");
    const mascot = await importMascotPackage(repository, zipBuffer);
    return reply.code(201).send({ mascot });
  };

  server.get("/api/mascots/:mascotId/export", handleExport);
  server.get("/api/mascots/:mascotId/package/export", handleExport);

  server.post("/api/mascots/import", handleImport);
  server.post("/api/mascots/package/import", handleImport);
}
