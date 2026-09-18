import type { FastifyInstance } from "fastify";
import type { MascotsRouteDeps } from "./mascotTypes.js";
import {
  registerMascotActionGenerationRoutes,
  registerMascotAssetServingRoutes,
  registerMascotCalibrationRoutes,
  registerMascotSlotJobRoutes,
} from "./slots/index.js";

export {
  registerMascotActionGenerationRoutes,
  registerMascotAssetServingRoutes,
  registerMascotCalibrationRoutes,
  registerMascotSlotJobRoutes,
};

/**
 * Registers mascot slot, sprite, calibration, background removal, asset delivery, and job endpoints.
 */
export function registerMascotSlotRoutes(server: FastifyInstance, deps: MascotsRouteDeps): void {
  registerMascotAssetServingRoutes(server, deps);
  registerMascotActionGenerationRoutes(server, deps);
  registerMascotCalibrationRoutes(server, deps);
  registerMascotSlotJobRoutes(server, deps);
}
