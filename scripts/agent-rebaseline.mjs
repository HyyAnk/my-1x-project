#!/usr/bin/env node
import { parseArgs } from "node:util";
import { rebaselineClaim } from "./agent-coordination-registry.mjs";
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

  if (values.help || !values.claim || !values.token) {
    process.stdout.write(`
Usage: node scripts/agent-rebaseline.mjs [options]

Refreshes an active claim's git baseline (revision, dirty snapshot, repository
fingerprint) without recreating the claim. Use when concurrent released work
changed the repository after the claim started. Stored verification is cleared
and the claim must be verified again before release.

Required:
  -c, --claim <id>                  Claim ID to re-baseline
  --token <lease-token>             Secret token returned when the claim was created

Options:
  --json                            Output updated claim in JSON format
  --help                            Show this help message
`);
    if (!values.help) process.exitCode = 1;
    return;
  }

  const logger = createCliLogger({ json: values.json });
  logger.info(`Starting claim re-baseline | claim=${values.claim} | concurrency=1 | method=SQLite lease`, {
    step: "startup",
  });

  try {
    const claim = rebaselineClaim({
      claimId: values.claim,
      leaseToken: values.token,
    });

    if (values.json) {
      logger.writeJson(claim);
      return;
    }

    logger.ok(
      `Claim re-baselined | id=${claim.id} | baseRevision=${claim.baseRevision} | baselineDirtyFiles=${claim.baseline.changedFiles.length} | verification cleared`,
      { step: "rebaseline" },
    );
    logger.summary({ total: 1, success: 1, failed: 0, elapsedMs: Date.now() - startedAt });
  } catch (err) {
    if (values.json) logger.writeJson({ error: err.message });
    else {
      logger.error(err.message, { step: "rebaseline", next: "check claim status and lease token before retrying" });
      logger.summary({ total: 1, success: 0, failed: 1, elapsedMs: Date.now() - startedAt });
    }
    process.exitCode = 1;
  }
}

main();
