#!/usr/bin/env node
import { parseArgs } from "node:util";
import { pulseHeartbeat, getStatus } from "./agent-coordination-registry.mjs";
import { createCliLogger } from "./coordination/cli-logger.mjs";

function main() {
  const startedAt = Date.now();
  const { values } = parseArgs({
    options: {
      claim: { type: "string", short: "c" },
      token: { type: "string" },
      json: { type: "boolean", default: false },
      help: { type: "boolean" },
    },
    allowPositionals: true,
  });

  if (values.help || !values.token) {
    process.stdout.write(`
Usage: node scripts/agent-heartbeat.mjs [options]

Options:
  -c, --claim <id>      Claim ID to pulse heartbeat for (required, or auto-detected if only 1 active claim)
  --token <lease-token> Secret token returned when the claim was created
  --json                Output result in JSON format
  --help                Show this help message
`);
    if (!values.help) process.exitCode = 1;
    return;
  }

  const logger = createCliLogger({ json: values.json });
  logger.info(`Starting heartbeat | claim=${values.claim || "auto"} | concurrency=1 | method=SQLite lease`, {
    step: "startup",
  });

  try {
    let targetClaimId = values.claim;
    if (!targetClaimId) {
      const active = getStatus({}).claims;
      if (active.length === 1) {
        targetClaimId = active[0].id;
      } else if (active.length === 0) {
        throw new Error("No active claims found.");
      } else {
        throw new Error(`Multiple active claims exist (${active.map((c) => c.id).join(", ")}). Specify --claim <id>.`);
      }
    }

    const result = pulseHeartbeat({ claimId: targetClaimId, leaseToken: values.token });

    if (values.json) {
      logger.writeJson(result);
      return;
    }

    logger.ok(
      `Heartbeat acknowledged | claim=${result.claimId} | agent=${result.agent} | timeout=${result.heartbeatTimeoutMinutes}m | expires=${result.expiresAt}`,
      { step: "heartbeat" },
    );
    logger.summary({ total: 1, success: 1, failed: 0, elapsedMs: Date.now() - startedAt });
  } catch (err) {
    if (values.json) logger.writeJson({ error: err.message });
    else {
      logger.error(err.message, { step: "heartbeat", next: "check the claim ID and lease token" });
      logger.summary({ total: 1, success: 0, failed: 1, elapsedMs: Date.now() - startedAt });
    }
    process.exitCode = 1;
  }
}

main();
