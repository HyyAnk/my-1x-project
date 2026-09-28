import path from "node:path";
import { parseArgs } from "node:util";
import { maintainLegacyStorage } from "../apps/server/src/quiz/mascot/videoAnimation/storage/legacyStorageMaintenance.js";
import { acquireStorageMaintenanceLease } from "../apps/server/src/quiz/mascot/videoAnimation/storage/maintenanceLease.js";
import { assertServerOffline } from "../apps/server/src/quiz/mascot/videoAnimation/storage/offlineGuard.js";
import { storageLog } from "./lib/storage-audit-log.js";

const started = Date.now();
let release: (() => void) | undefined;
try {
  const { values } = parseArgs({ strict: true, options: { root: { type: "string" }, apply: { type: "boolean", default: false } } });
  if (!values.root || !path.isAbsolute(values.root) || path.basename(values.root) !== ".quiz-studio")
    throw new Error("Provide absolute .quiz-studio root");
  storageLog(
    "INFO",
    "startup",
    `root=${values.root}; mode=${values.apply ? "apply" : "dry-run"}; concurrency=1; profiles=discovered; method=filesystem; mediaBackup=none`,
  );
  if (values.apply) {
    await assertServerOffline(4310);
    release = acquireStorageMaintenanceLease(path.dirname(values.root));
    await assertServerOffline(4310);
  }
  const result = await maintainLegacyStorage(values.root, values.apply, (message) => storageLog("STEP", "migration", message));
  storageLog("OK", "summary", `failed=0; retries=0; elapsedMs=${Date.now() - started}; ${JSON.stringify(result)}`);
} catch (error) {
  storageLog(
    "ERROR",
    "summary",
    `failed=1; ${error instanceof Error ? error.message : String(error)}; stop writers, inspect the central journal, then retry`,
  );
  process.exitCode = 1;
} finally {
  release?.();
}
