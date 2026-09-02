#!/usr/bin/env node
import { parseArgs } from "node:util";
import { auditZoneCoverage, findWorkspaceRoot, loadZoneMap } from "./agent-coordination-registry.mjs";
import { createCliLogger } from "./coordination/cli-logger.mjs";

function main() {
  const startedAt = Date.now();
  const { values } = parseArgs({
    options: {
      json: { type: "boolean", default: false },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    process.stdout.write("Usage: node scripts/agent-validate-zones.mjs [--json] [--help]\n");
    return;
  }

  const logger = createCliLogger({ json: values.json });
  logger.info("Starting zone audit | roots=apps,packages,services | concurrency=1 | method=Git file inventory", {
    step: "startup",
  });
  const root = findWorkspaceRoot();
  const result = auditZoneCoverage({ workspaceRoot: root, zoneList: loadZoneMap(root) });
  if (values.json) logger.writeJson(result);
  else printHumanReport(result, logger, startedAt);
  if (!result.valid) process.exitCode = 1;
}

function printHumanReport(result, logger, startedAt) {
  logger[result.valid ? "ok" : "error"](
    `Files: ${result.counts.files} | Zones: ${result.counts.zones} | Definition errors: ${result.counts.definitionErrors} | Unmapped: ${result.counts.unmapped} | Overlaps: ${result.counts.overlapping}`,
    { step: "audit", next: result.valid ? undefined : "resolve every definition, mapping, and overlap error" },
  );
  for (const item of result.definitionErrors) logger.error(item.message, { step: "definition" });
  for (const file of result.unmappedFiles) logger.error(file, { step: "unmapped" });
  for (const item of result.overlappingFiles) logger.error(`${item.file} -> ${item.zones.join(",")}`, { step: "overlap" });
  logger.summary({
    total: result.counts.files,
    success: result.valid ? result.counts.files : result.counts.files - result.counts.unmapped - result.counts.overlapping,
    failed: result.counts.definitionErrors + result.counts.unmapped + result.counts.overlapping,
    elapsedMs: Date.now() - startedAt,
  });
}

try {
  main();
} catch (error) {
  const json = process.argv.includes("--json");
  const logger = createCliLogger({ json });
  if (json) logger.writeJson({ error: error.message });
  else logger.error(error.message, { step: "audit", next: "check zones.yml and Git availability" });
  process.exitCode = 1;
}
