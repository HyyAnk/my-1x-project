#!/usr/bin/env node
import { parseArgs } from "node:util";
import { getStatus, getIntegratorReport } from "./agent-coordination-registry.mjs";
import { createCliLogger } from "./coordination/cli-logger.mjs";

function main() {
  const startedAt = Date.now();
  const { values } = parseArgs({
    options: {
      claim: { type: "string", short: "c" },
      history: { type: "boolean", short: "h", default: false },
      integrator: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      help: { type: "boolean" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    process.stdout.write(`
Usage: node scripts/agent-status.mjs [options]

Options:
  -c, --claim <id>      View specific claim details
  -h, --history         Include released/expired claims
  --integrator          Show full integrator queue & dead claim report
  --json                Output results in JSON format
  --help                Show this help message
`);
    return;
  }

  const logger = createCliLogger({ json: values.json });
  logger.info(
    `Starting status inspection | mode=${values.integrator ? "integrator" : "claims"} | concurrency=1 | method=SQLite read-only`,
    {
      step: "startup",
    },
  );

  try {
    if (values.integrator) {
      const report = getIntegratorReport();
      if (values.json) {
        logger.writeJson(report);
        return;
      }
      logger.ok(
        `Integrator report | active=${report.summary.activeCount} | releasable=${report.summary.releasableCount} | stale=${report.summary.staleCount} | released=${report.summary.releasedCount}`,
        { step: "status" },
      );
      for (const claim of report.integrationQueue) {
        logger.info(
          `${claim.id} | agent=${claim.agent} | state=${report.releasableClaims.some(({ id }) => id === claim.id) ? "releasable" : claim.scopeClean ? "scope-clean" : "in-progress"} | write=${claim.writeZones.join(",")}`,
          { step: "queue" },
        );
      }
      logger.summary({ total: report.summary.totalClaims, success: 1, failed: 0, elapsedMs: Date.now() - startedAt });
      return;
    }

    const result = getStatus({
      claimId: values.claim,
      includeHistory: values.history,
    });

    if (values.json) {
      logger.writeJson(result);
      return;
    }

    if (values.claim) {
      const c = result.claim;
      logger.info(
        `${c.id} | status=${c.status} | agent=${c.agent} | expires=${c.expiresAt} | write=${c.writeZones.join(",") || "none"} | readStable=${c.readStableZones.join(",") || "none"}`,
        { step: "claim" },
      );
      logger.summary({ total: 1, success: 1, failed: 0, elapsedMs: Date.now() - startedAt });
      return;
    }

    const claims = result.claims || [];
    if (claims.length === 0) {
      logger.ok("No active claims; all zones are available", { step: "status" });
      logger.summary({ total: 0, success: 1, failed: 0, elapsedMs: Date.now() - startedAt });
      return;
    }

    for (const c of claims) {
      logger.info(
        `${c.id} | status=${c.status} | agent=${c.agent} | expires=${c.expiresAt} | write=${c.writeZones.join(",")} | readStable=${c.readStableZones.join(",") || "none"}`,
        { step: "claim" },
      );
    }
    logger.summary({ total: claims.length, success: claims.length, failed: 0, elapsedMs: Date.now() - startedAt });
  } catch (err) {
    if (values.json) logger.writeJson({ error: err.message });
    else {
      logger.error(err.message, { step: "status", next: "check the local claims database" });
      logger.summary({ total: 1, success: 0, failed: 1, elapsedMs: Date.now() - startedAt });
    }
    process.exitCode = 1;
  }
}

main();
