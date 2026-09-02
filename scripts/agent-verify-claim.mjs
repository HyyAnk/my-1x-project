#!/usr/bin/env node
import { parseArgs } from "node:util";
import { verifyClaimScope } from "./agent-coordination-registry.mjs";
import { createCliLogger } from "./coordination/cli-logger.mjs";

function main() {
  const startedAt = Date.now();
  const { values } = parseArgs({
    options: {
      claim: { type: "string", short: "c" },
      token: { type: "string" },
      evidence: { type: "string", short: "e" },
      json: { type: "boolean", default: false },
      help: { type: "boolean" },
    },
    allowPositionals: true,
  });

  if (values.help || !values.token || !values.evidence) {
    process.stdout.write(`
Usage: node scripts/agent-verify-claim.mjs [options]

Options:
  -c, --claim <id>      Verify a specific claim (auto-selects active claim if only one exists)
  --token <lease-token> Secret token returned when the claim was created
  -e, --evidence <text> Non-empty summary of checks that passed
  --json                Output verification report in JSON format
  --help                Show this help message
`);
    if (!values.help) process.exitCode = 1;
    return;
  }

  const logger = createCliLogger({ json: values.json });
  logger.info(`Starting scope verification | claim=${values.claim || "auto"} | concurrency=1 | method=Git fingerprint`, {
    step: "startup",
  });

  try {
    const result = verifyClaimScope({
      claimId: values.claim,
      leaseToken: values.token,
      evidenceSummary: values.evidence,
    });

    if (values.json) {
      logger.writeJson(result);
      if (!result.valid) process.exitCode = 1;
      return;
    }

    if (result.valid) {
      logger.ok(
        `Scope verified | claim=${result.claimId} | authorized=${result.authorizedFiles.length} | ignoredBaseline=${result.ignoredBaselineFilesCount}`,
        { step: "verify" },
      );
      logger.summary({ total: 1, success: 1, failed: 0, elapsedMs: Date.now() - startedAt });
    } else {
      for (const v of result.violations) {
        logger.error(`${v.file}: ${v.message}`, { step: "verify", next: v.action });
      }
      logger.summary({ total: result.violations.length, success: 0, failed: result.violations.length, elapsedMs: Date.now() - startedAt });
      process.exitCode = 1;
    }
  } catch (err) {
    if (values.json) logger.writeJson({ error: err.message });
    else {
      logger.error(err.message, { step: "verify", next: "check the claim token and rerun required checks" });
      logger.summary({ total: 1, success: 0, failed: 1, elapsedMs: Date.now() - startedAt });
    }
    process.exitCode = 1;
  }
}

main();
