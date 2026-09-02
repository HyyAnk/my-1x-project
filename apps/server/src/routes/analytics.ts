import type { FastifyPluginCallback } from "fastify";
import type { RepositoryService } from "../repository.js";

export type AnalyticsRouteDeps = {
  repository: RepositoryService;
};

export function registerAnalyticsRoutes(deps: AnalyticsRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository } = deps;

    server.get("/api/analytics/usage-ledger", async () => {
      return repository.readUsageLedger();
    });

    server.post("/api/analytics/reconcile", async () => {
      return repository.reconcileUsageLedgerFromDisk();
    });

    done();
  };
}
