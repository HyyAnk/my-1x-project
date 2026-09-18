import type { FastifyInstance } from "fastify";
import { MascotMigrationInputSchema } from "@studio/shared";
import { migrateMascotStorage, rollbackMascotStorage } from "../../repository/mascotMigration.js";
import type { MascotsRouteDeps } from "./mascotTypes.js";

/**
 * Registers mascot storage migration and rollback endpoints.
 */
export function registerMascotMigrationRoutes(server: FastifyInstance, deps: MascotsRouteDeps): void {
  const { repository } = deps;

  server.post("/api/mascots/migration", async (request) => {
    const input = MascotMigrationInputSchema.parse(request.body ?? {});
    if (input.mode === "rollback") {
      if (!input.migration_id) {
        throw new Error("migration_id is required for mascot rollback");
      }
      return { report: await rollbackMascotStorage(repository, input.migration_id) };
    }
    return {
      report: await migrateMascotStorage(repository, {
        mode: input.mode,
        migration_id: input.migration_id,
        mascot_id: input.mascot_id,
      }),
    };
  });
}
