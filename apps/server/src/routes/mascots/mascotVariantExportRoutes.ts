import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { VariantExportRequestSchema } from "@studio/shared";
import { listExportFolders, validateExportFolder } from "../../quiz/mascot/variantExport/exportFolders.js";
import { VariantExportService } from "../../quiz/mascot/variantExport/variantExportService.js";
import type { MascotsRouteDeps } from "./mascotTypes.js";
import { createNativeFolderPicker, type NativeFolderPicker } from "../../quiz/mascot/variantExport/nativeFolderPicker.js";

const folderSchema = z.object({ path: z.string().max(1024).optional() }).strict();
const paramsSchema = z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]+$/), jobId: z.string().uuid().optional() });

export function registerMascotVariantExportRoutes(
  server: FastifyInstance,
  deps: Pick<MascotsRouteDeps, "repository" | "logger"> & { pickFolder?: NativeFolderPicker },
): void {
  const pickFolder = deps.pickFolder ?? createNativeFolderPicker();
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
    routes.post("/api/mascots/variant-export/folders/pick", async (request, reply) => {
      const host = request.headers.host?.split(":")[0];
      if (host !== "localhost" && host !== "127.0.0.1")
        return reply
          .code(403)
          .send({ error: "Open Studio on the server computer to use the Windows folder window, or use a server folder path." });
      const parsed = folderSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: "Invalid folder path." });
      const selected = await pickFolder(parsed.data.path || deps.repository.storageRoot);
      return { path: selected ? await validateExportFolder(selected, deps.repository.roots.mascots) : null };
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
