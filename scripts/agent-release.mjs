#!/usr/bin/env node
import { parseArgs } from "node:util";
import { releaseActiveClaim } from "./agent-coordination-registry.mjs";
import { createCliLogger } from "./coordination/cli-logger.mjs";

function main() {
  const startedAt = Date.now();
  const { values } = parseArgs({
    options: {
      claim: { type: "string", short: "c" },
      token: { type: "string" },
      by: { type: "string" },
      json: { type: "boolean", default: false },
      help: { type: "boolean" },
    },
    allowPositionals: true,
  });

  if (values.help || !values.claim || !values.token) {
    process.stdout.write(`
Usage: node scripts/agent-release.mjs [options]

Required:
  -c, --claim <id>              Claim ID to release
  --token <lease-token>         Secret token returned when the claim was created

Optional:
  --by <agent-name>             Agent releasing the claim
  --json                        Output release record in JSON format
  --help                        Show this help message
`);
    if (!values.help) process.exitCode = 1;
    return;
  }

  const logger = createCliLogger({ json: values.json });
  logger.info(`Starting release | claim=${values.claim} | concurrency=1 | method=verified SQLite lease`, {
    step: "startup",
  });

  try {
    const claim = releaseActiveClaim({
      claimId: values.claim,
      leaseToken: values.token,
      releasedBy: values.by,
    });

    if (values.json) {
      logger.writeJson(claim);
      return;
    }

    logger.ok(`Claim released | id=${claim.id} | by=${claim.release.releasedBy} | changedFiles=${claim.release.filesChanged.length}`, {
      step: "release",
    });
    logger.summary({ total: 1, success: 1, failed: 0, elapsedMs: Date.now() - startedAt });
  } catch (err) {
    if (values.json) logger.writeJson({ error: err.message });
    else {
      logger.error(err.message, { step: "release", next: "run agent-verify-claim with fresh evidence" });
      logger.summary({ total: 1, success: 0, failed: 1, elapsedMs: Date.now() - startedAt });
    }
    process.exitCode = 1;
  }
}

main();
