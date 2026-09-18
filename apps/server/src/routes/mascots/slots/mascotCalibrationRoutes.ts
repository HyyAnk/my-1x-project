import type { FastifyInstance } from "fastify";
import {
  CalibrateMascotActionInputSchema,
  MascotActionTypeSchema,
  UpdateMascotSlotInputSchema,
  type MascotActionType,
} from "@studio/shared";
import type { MascotsRouteDeps } from "../mascotTypes.js";

/**
 * Registers mascot slot update and action calibration endpoints.
 */
export function registerMascotCalibrationRoutes(server: FastifyInstance, deps: MascotsRouteDeps): void {
  const { repository } = deps;

  server.patch("/api/mascots/:mascotId/styles/:styleId/slots", async (request) => {
    const { mascotId, styleId } = request.params as { mascotId: string; styleId: string };
    const rawBody = typeof request.body === "object" && request.body !== null ? request.body : {};
    const input = UpdateMascotSlotInputSchema.parse({ style_id: styleId, ...rawBody });
    const mascot = await repository.updateMascotSlot(mascotId, input);
    return { mascot };
  });

  const handleActionCalibration = async (mascotId: string, action: MascotActionType, body: unknown) => {
    const input = CalibrateMascotActionInputSchema.parse(body);
    const updated = await repository.calibrateMascotAction(mascotId, action, input);
    return {
      mascot: updated,
      action: updated.actions[action],
      action_asset: updated.render_bundle?.assets.actions[action] ?? null,
      render_bundle: updated.render_bundle,
    };
  };

  server.patch("/api/mascots/:mascotId/actions/:action/calibrate", async (request) => {
    const { mascotId, action: rawAction } = request.params as { mascotId: string; action: string };
    const action = MascotActionTypeSchema.parse(rawAction);
    return handleActionCalibration(mascotId, action, request.body);
  });

  server.post("/api/mascots/:mascotId/actions/:action/calibrate", async (request) => {
    const { mascotId, action: rawAction } = request.params as { mascotId: string; action: string };
    const action = MascotActionTypeSchema.parse(rawAction);
    return handleActionCalibration(mascotId, action, request.body);
  });
}
