/**
 * Mascot Chroma-Key Green Screen Audit & Batch Repair Routes
 *
 * Exposes endpoints for inspecting green-screen compliance and triggering
 * automated regeneration jobs for non-compliant style anchors and pose slots.
 */

import type { FastifyInstance } from "fastify";
import {
  MascotGreenScreenAuditRequestSchema,
  type MascotGreenScreenAuditResponse,
  type MascotGreenScreenAuditStatusResponse,
  type WorkspaceGreenScreenAuditResponse,
} from "@studio/shared";
import { RepositoryError } from "../../repository/errors.js";
import { MascotGreenScreenAuditService } from "../../quiz/mascot/audit/index.js";
import { resolveStyleJobManager } from "./mascotStyleJobRoutes.js";
import { resolveSlotJobManager } from "./slots/mascotSlotJobRoutes.js";
import type { MascotsRouteDeps } from "./mascotTypes.js";

/**
 * Resolves the MascotGreenScreenAuditService from route dependencies or creates a fallback instance.
 */
export function resolveAuditService(deps: MascotsRouteDeps): MascotGreenScreenAuditService {
  if (deps.mascotGreenScreenAuditService) {
    return deps.mascotGreenScreenAuditService;
  }
  const styleJobManager = resolveStyleJobManager(deps);
  const slotJobManager = resolveSlotJobManager(deps);
  const auditService = new MascotGreenScreenAuditService(
    deps.repository,
    styleJobManager,
    slotJobManager,
    deps.logger,
  );
  deps.mascotGreenScreenAuditService = auditService;
  return auditService;
}

/**
 * Registers mascot chroma-key green screen audit routes:
 * - POST /api/mascots/:id/green-screen/audit
 * - POST /api/mascots/green-screen/audit-all
 * - GET  /api/mascots/:id/green-screen/audit-status
 */
export function registerMascotAuditRoutes(server: FastifyInstance, deps: MascotsRouteDeps): void {
  const { repository } = deps;

  /**
   * Runs green-screen audit scan or auto-repair on a single mascot.
   */
  server.post("/api/mascots/:id/green-screen/audit", async (request, reply) => {
    const params = request.params as { id?: string; mascotId?: string };
    const mascotId = params.id ?? params.mascotId ?? "";
    const rawBody = typeof request.body === "object" && request.body !== null ? request.body : {};
    const parsed = MascotGreenScreenAuditRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return reply.code(400).send({
        error: parsed.error.issues[0]?.message || "Invalid mascot audit request",
      });
    }

    const { mode, style_id } = parsed.data;
    const auditService = resolveAuditService(deps);

    try {
      const result: MascotGreenScreenAuditResponse = await auditService.auditMascot(mascotId, {
        mode,
        styleId: style_id,
      });
      return reply.code(200).send(result);
    } catch (err) {
      if (err instanceof RepositoryError && err.code.endsWith("NOT_FOUND")) {
        return reply.code(404).send({ error: err.message, code: err.code });
      }
      throw err;
    }
  });

  /**
   * Runs green-screen audit scan or auto-repair across all mascots in the workspace.
   */
  server.post("/api/mascots/green-screen/audit-all", async (request, reply) => {
    const rawBody = typeof request.body === "object" && request.body !== null ? request.body : {};
    const parsed = MascotGreenScreenAuditRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return reply.code(400).send({
        error: parsed.error.issues[0]?.message || "Invalid audit-all request",
      });
    }

    const { mode } = parsed.data;
    const auditService = resolveAuditService(deps);
    const result: WorkspaceGreenScreenAuditResponse = await auditService.auditAllMascots({ mode });
    return reply.code(200).send(result);
  });

  /**
   * Retrieves active or recent batch repair status for a mascot.
   */
  server.get("/api/mascots/:id/green-screen/audit-status", async (request, reply) => {
    const params = request.params as { id?: string; mascotId?: string };
    const mascotId = params.id ?? params.mascotId ?? "";
    const mascot = await repository.getMascot(mascotId);
    if (!mascot) {
      return reply.code(404).send({
        error: `Mascot "${mascotId}" not found`,
        code: "MASCOT_NOT_FOUND",
      });
    }

    const styleJobManager = resolveStyleJobManager(deps);
    const slotJobManager = resolveSlotJobManager(deps);

    const styleBatchStatus = await styleJobManager.getBatchStatus(mascotId);

    const styles = mascot.styles || [];
    const slotBatches = await Promise.all(
      styles.map(async (s) => ({
        styleId: s.id,
        styleName: s.name,
        batchStatus: await slotJobManager.getBatchStatus(mascotId, s.id),
      })),
    );

    let activeBatchCount = 0;
    if (styleBatchStatus.active_batch) {
      activeBatchCount += 1;
    }
    for (const sb of slotBatches) {
      if (sb.batchStatus.active_batch) {
        activeBatchCount += 1;
      }
    }

    const isRepairing = activeBatchCount > 0;

    const response: MascotGreenScreenAuditStatusResponse = {
      mascotId: mascot.id,
      mascotName: mascot.name,
      isRepairing,
      styleBatch: styleBatchStatus,
      slotBatches,
      activeBatchCount,
    };

    return reply.code(200).send(response);
  });
}
