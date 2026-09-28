import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { auditMascotStorage } from "../apps/server/src/quiz/mascot/videoAnimation/storage/storageAudit.js";
import { storageLog } from "./lib/storage-audit-log.js";

const started = Date.now();
try {
  const { values } = parseArgs({ options: { root: { type: "string" }, report: { type: "string" } }, strict: true });
  if (!values.root || !path.isAbsolute(values.root)) throw new Error("Provide --root with the absolute .quiz-studio directory");
  storageLog(
    "INFO",
    "startup",
    `Root=${values.root}; mode=dry-run; concurrency=1; method=filesystem; profiles=discovered during scan; no deletion`,
  );
  const report = await auditMascotStorage(values.root, (count) => {
    if (count % 20 === 0) storageLog("STEP", "scan", `${count} completed attempts inspected`);
  });
  for (const item of report.skipped.slice(0, 5)) storageLog("WARN", "skip", `${item.path}: ${item.reason}`);
  if (report.skipped.length > 5) storageLog("WARN", "skip", `${report.skipped.length - 5} more exclusions; use --report for details`);
  storageLog(
    "INFO",
    "capacity",
    `Potential source cleanup=${report.potentialSourceBytes} bytes; protected legacy matted=${report.protectedMattedBytes} bytes; compact matted=${report.compactMattedBytes} bytes`,
  );
  storageLog(
    "WARN",
    "safety",
    "Potential bytes are not deletion approval: offline/idle checks and artifact validation are required for historical data",
  );
  if (values.report) {
    await writeFile(path.resolve(values.report), JSON.stringify(report, null, 2), { flag: "wx" });
    storageLog("OK", "report", path.resolve(values.report));
  }
  storageLog(
    "OK",
    "summary",
    `Total=${report.attempts.length + report.skipped.length}; success=${report.attempts.length}; skipped=${report.skipped.length}; failed=0; retries=0; deleted=0; elapsedMs=${Date.now() - started}`,
  );
  if (report.attempts.length === 0 && report.skipped.length > 0) process.exitCode = 1;
} catch (error) {
  storageLog(
    "ERROR",
    "summary",
    `Failed=1; deleted=0; elapsedMs=${Date.now() - started}; ${error instanceof Error ? error.message : String(error)}. Check paths and permissions, then retry`,
  );
  process.exitCode = 1;
}
