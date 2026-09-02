#!/usr/bin/env node
import { parseArgs } from "node:util";
import { cleanupStaleActiveClaims } from "./agent-coordination-registry.mjs";
import { createCliLogger } from "./coordination/cli-logger.mjs";

function main() {
  const startedAt = Date.now();
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      help: { type: "boolean" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    process.stdout.write(`
Usage: node scripts/agent-cleanup-stale.mjs [options]

Options:
  --dry-run         Report expired claims without modifying status
  --json            Output results in JSON format
  --help            Show this help message
`);
    return;
  }

  const logger = createCliLogger({ json: values.json });
  logger.info(`Starting stale-claim cleanup | mode=${values["dry-run"] ? "dry-run" : "update"} | concurrency=1 | method=SQLite`, {
    step: "startup",
  });

  try {
    const result = cleanupStaleActiveClaims({
      dryRun: values["dry-run"],
    });

    if (values.json) {
      logger.writeJson(result);
      return;
    }

    const action = values["dry-run"] ? "Identified" : "Cleaned";
    logger.ok(`${action} ${result.cleanedCount} expired claim(s)`, { step: "cleanup" });
    for (const c of result.claims) {
      logger.info(`${c.id} | agent=${c.agent} | expired=${c.expiresAt}`, { step: "claim" });
    }
    logger.summary({ total: result.claims.length, success: result.cleanedCount, failed: 0, elapsedMs: Date.now() - startedAt });
  } catch (err) {
    if (values.json) logger.writeJson({ error: err.message });
    else {
      logger.error(err.message, { step: "cleanup", next: "inspect agent-status and retry" });
      logger.summary({ total: 1, success: 0, failed: 1, elapsedMs: Date.now() - startedAt });
    }
    process.exitCode = 1;
  }
}

main();
