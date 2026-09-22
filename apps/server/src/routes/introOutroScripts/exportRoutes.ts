import type { FastifyInstance } from "fastify";
import { exportScriptPackage } from "../../introOutroScripts/exportPackage.js";
import type { IntroOutroScriptRouteDeps } from "./types.js";

export function registerScriptExportRoutes(server: FastifyInstance, deps: IntroOutroScriptRouteDeps): void {
  server.get("/api/channels/:channelId/intro-outro-scripts/:projectId/revisions/:revisionId/package", async (request, reply) => {
    const { channelId, projectId, revisionId } = request.params as { channelId: string; projectId: string; revisionId: string };
    const revision = await deps.scripts.getRevision(channelId, projectId, revisionId);
    const bytes = await exportScriptPackage(deps.scripts, revision);
    return reply
      .header("Content-Type", "application/zip")
      .header("Cache-Control", "no-store")
      .header("Content-Disposition", `attachment; filename="${revision.clip_kind}-revision-${revision.revision_number}.zip"`)
      .send(bytes);
  });
}
