import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { VariantExportRequestSchema } from "@studio/shared";
import { listExportFolders, validateExportFolder } from "../../quiz/mascot/variantExport/exportFolders.js";
import { VariantExportService } from "../../quiz/mascot/variantExport/variantExportService.js";
import type { MascotsRouteDeps } from "./mascotTypes.js";

const folderSchema = z.object({ path: z.string().max(1024).optional() }).strict();
const paramsSchema = z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]+$/), jobId: z.string().uuid().optional() });

export function registerMascotVariantExportRoutes(server: FastifyInstance, deps: Pick<MascotsRouteDeps, "repository" | "logger">): void {
  const service = new VariantExportService(deps.repository, () => deps.repository.roots.mascots, deps.logger);
  server.addHook("onClose", () => service.close());
  void server.register((routes, _options, done) => {
    // Filesystem browsing/writes must not be callable by a foreign web page.
    routes.addHook("onRequest", async (request, reply) => {
      const origin = request.headers.origin;
      let foreignOrigin: boolean;
      try {
        foreignOrigin = Boolean(origin && new URL(origin).host !== request.headers.host);
      } catch {
        foreignOrigin = true;
      }
      if (foreignOrigin || request.headers["sec-fetch-site"] === "cross-site")
        return reply.code(403).send({ error: "Use the Studio dashboard to manage exports." });
    });
    routes.get("/api/mascots/variant-export/folders", async (request, reply) => {
      const parsed = folderSchema.safeParse(request.query);
      if (!parsed.success) return reply.code(400).send({ error: "Invalid folder path." });
      return listExportFolders(parsed.data.path || deps.repository.storageRoot);
    });
    routes.post("/api/mascots/variant-export/folders/validate", async (request, reply) => {
      const parsed = folderSchema.safeParse(request.body);
      if (!parsed.success || !parsed.data.path) return reply.code(400).send({ error: "Choose a folder first." });
      return { path: await validateExportFolder(parsed.data.path, deps.repository.roots.mascots) };
    });
    routes.get("/api/mascots/:id/variant-exports", async (request) => {
      const { id } = paramsSchema.parse(request.params);
      return { summary: await service.preview(id), job: service.latest(id) };
    });
    routes.post("/api/mascots/:id/variant-exports", async (request, reply) => {
      const parsed = VariantExportRequestSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: "Invalid export request." });
      return reply.code(202).send(await service.start(paramsSchema.parse(request.params).id, parsed.data));
    });
    routes.get("/api/mascots/:id/variant-exports/:jobId", (request, reply) => {
      const { id, jobId } = paramsSchema.parse(request.params);
      return reply.send(service.get(id, jobId!));
    });
    routes.post("/api/mascots/:id/variant-exports/:jobId/cancel", (request, reply) => {
      const { id, jobId } = paramsSchema.parse(request.params);
      return reply.send(service.cancel(id, jobId!));
    });
    done();
  });
}
