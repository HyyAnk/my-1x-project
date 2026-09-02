#!/usr/bin/env node
import { parseArgs } from "node:util";
import { claimZone } from "./agent-coordination-registry.mjs";
import { createCliLogger } from "./coordination/cli-logger.mjs";
import { createClaimCliResult } from "./coordination/claim-output.mjs";

function splitCsv(val) {
  if (!val) return [];
  return val
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function main() {
  const startedAt = Date.now();
  const { values } = parseArgs({
    options: {
      agent: { type: "string", short: "a" },
      task: { type: "string", short: "t" },
      write: { type: "string", short: "w" },
      "read-stable": { type: "string", short: "r" },
      "planned-files": { type: "string", short: "p" },
      ttl: { type: "string", default: "120" },
      id: { type: "string" },
      json: { type: "boolean", default: false },
      help: { type: "boolean" },
    },
    allowPositionals: true,
  });

  if (values.help || !values.agent || !values.task || !values.write) {
    process.stdout.write(`
Usage: node scripts/agent-claim.mjs [options]

Required:
  -a, --agent <name>            Agent name (e.g., codex, claude, antigravity)
  -t, --task <description>      Short task description
  -w, --write <zones>           Comma-separated list of zones to claim for writing

Optional:
  -r, --read-stable <zones>     Comma-separated list of zones required to stay stable
  -p, --planned-files <paths>   Comma-separated concrete repository-relative paths
  --ttl <minutes>               Time-to-live in minutes (default: 120)
  --id <custom-id>              Custom claim identifier
  --json                        Output claim record in JSON format
  --help                        Show this help message
`);
    if (!values.help) process.exitCode = 1;
    return;
  }

  const logger = createCliLogger({ json: values.json });
  logger.info(
    `Starting claim | mode=main-direct | zones=${splitCsv(values.write).length} | plannedFiles=${splitCsv(values["planned-files"]).length} | concurrency=1 | method=SQLite lease`,
    { step: "startup" },
  );

  try {
    const claim = claimZone({
      agent: values.agent,
      task: values.task,
      writeZones: splitCsv(values.write),
      readStableZones: splitCsv(values["read-stable"]),
      plannedFiles: splitCsv(values["planned-files"]),
      ttlMinutes: Number.parseInt(values.ttl, 10) || 120,
      claimId: values.id,
    });

    if (values.json) {
      logger.writeJson(createClaimCliResult(claim));
      return;
    }

    logger.ok(
      `Claim created | id=${claim.id} | agent=${claim.agent} | expires=${claim.expiresAt} | baselineDirty=${claim.baseline.changedFiles.length}`,
      { step: "claim" },
    );
    logger.info(`Write zones: ${claim.writeZones.join(", ")} | read-stable: ${claim.readStableZones.join(", ") || "none"}`, {
      step: "scope",
    });
    process.stdout.write(`LEASE_TOKEN=${claim.leaseToken}\n`);
    logger.summary({ total: 1, success: 1, failed: 0, elapsedMs: Date.now() - startedAt });
  } catch (err) {
    if (values.json) logger.writeJson({ error: err.message });
    else {
      logger.error(err.message, { step: "claim", next: "run agent-status and retry with non-conflicting zones" });
      logger.summary({ total: 1, success: 0, failed: 1, elapsedMs: Date.now() - startedAt });
    }
    process.exitCode = 1;
  }
}

main();
