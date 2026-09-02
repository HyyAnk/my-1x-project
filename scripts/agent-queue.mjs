#!/usr/bin/env node
import { parseArgs } from "node:util";
import { getIntegratorReport } from "./agent-coordination-registry.mjs";
import { createCliLogger } from "./coordination/cli-logger.mjs";

function main() {
  const startedAt = Date.now();
  const { values } = parseArgs({
    options: {
      json: { type: "boolean", default: false },
      help: { type: "boolean" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    process.stdout.write(`
Usage: node scripts/agent-queue.mjs [options]

Options:
  --json                Output integrator queue report in JSON format
  --help                Show this help message
`);
    return;
  }

  const logger = createCliLogger({ json: values.json });
  logger.info("Starting integration queue inspection | concurrency=1 | method=SQLite and Git fingerprint", {
    step: "startup",
  });

  try {
    const report = getIntegratorReport();

    if (values.json) {
      logger.writeJson(report);
      return;
    }

    logger.ok(
      `Queue inspected | active=${report.summary.activeCount} | releasable=${report.summary.releasableCount} | stale=${report.summary.staleCount} | released=${report.summary.releasedCount}`,
      { step: "queue" },
    );
    for (const claim of report.integrationQueue) {
      const releasable = report.releasableClaims.some(({ id }) => id === claim.id);
      logger.info(
        `${claim.id} | agent=${claim.agent} | priority=${claim.queuePriority ?? 100} | state=${releasable ? "releasable" : claim.scopeClean ? "scope-clean" : "in-progress"} | write=${claim.writeZones.join(",")}`,
        { step: "queue-item" },
      );
    }
    for (const claim of report.staleClaims) {
      logger.warn(`${claim.id} | agent=${claim.agent} | reason=${claim.deadReason || "expired"}`, {
        step: "stale",
        next: "run scripts/agent-cleanup-stale.cmd",
      });
    }
    logger.summary({ total: report.summary.totalClaims, success: 1, failed: 0, elapsedMs: Date.now() - startedAt });
  } catch (err) {
    if (values.json) logger.writeJson({ error: err.message });
    else {
      logger.error(err.message, { step: "queue", next: "check the claims database and Git workspace" });
      logger.summary({ total: 1, success: 0, failed: 1, elapsedMs: Date.now() - startedAt });
    }
    process.exitCode = 1;
  }
}

main();
