#!/usr/bin/env node
import { parseArgs } from "node:util";
import { expandActiveClaim } from "./agent-coordination-registry.mjs";
import { createCliLogger } from "./coordination/cli-logger.mjs";

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
      claim: { type: "string", short: "c" },
      token: { type: "string" },
      "add-write": { type: "string", short: "w" },
      "add-read-stable": { type: "string", short: "r" },
      "add-planned-files": { type: "string", short: "p" },
      json: { type: "boolean", default: false },
      help: { type: "boolean" },
    },
    allowPositionals: true,
  });

  if (values.help || !values.claim || !values.token) {
    process.stdout.write(`
Usage: node scripts/agent-expand.mjs [options]

Required:
  -c, --claim <id>                  Claim ID to expand
  --token <lease-token>             Secret token returned when the claim was created

Options:
  -w, --add-write <zones>           Additional zones to claim for writing
  -r, --add-read-stable <zones>     Additional zones required to stay read-stable
  -p, --add-planned-files <paths>   Additional concrete repository-relative paths
  --json                            Output updated claim in JSON format
  --help                            Show this help message
`);
    if (!values.help) process.exitCode = 1;
    return;
  }

  const logger = createCliLogger({ json: values.json });
  logger.info(`Starting claim expansion | claim=${values.claim} | concurrency=1 | method=SQLite lease`, {
    step: "startup",
  });

  try {
    const claim = expandActiveClaim({
      claimId: values.claim,
      leaseToken: values.token,
      addWriteZones: splitCsv(values["add-write"]),
      addReadStableZones: splitCsv(values["add-read-stable"]),
      addPlannedFiles: splitCsv(values["add-planned-files"]),
    });

    if (values.json) {
      logger.writeJson(claim);
      return;
    }

    logger.ok(
      `Claim expanded | id=${claim.id} | write=${claim.writeZones.join(",")} | readStable=${claim.readStableZones.join(",") || "none"} | plannedFiles=${claim.plannedFiles.length}`,
      { step: "expand" },
    );
    logger.summary({ total: 1, success: 1, failed: 0, elapsedMs: Date.now() - startedAt });
  } catch (err) {
    if (values.json) logger.writeJson({ error: err.message });
    else {
      logger.error(err.message, { step: "expand", next: "check zone availability before retrying" });
      logger.summary({ total: 1, success: 0, failed: 1, elapsedMs: Date.now() - startedAt });
    }
    process.exitCode = 1;
  }
}

main();
